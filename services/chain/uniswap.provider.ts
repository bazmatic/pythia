import { ethers } from 'ethers';
import { Token, TradeType, CurrencyAmount, Percent, ChainId } from '@uniswap/sdk-core';
import { Pool, Route, SwapQuoter, SwapRouter, Trade, computePoolAddress } from '@uniswap/v3-sdk';
import { FACTORY_ADDRESS } from '@uniswap/v3-sdk';
import IUniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import ISwapRouter from '@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json';
// import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'
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
  [ChainId.SEPOLIA]: {
    chainId: ChainId.SEPOLIA,
    routerAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    quoterContractAddress: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    wethToken: new Token(
      ChainId.SEPOLIA,
      "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
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
  },
  [ChainId.MAINNET]: {
    chainId: ChainId.MAINNET,
    factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    quoterContractAddress: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    routerAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethToken: new Token(
      ChainId.MAINNET,
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      18,
      'WETH'
    ),
    usdcToken: new Token(
      ChainId.MAINNET,
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      6,
      'USDC'
    ),
  }
}

export interface SwapResult {
  amountIn: number;
  amountOut: number;
  pricePerToken: number;
  transactionHash: string;
}

export class UniswapProvider {
  private provider: ethers.providers.JsonRpcProvider;
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
    this.chainId = ChainId.MAINNET;
    this.uniswapRouterAddress = Configs[this.chainId].routerAddress;
    const quoterContractAddress = Configs[this.chainId].quoterContractAddress;
    this.wethToken = Configs[this.chainId].wethToken;
    this.usdcToken = Configs[this.chainId].usdcToken;
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    this.router = new ethers.Contract(
      this.uniswapRouterAddress,
      ISwapRouter.abi,
      this.wallet
    );

    console.log(`Quoter contract address: ${quoterContractAddress}`);

    this.quoterContract = new ethers.Contract(
      quoterContractAddress,
      Quoter.abi,
      this.wallet
    );
  }

  async getWethPrice(): Promise<BigUnit> {
    try {
      const params = {
        tokenIn: this.wethToken.address,
        tokenOut: this.usdcToken.address,
        fee: 3000,
        amountIn: WethFactory.fromNumber(0.001).toValueString(),
        sqrtPriceLimitX96: 0
      };

      const quotedAmountOut = await this.quoterContract.callStatic.quoteExactInputSingle(
        params.tokenIn,
        params.tokenOut,
        params.fee,
        params.amountIn,
        params.sqrtPriceLimitX96
      );

      return UsdcFactory.fromBigInt(BigInt(quotedAmountOut.toString()));
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
      const buAmountIn = BigUnit.fromNumber(amountIn, tokenIn.decimals);
      
      // Get pool constants first and handle potential errors
      let poolConstants;
      try {
        poolConstants = await this.getPoolConstants();
      } catch (error) {
        console.error('Failed to get pool constants:', error);
        throw new Error('Pool may not exist or is not accessible');
      }

      // Log more details about the quote attempt
      console.log(`
        Attempting quote with:
        tokenIn: ${tokenIn.address} (${tokenIn.symbol})
        tokenOut: ${tokenOut.address} (${tokenOut.symbol})
        fee: ${poolConstants.fee}
        amountIn: ${buAmountIn.toValueString()}
        decimalsIn: ${tokenIn.decimals}
        decimalsOut: ${tokenOut.decimals}
      `);

      // Get quote using QuoterV3
      const quotedAmountOut = await this.quoterContract.callStatic.quoteExactInputSingle(
        tokenIn.address,
        tokenOut.address,
        poolConstants.fee,
        buAmountIn.toValueString(),
        0
      );
  
      console.log(`Raw quoted amount out: ${quotedAmountOut.toString()}`);

      const buAmountOut = BigUnit.fromValueString(
        quotedAmountOut.toString(),
        tokenOut.decimals
      );
      const buAmountOutMin = buAmountOut.mul(1 - slippageTolerance / 100);

      // Prepare swap parameters
      const swapParams = {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee: poolConstants.fee,
        recipient: this.wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        amountIn: buAmountIn.toBigInt(),
        amountOutMinimum: buAmountOutMin.toBigInt(),
        sqrtPriceLimitX96: 0
      };

      console.log(`Swapping ${amountIn} ${tokenIn.symbol} to ${tokenOut.symbol}`);
      const tx = await this.router.exactInputSingle(swapParams);
      console.log(`Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();

      console.log(`Transaction receipt: ${receipt}`);
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
    // First compute the pool address
    const poolAddress = computePoolAddress({
      factoryAddress: Configs[this.chainId].factoryAddress,
      tokenA: this.usdcToken,
      tokenB: this.wethToken,
      fee: 3000,
    });

    console.log(`Computed pool address: ${poolAddress}`);

    // Verify the pool exists by checking its code
    const code = await this.provider.getCode(poolAddress);
    if (code === '0x') {
      throw new Error(`Pool does not exist at ${poolAddress}`);
    }

    const poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3Pool.abi,
      this.provider
    );

    try {
      const [token0, token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
      ]);

      console.log(`Pool constants:
        token0: ${token0}
        token1: ${token1}
        fee: ${fee}
      `);

      return {
        token0,
        token1,
        fee,
      };
    } catch (error) {
      console.error('Failed to fetch pool constants:', error);
      throw new Error('Failed to fetch pool constants');
    }
  }
  

  async buyWeth(amount: number, slippageTolerance: number = 0.5): Promise<SwapResult> {  
    return this.swap(this.usdcToken, this.wethToken, amount, slippageTolerance);
  }

  async sellWeth(amount: number, slippageTolerance: number = 0.5): Promise<SwapResult> {
    return this.swap(this.wethToken, this.usdcToken, amount, slippageTolerance);
  }
}
