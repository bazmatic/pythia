import {
    CollectionName,
    IDbService,
    IInvestmentProvider,
    INVERSIFY_TOKENS,
    Session,
    SessionStatus
} from "@/types";
import { inject, injectable, LazyServiceIdentifier } from "inversify";
import { SwapResult, UniswapProvider } from "../chain/uniswap.provider";
import { ChainId } from "@uniswap/sdk-core";

enum StrategyType {
    BuyEth = "BuyEth",
    SellEth = "SellEth"
}

const STRATEGIES = [StrategyType.BuyEth, StrategyType.SellEth];
const MIN_TIME = 1000 * 60 * 60 * 1; // 1 hour
const USDC_AMOUNT = 0.5;
const ETH_AMOUNT = 0.0002;

@injectable()
export class UniswapInvestmentProvider implements IInvestmentProvider {
    constructor(
        @inject(new LazyServiceIdentifier(() => INVERSIFY_TOKENS.Database))
        private db: IDbService
    ) {}

    // public async invest(sessionId: string): Promise<number> {
    //     const session = await this.db.getItem<Session>(
    //         CollectionName.Sessions,
    //         sessionId
    //     );
    //     if (!session) {
    //         throw new Error("Session not found");
    //     }
    //     const strategyIdx = session.chosenImageIdx;

    //     if (
    //         strategyIdx === undefined ||
    //         strategyIdx === null ||
    //         strategyIdx < 0 ||
    //         strategyIdx >= STRATEGIES.length
    //     ) {
    //         throw new Error(`Invalid strategy index: ${strategyIdx}`);
    //     }

    //     console.log("Investing in strategy:", STRATEGIES[strategyIdx]);

    //     return strategyIdx;
    // }

    public get uniswapProvider(): UniswapProvider {
        return new UniswapProvider(
            process.env.UNISWAP_PRIVATE_KEY ?? "",
            process.env.ALCHEMY_API_KEY ?? "",
            ChainId.BASE
        );
    }

    public async executeInvestment(sessionId: string): Promise<any> {
       
        const privateKey = process.env.UNISWAP_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("UNISWAP_PRIVATE_KEY is not set");
        }
        const alchemyApiKey = process.env.ALCHEMY_API_KEY;
        if (!alchemyApiKey) {
            throw new Error("ALCHEMY_API_KEY is not set");
        }

        const session = await this.db.getItem<Session>(
            CollectionName.Sessions,
            sessionId
        );
        if (!session) {
            throw new Error("Session not found");
        }
        if (!session.chosenImageIdx) {
            throw new Error("No investment strategy chosen");
        }
        const strategyIdx = session.chosenImageIdx;
        const strategy = STRATEGIES[strategyIdx];

        try {
            let swapResult: SwapResult;
            if (strategy === StrategyType.BuyEth) {
                // Spend 0.5 USDC to buy WETH
                console.log(`Executing BuyEth strategy: buying WETH with ${USDC_AMOUNT} USDC.`);
                swapResult = await this.uniswapProvider.buyWeth(USDC_AMOUNT, 0.5);
            } else if (strategy === StrategyType.SellEth) {
                // Sell 0.0002 WETH for USDC
                console.log(`Executing SellEth strategy: selling ${ETH_AMOUNT} WETH.`);
                swapResult = await this.uniswapProvider.sellWeth(ETH_AMOUNT, 0.5);
            } else {
                throw new Error(`Invalid strategy: ${strategy}`);
            }

            if (!swapResult) {
                // This case should ideally be covered by errors thrown from buyWeth/sellWeth
                throw new Error("Swap operation did not return a result,");
            }

            console.log("Swap successful, execution report:", swapResult);
            return swapResult;

        } catch (error) {
            console.error("Error during swap execution or saving session:", error);
            session.status = SessionStatus.Investing; // Revert to Judged on error
            // Optionally, save error information to session.data if needed
            // session.data.executionError = error instanceof Error ? error.message : String(error);
            await this.db.saveItem<Session>(CollectionName.Sessions, session);
            // Depending on desired behavior, you might want to re-throw the error
            // or handle it to allow the system to continue or alert appropriately.
        }
    }

    public async resolveInvestment(sessionId: string): Promise<number | undefined> {
        const session = await this.db.getItem<Session>(
            CollectionName.Sessions,
            sessionId
        );
        if (!session) {
            throw new Error("Session not found");
        }
        if (
            session.chosenImageIdx === undefined ||
            session.chosenImageIdx === null
        ) {
            throw new Error("No chosen image index in session");
        }

        const executionReport = session.executionReport as SwapResult;
        if (!executionReport) {
            throw new Error("No execution report found");
        }

        const privateKey = process.env.UNISWAP_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("UNISWAP_PRIVATE_KEY is not set");
        }
        const alchemyApiKey = process.env.ALCHEMY_API_KEY;
        if (!alchemyApiKey) {
            throw new Error("ALCHEMY_API_KEY is not set");
        }

        if (!session.chosenImageIdx) {
            throw new Error("No chosen image index in session");
        }

 
        // If the minimum time as not yet passed, return
        if (new Date().getTime() < MIN_TIME) {
            console.log(`Minimum time not yet passed. ${Math.floor((MIN_TIME - new Date().getTime()) / 1000 / 60)} minutes remaining`);
            return;
        }

        const uniswapProvider = new UniswapProvider(privateKey, alchemyApiKey, ChainId.BASE);
        const strategy = STRATEGIES[session.chosenImageIdx];

        // Get current price from the pool
        const currentPrice = await uniswapProvider.getWethPrice();
        const executionPrice = executionReport.pricePerToken;

        let won = false;
        if (strategy === StrategyType.BuyEth) {
            // If we bought ETH, we win if the price went up
            won = currentPrice.gt(executionPrice);
            // Go ahead and sell the ETH. We'll get more USDC for the same amount of ETH.
            if (won) {
                const usdcOutAmount = ETH_AMOUNT * executionPrice;
                uniswapProvider.sellWeth(usdcOutAmount, 0.5).then(() => {
                    console.log("Sold ETH to claim profit");
                }).catch((error) => {
                    console.error("Error selling ETH to claim profit", error);
                });
            }
        } else if (strategy === StrategyType.SellEth) {
            // If we sold ETH, we win if the price went down
            won = currentPrice.lt(executionPrice);
            // Go ahead and buy ETH again. We'll get more ETH for the same amount of USDC.
            if (won) {
                const ethInAmount = USDC_AMOUNT / executionPrice;
                uniswapProvider.buyWeth(ethInAmount, 0.5).then(() => {
                    console.log("Bought ETH to claim profit");
                }).catch((error) => {
                    console.error("Error buying ETH to claim profit", error);
                });
            }
        }

        // Returnthe target image index
        const targetImageIdx = won
            ? session.chosenImageIdx
            : (session.chosenImageIdx + 1) % 2;
        
        return targetImageIdx;

    }

    private async printPortfolioValue(uniswapProvider: UniswapProvider): Promise<void> {
        const value = await uniswapProvider.getPortfolioValueInUsdc();
        console.log(`Portfolio value: $${value.toNumber().toFixed(2)}`);
    }
}
