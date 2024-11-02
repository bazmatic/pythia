import { ethers } from 'ethers';
import { Token, TradeType, CurrencyAmount, Percent, ChainId } from '@uniswap/sdk-core';
import { Pool, Route, SwapQuoter, SwapRouter, Trade, computePoolAddress } from '@uniswap/v3-sdk';
import { FACTORY_ADDRESS } from '@uniswap/v3-sdk';
import IUniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import ISwapRouter from '@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json';

type UniswapConfig = {
  chainId: number;
  routerAddress: string;
  quoterContractAddress: string;
  wethToken: Token;
  usdcToken: Token;
}

const Configs: Record<number, UniswapConfig> = {
  [ChainId.ARBITRUM_ONE]: {
    chainId: ChainId.ARBITRUM_ONE,
    routerAddress: "",
    quoterContractAddress: "",
    wethToken: new Token(
      ChainId.ARBITRUM_ONE,
      "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      18,
      'WETH'
    ),
    usdcToken: new Token(
      ChainId.ARBITRUM_ONE,
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      6,
      'USDC'
    ),
  },
  [ChainId.SEPOLIA ]: {
    chainId: ChainId.SEPOLIA,
    routerAddress: "",
    quoterContractAddress: "",
    wethToken: new Token(
      ChainId.SEPOLIA,
      "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
      18,
      'WETH'
    ),
    usdcToken: new Token(
      ChainId.SEPOLIA,
      "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
      6,
      'USDC'
    ),
  }
}

enum UNISWAP_ROUTER_ADDRESSES {
  Arbitrum = "0x5E325eDA8064b456f4781070C0738d849c824258",
  Sepolia = "0xE592427A0AEce92De3Edee1F18E0157C05861564",
}

enum QUOTER_CONTRACT_ADDRESSES {
  Arbitrum = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  Sepolia = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
}

export interface SwapResult {
  amountIn: string;
  amountOut: string;
  pricePerToken: string;
  transactionHash: string;
}

export class UniswapProvider {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private router: ethers.Contract;
  private chainId: number;
  private uniswapRouterAddress: string;
  private wethToken: Token;
  private usdcToken: Token;
  private quoterContractAddress: string;
  constructor(
    privateKey: string,
    rpcUrl: string,
  ) {
    this.chainId = ChainId.SEPOLIA;
    this.uniswapRouterAddress = Configs[this.chainId].routerAddress;
    this.quoterContractAddress = Configs[this.chainId].quoterContractAddress;
    this.wethToken = Configs[this.chainId].wethToken;
    this.usdcToken = Configs[this.chainId].usdcToken;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.router = new ethers.Contract(
      this.uniswapRouterAddress,
      ISwapRouter.abi,
      this.wallet
    );
  }

  async getWethPrice(): Promise<number> {
    // Get the WETH/USDC pool
    const pool = await this.getUsdcWethPool();
    
    // Create a route through the pool
    const route = new Route([pool], this.wethToken, this.usdcToken);

    // Get quote for 1 ETH
    const { calldata: quoteCalldata } = await SwapQuoter.quoteCallParameters(
      route,
      CurrencyAmount.fromRawAmount(
        this.wethToken,
        ethers.parseUnits("1.0", 18).toString()
      ),
      TradeType.EXACT_INPUT,
      { useQuoterV2: true }
    );

    // Call quoter contract to get expected output
    const quoteCallReturnData = await this.provider.call({
      to: this.quoterContractAddress,
      data: quoteCalldata,
    });

    const [amountOut] = ethers.AbiCoder.defaultAbiCoder().decode(
      ['uint256'],
      quoteCallReturnData
    );

    // Convert the USDC amount (6 decimals) to a human-readable number
    return Number(ethers.formatUnits(amountOut, 6));
  }

  async swap(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    slippageTolerance: number = 0.5
  ): Promise<SwapResult> {
    // Get the pool for the token pair
    const pool = await this.findPool(tokenIn, tokenOut);
    
    // Create a route
    const route = new Route([pool], tokenIn, tokenOut);

    // Create CurrencyAmount for input
    const inputAmount = CurrencyAmount.fromRawAmount(
      tokenIn,
      ethers.parseUnits(amountIn, tokenIn.decimals).toString()
    );

    // Get quote for output amount
    const { calldata: quoteCalldata } = await SwapQuoter.quoteCallParameters(
      route,
      inputAmount,
      TradeType.EXACT_INPUT,
      { useQuoterV2: true }
    );

    // Call quoter contract to get expected output
    const quoteCallReturnData = await this.provider.call({
      to: this.quoterContractAddress,
      data: quoteCalldata,
    });

    const [amountOut] = ethers.AbiCoder.defaultAbiCoder().decode(
      ['uint256'],
      quoteCallReturnData
    );

    // Create unchecked trade
    const uncheckedTrade = Trade.createUncheckedTrade({
      route,
      inputAmount,
      outputAmount: CurrencyAmount.fromRawAmount(tokenOut, amountOut.toString()),
      tradeType: TradeType.EXACT_INPUT,
    });

    // Prepare swap parameters
    const options = {
      slippageTolerance: new Percent(Math.floor(slippageTolerance * 100), 10_000), // Convert 0.5 to 50 bips
      deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minute deadline
      recipient: await this.wallet.getAddress(),
    };

    // Get method parameters for swap
    const methodParameters = SwapRouter.swapCallParameters([uncheckedTrade], options);

    // Execute swap transaction
    const tx = await this.router.execute(
      methodParameters.calldata,
      { value: methodParameters.value }
    );

    const receipt = await tx.wait();

    // Calculate price per token
    const pricePerToken = (Number(amountOut) / 10 ** tokenOut.decimals) / 
                         (Number(amountIn) / 10 ** tokenIn.decimals);

    return {
      amountIn: amountIn,
      amountOut: ethers.formatUnits(amountOut, tokenOut.decimals),
      pricePerToken: pricePerToken.toString(),
      transactionHash: receipt.hash,
    };
  }

  async findPool(
    tokenA: Token,
    tokenB: Token,
    fee: number = 3000 // Default to 0.3% fee tier
  ): Promise<Pool> {
    // Compute pool address using Uniswap SDK
    const poolAddress = computePoolAddress({
      factoryAddress: FACTORY_ADDRESS,
      tokenA,
      tokenB,
      fee,
    });

    // Verify pool exists
    const code = await this.provider.getCode(poolAddress);
    if (code === '0x') {
      throw new Error('Pool does not exist');
    }

    // Get pool contract
    const poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3Pool.abi,
      this.provider
    );

    // Get pool data
    const [liquidity, slot0] = await Promise.all([
      poolContract.liquidity(),
      poolContract.slot0(),
    ]);

    // Create and return Pool instance
    return new Pool(
      tokenA,
      tokenB,
      fee,
      slot0[0].toString(),
      liquidity.toString(),
      slot0[1]
    );
  }

  async getUsdcWethPool(fee: number = 3000): Promise<Pool> {
    return this.findPool(this.wethToken, this.usdcToken, fee);
  }

  async buyWeth(amount: string, slippageTolerance: number = 0.5): Promise<SwapResult> {  
    return this.swap(this.usdcToken, this.wethToken, amount, slippageTolerance);
  }

  async sellWeth(amount: string, slippageTolerance: number = 0.5): Promise<SwapResult> {
    return this.swap(this.wethToken, this.usdcToken, amount, slippageTolerance);
  }
}
