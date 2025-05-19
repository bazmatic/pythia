import { BigUnit, BigUnitFactory } from 'bigunit';
import { ethers } from 'ethers';
import { Token } from '@uniswap/sdk-core';
import { ChainId } from '@uniswap/sdk-core';

// Uniswap V2 Router ABI - only the functions we need
const UNISWAP_V2_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// Uniswap V2 Factory ABI - only the functions we need
const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

// Uniswap V2 Pair ABI - only the functions we need
const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
];

// Standard ERC20 ABI for approve and allowance
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

const WethFactory = new BigUnitFactory(18, "WETH");
const UsdcFactory = new BigUnitFactory(6, "USDC");

export interface SwapResult {
  amountIn: number;
  amountOut: number;
  pricePerToken: number;
  transactionHash: string;
}

type UniswapConfig = {
  chainId: number;
  routerAddress: string;
  factoryAddress: string;
  wethToken: Token;
  usdcToken: Token;
}

const Configs: Record<number, UniswapConfig> = {
  [ChainId.BASE]: {
    chainId: ChainId.BASE,
    factoryAddress: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
    routerAddress: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",
    wethToken: new Token(
      ChainId.BASE,
      "0x4200000000000000000000000000000000000006",
      18,
      'WETH'

    ),
    usdcToken: new Token(
      ChainId.BASE,
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      6,
      'USDC'
    ),
  },
  [ChainId.SEPOLIA]: {
    chainId: ChainId.SEPOLIA,
    factoryAddress: "0xF62c03E08ada871A0bEb309762E260a7a6a880E6",
    routerAddress: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
    wethToken: new Token(
      ChainId.SEPOLIA,
      "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
      18,
      'WETH'
    ),
    usdcToken: new Token(
      ChainId.SEPOLIA,
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      6,
      'USDC'
    ),
  }
};

function getAlchemyRpcUrl(chainId: number, apiKey: string): string {
  switch (chainId) {
    case ChainId.BASE:
      return `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
    case ChainId.SEPOLIA:
      return `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

export class UniswapProvider {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private router: ethers.Contract;
  private factory: ethers.Contract;
  private chainId: number;
  private wethToken: Token;
  private usdcToken: Token;

  constructor(
    privateKey: string,
    alchemyApiKey: string,
    chainId: number = ChainId.BASE
  ) {
    this.chainId = chainId;
    const config = Configs[chainId];
    if (!config) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const rpcUrl = getAlchemyRpcUrl(chainId, alchemyApiKey);
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.router = new ethers.Contract(config.routerAddress, UNISWAP_V2_ROUTER_ABI, this.provider);
    this.factory = new ethers.Contract(config.factoryAddress, UNISWAP_V2_FACTORY_ABI, this.provider);
    this.wethToken = config.wethToken;
    this.usdcToken = config.usdcToken;
  }

  async getWethPrice(): Promise<BigUnit> {
    try {
      const pairAddress = await this.factory.getPair(this.wethToken.address, this.usdcToken.address);
      if (pairAddress === ethers.constants.AddressZero) {
        throw new Error('No WETH/USDC pair found');
      }

      const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, this.provider);
      const [reserve0, reserve1] = await pair.getReserves();

      // Determine which reserve is WETH and which is USDC
      const wethReserve = this.wethToken.address.toLowerCase() < this.usdcToken.address.toLowerCase() ? reserve0 : reserve1;
      const usdcReserve = this.wethToken.address.toLowerCase() < this.usdcToken.address.toLowerCase() ? reserve1 : reserve0;

      // Calculate price in USDC per WETH
      const price = usdcReserve.mul(ethers.constants.WeiPerEther).div(wethReserve);
      return UsdcFactory.fromBigInt(price);
    } catch (error) {
      console.error('Failed to get WETH price:', error);
      throw new Error(`Failed to get WETH price: ${error instanceof Error ? error.message : error}`);
    }
  }

  async swap(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: number,
    slippageTolerance: number = 0.5
  ): Promise<SwapResult> {
    try {
      // Convert amount to wei
      const amountInWei = ethers.utils.parseUnits(amountIn.toString(), tokenIn.decimals);
      
      // Check and approve token spending if necessary
      const tokenInContract = new ethers.Contract(tokenIn.address, ERC20_ABI, this.wallet);
      const currentAllowance = await tokenInContract.allowance(this.wallet.address, this.router.address);

      if (currentAllowance.lt(amountInWei)) {
        console.log(`Approving ${tokenIn.symbol} spending for router...`);
        const approveTx = await tokenInContract.approve(this.router.address, amountInWei);
        await approveTx.wait();
        console.log(`${tokenIn.symbol} spending approved.`);
      }

      // Get amounts out
      const path = [tokenIn.address, tokenOut.address];
      const amounts = await this.router.getAmountsOut(amountInWei, path);

      // Calculate amountOutMin based on slippageTolerance
      // e.g., if slippageTolerance is 0.5 (0.5%), multiplier is (100 - 0.5) = 99.5. We use 9950/10000 for precision.
      const slippageMultiplier = ethers.BigNumber.from(10000 - Math.floor(slippageTolerance * 100));
      const basisPoints = ethers.BigNumber.from(10000);
      const amountOutMin = amounts[1].mul(slippageMultiplier).div(basisPoints);

      // Calculate deadline (20 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 20 * 60;

      let tx;

      // For swapping ERC20 (like USDC) to WETH (ERC20) or WETH (ERC20) to USDC (ERC20),
      // swapExactTokensForTokens is the correct function.
      // The path will be [tokenIn.address, tokenOut.address].
      tx = await this.router.connect(this.wallet).swapExactTokensForTokens(
        amountInWei,
        amountOutMin,
        path,
        this.wallet.address,
        deadline
      );

      const receipt = await tx.wait();
      
      return {
        amountIn,
        amountOut: Number(ethers.utils.formatUnits(amounts[1], tokenOut.decimals)),
        pricePerToken: Number(ethers.utils.formatUnits(amounts[1].mul(ethers.constants.WeiPerEther).div(amountInWei), tokenOut.decimals)),
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Swap failed:', error);
      throw new Error(`Swap failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async buyWeth(usdcAmountIn: number, slippageTolerance: number = 0.5): Promise<SwapResult> {
    return this.swap(this.usdcToken, this.wethToken, usdcAmountIn, slippageTolerance);
  }

  async sellWeth(wethAmountIn: number, slippageTolerance: number = 0.5): Promise<SwapResult> {
    return this.swap(this.wethToken, this.usdcToken, wethAmountIn, slippageTolerance);
  }

  async getWethBalance(): Promise<BigUnit> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return WethFactory.fromBigInt(balance.toBigInt());
  }

  async getUsdcBalance(): Promise<BigUnit> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return UsdcFactory.fromBigInt(balance.toBigInt());
  }

  async getPortfolioValueInUsdc(): Promise<BigUnit> {
    const wethPrice = await this.getWethPrice();
    const wethBalance = await this.getWethBalance();
    const usdcBalance = await this.getUsdcBalance();
    return (wethBalance.mul(wethPrice)).add(usdcBalance);
  }
}

