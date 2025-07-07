import { BigUnit, BigUnitFactory } from 'bigunit';
import { ethers } from 'ethers';
import { Token } from '@uniswap/sdk-core';
import { ChainId } from '@uniswap/sdk-core';
import { CHAIN_CONFIGS, getToken, getAlchemyRpcUrl } from './config';

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
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

const UsdcFactory = new BigUnitFactory(6, "USDC");

export interface SwapResult {
  amountIn: number;
  amountOut: number;
  pricePerToken: number;
  transactionHash: string;
  timestamp: number;
}

export class UniswapProvider {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private router: ethers.Contract;
  private factory: ethers.Contract;
  private chainId: number;
  private usdcToken: Token;
  private otherToken: Token;

  constructor(
    privateKey: string,
    alchemyApiKey: string,
    chainId: number = ChainId.BASE,
    otherTokenSymbol: string = 'WETH'
  ) {
    this.chainId = chainId;
    const config = CHAIN_CONFIGS[chainId];
    if (!config) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const rpcUrl = getAlchemyRpcUrl(chainId, alchemyApiKey);
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.router = new ethers.Contract(config.routerAddress, UNISWAP_V2_ROUTER_ABI, this.provider);
    this.factory = new ethers.Contract(config.factoryAddress, UNISWAP_V2_FACTORY_ABI, this.provider);
    this.usdcToken = getToken(chainId, 'USDC');
    this.otherToken = getToken(chainId, otherTokenSymbol);
  }

  async getTokenPrice(): Promise<BigUnit> {
    try {
      const pairAddress = await this.factory.getPair(this.otherToken.address, this.usdcToken.address);
      if (pairAddress === ethers.constants.AddressZero) {
        throw new Error(`No ${this.otherToken.symbol}/USDC pair found`);
      }

      const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, this.provider);
      const [reserve0, reserve1] = await pair.getReserves();

      // Determine which reserve is the token and which is USDC
      const tokenReserve = this.otherToken.address.toLowerCase() < this.usdcToken.address.toLowerCase() ? reserve0 : reserve1;
      const usdcReserve = this.otherToken.address.toLowerCase() < this.usdcToken.address.toLowerCase() ? reserve1 : reserve0;

      // Calculate price in USDC per token
      const price = usdcReserve.mul(ethers.constants.WeiPerEther).div(tokenReserve);
      return UsdcFactory.fromBigInt(price);
    } catch (error) {
      console.error(`Failed to get ${this.otherToken.symbol} price:`, error);
      throw new Error(`Failed to get ${this.otherToken.symbol} price: ${error instanceof Error ? error.message : error}`);
    }
  }

  async swap(
    tokenInSymbol: string,
    tokenOutSymbol: string,
    amountIn: number,
    slippageTolerance: number = 0.5
  ): Promise<SwapResult> {
    try {
      const tokenIn = getToken(this.chainId, tokenInSymbol);
      const tokenOut = getToken(this.chainId, tokenOutSymbol);
      
      // Convert amount to wei
      const amountInWei = ethers.utils.parseUnits(amountIn.toString(), tokenIn.decimals);
      
      // Check balance first
      const tokenInContract = new ethers.Contract(tokenIn.address, ERC20_ABI, this.wallet);
      const balance = await tokenInContract.balanceOf(this.wallet.address);
      
      if (balance.lt(amountInWei)) {
        throw new Error(`Insufficient ${tokenInSymbol} balance. Required: ${ethers.utils.formatUnits(amountInWei, tokenIn.decimals)}, Available: ${ethers.utils.formatUnits(balance, tokenIn.decimals)}`);
      }
      
      // Check and approve token spending if necessary
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
      const slippageMultiplier = ethers.BigNumber.from(10000 - Math.floor(slippageTolerance * 100));
      const basisPoints = ethers.BigNumber.from(10000);
      const amountOutMin = amounts[1].mul(slippageMultiplier).div(basisPoints);

      // Calculate deadline (20 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 20 * 60;

      console.log(`Attempting swap: ${amountIn} ${tokenInSymbol} for ${ethers.utils.formatUnits(amounts[1], tokenOut.decimals)} ${tokenOutSymbol}`);
      console.log(`Minimum output: ${ethers.utils.formatUnits(amountOutMin, tokenOut.decimals)} ${tokenOutSymbol}`);

      let tx;
      tx = await this.router.connect(this.wallet).swapExactTokensForTokens(
        amountInWei,
        amountOutMin,
        path,
        this.wallet.address,
        deadline
      );

      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        throw new Error('Transaction failed');
      }
      
      return {
        timestamp: new Date().getTime(),
        amountIn,
        amountOut: Number(ethers.utils.formatUnits(amounts[1], tokenOut.decimals)),
        pricePerToken: Number(ethers.utils.formatUnits(amounts[1].mul(ethers.constants.WeiPerEther).div(amountInWei), tokenOut.decimals)),
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Swap failed:', error);
      if (error instanceof Error) {
        throw new Error(`Swap failed: ${error.message}`);
      }
      throw error;
    }
  }

  async buyToken(usdcAmountToSell: number, slippageTolerance: number = 0.5): Promise<SwapResult> {
    if (!this.otherToken.symbol) {
      throw new Error('Other token symbol is not defined');
    }

    return this.swap('USDC', this.otherToken.symbol, usdcAmountToSell, slippageTolerance);
  }

  async sellToken(tokenAmountToSell: number, slippageTolerance: number = 0.5): Promise<SwapResult> {
    if (!this.otherToken.symbol) {
      throw new Error('Other token symbol is not defined');
    }
    return this.swap(this.otherToken.symbol, 'USDC', tokenAmountToSell, slippageTolerance);
  }

  async getEthBalance(): Promise<BigUnit> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return new BigUnitFactory(18, 'ETH').fromBigInt(balance.toBigInt());
  }

  async getTokenBalance(): Promise<BigUnit> {
    const tokenContract = new ethers.Contract(this.otherToken.address, ERC20_ABI, this.provider);
    const balance = await tokenContract.balanceOf(this.wallet.address);
    return new BigUnitFactory(this.otherToken.decimals, this.otherToken.symbol).fromBigInt(balance.toBigInt());
  }

  async getUsdcBalance(): Promise<BigUnit> {
    const tokenContract = new ethers.Contract(this.usdcToken.address, ERC20_ABI, this.provider);
    const balance = await tokenContract.balanceOf(this.wallet.address);
    return UsdcFactory.fromBigInt(balance.toBigInt());
  }

  async getPortfolioValueInUsdc(): Promise<BigUnit> {
    const tokenPrice = await this.getTokenPrice();
    const tokenBalance = await this.getTokenBalance();
    const usdcBalance = await this.getUsdcBalance();
    const tokenValue = tokenBalance.toNumber() * tokenPrice.toNumber();
    return UsdcFactory.fromNumber(tokenValue + usdcBalance.toNumber());
  }
}

