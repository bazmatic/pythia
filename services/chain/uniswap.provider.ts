import { ethers } from 'ethers';
import { Token, TradeType, CurrencyAmount, Percent, ChainId } from '@uniswap/sdk-core';
import { Pool, Route, SwapQuoter, SwapRouter, Trade, computePoolAddress } from '@uniswap/v3-sdk';
import { FACTORY_ADDRESS } from '@uniswap/v3-sdk';
import IUniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import ISwapRouter from '@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json';
// import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json'
import { BigUnit, BigUnitFactory } from 'bigunit';


type UniswapConfig = {
  chainId: number;
  routerAddress: string;
  quoterContractAddress: string;
  wethToken: Token;
  usdcToken: Token;
  factoryAddress: string;
}

const WethFactory = new BigUnitFactory(18, "WETH");
const UsdcFactory = new BigUnitFactory(6, "USDC");

const Configs: Record<number, UniswapConfig> = {
  [ChainId.ARBITRUM_ONE]: {
    chainId: ChainId.ARBITRUM_ONE,
    routerAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    quoterContractAddress: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
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
    factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  },
  [ChainId.SEPOLIA ]: {
    chainId: ChainId.SEPOLIA,
    routerAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    quoterContractAddress: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
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
    factoryAddress: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
  }
}

export interface SwapResult {
  amountIn: number;
  amountOut: number;
  pricePerToken: number;
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
  //private quoterContractAddress: string;
  private quoterContract: ethers.Contract;
  constructor(
    privateKey: string,
    rpcUrl: string,
  ) {
    this.chainId = ChainId.SEPOLIA;
    this.uniswapRouterAddress = Configs[this.chainId].routerAddress;
    const quoterContractAddress = Configs[this.chainId].quoterContractAddress;
    this.wethToken = Configs[this.chainId].wethToken;
    this.usdcToken = Configs[this.chainId].usdcToken;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    this.router = new ethers.Contract(
      this.uniswapRouterAddress,
      ISwapRouter.abi,
      this.wallet
    );

    this.quoterContract = new ethers.Contract(
      quoterContractAddress,
      Quoter.abi,
      this.wallet
    );
  }

  async getWethPrice(): Promise<BigUnit> {
    try {
      // const poolAddress = computePoolAddress({
      //   factoryAddress: Configs[this.chainId].factoryAddress,
      //   tokenA: this.wethToken,
      //   tokenB: this.usdcToken,
      //   fee: 3000 // 0.3% fee tier
      // });

      // const poolContract = new ethers.Contract(
      //   poolAddress,
      //   IUniswapV3Pool.abi,
      //   this.provider
      // );

      // Get a quote for 0.01 WETH
      const quotedAmountOut = await this.quoterContract.quoteExactInputSingle(
        this.wethToken.address,
        this.usdcToken.address,
        3000,
        ethers.parseUnits("0.001", 18),
        0
      );

      return UsdcFactory.fromBigInt(BigInt(quotedAmountOut));


    } catch (error) {
      console.error('Failed to get WETH price:', error);
      throw new Error(`Failed to get WETH price: ${error instanceof Error ? error.message : error}`);
    }
  }

  async swap(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    slippageTolerance: number = 0.5
  ): Promise<SwapResult> {
    try {
      // Get pool instance
      // const poolAddress = computePoolAddress({
      //   factoryAddress: Configs[this.chainId].factoryAddress,
      //   tokenA: tokenIn,
      //   tokenB: tokenOut,
      //   fee: 3000
      // });

      // const poolContract = new ethers.Contract(
      //   poolAddress,
      //   IUniswapV3Pool.abi,
      //   this.provider
      // );

      // Convert amount to proper decimals
      const buAmountIn = BigUnit.fromDecimalString(amountIn, tokenIn.decimals);

      const poolConstants = await this.getPoolConstants();

      // Prepare transaction parameters with slippage tolerance
      const params = {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee: poolConstants.fee,
        amountIn: buAmountIn.toBigInt(),
        //amountOutMinimum: buAmountOut.mul(1 - slippageTolerance / 100).toBigInt(), // Apply slippage tolerance
        sqrtPriceLimitX96: 0 // No price limit
      };

      // Get quote using the quoter contract
      const quotedAmountOut = await this.quoterContract.quoteExactInputSingle.staticCall(params);
      //   tokenIn.address,
      //   tokenOut.address,
      //   poolConstants.fee.toString(),
      //   buAmountIn.toValueString(),
      //   0
      // );

      // The result is already decoded when using callStatic
      const buAmountOut = BigUnit.fromValueString(quotedAmountOut.toString(), tokenOut.decimals);



      // Execute the swap
      const tx = await this.router.exactInputSingle(params);
      const receipt = await tx.wait();

      // Calculate price per token
      const pricePerToken = buAmountIn.div(buAmountOut).asPrecision(buAmountIn.precision);

      return {
        amountIn: buAmountIn.toNumber(),
        amountOut: buAmountOut.toNumber(),
        pricePerToken: pricePerToken.toNumber(),
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Swap failed:', error);
      throw new Error(`Swap failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async getPoolConstants(): Promise<{
    token0: string
    token1: string
    fee: number
  }> {
    const currentPoolAddress = computePoolAddress({
      factoryAddress: Configs[this.chainId].factoryAddress,
      tokenA: this.usdcToken,
      tokenB: this.wethToken,
      fee: 3000,
    })
  
    const poolContract = new ethers.Contract(
      currentPoolAddress,
      IUniswapV3Pool.abi,
      this.provider
    )
    const [token0, token1, fee] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
    ])

    return {
      token0,
      token1,
      fee,
    }
  }
  

  async buyWeth(amount: string, slippageTolerance: number = 0.5): Promise<SwapResult> {  
    return this.swap(this.usdcToken, this.wethToken, amount, slippageTolerance);
  }

  async sellWeth(amount: string, slippageTolerance: number = 0.5): Promise<SwapResult> {
    return this.swap(this.wethToken, this.usdcToken, amount, slippageTolerance);
  }
}
