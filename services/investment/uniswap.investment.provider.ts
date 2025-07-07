import {
    CollectionName,
    IDbService,
    IInvestmentProvider,
    INVERSIFY_TOKENS,
    Session,
    SessionStatus
} from "@/types";
import { ChainId } from "@uniswap/sdk-core";
import { inject, injectable, LazyServiceIdentifier } from "inversify";
import { SwapResult, UniswapProvider } from "../chain/uniswap.provider";

enum StrategyType {
    BuyToken = "BuyToken",
    SellToken = "SellToken"
}

interface InvestmentConfig {
    chainId: number;
    tokenSymbol: string;
    usdcAmount: number;
    tokenAmount: number;
}

const INVESTMENT_CONFIGS: InvestmentConfig[] = [
    {
        chainId: ChainId.BASE,
        tokenSymbol: 'WETH',
        usdcAmount: 0.5,
        tokenAmount: 0.0002
    },
    {
        chainId: ChainId.ARBITRUM_ONE,
        tokenSymbol: 'PENDLE',
        usdcAmount: 0.5,
        tokenAmount: 0.1
    }
];

const MIN_TIME = 1000 * 60 * 60 * .25; // 15 minutes

@injectable()
export class UniswapInvestmentProvider implements IInvestmentProvider {
    private uniswapProvider: UniswapProvider;

    constructor(
        @inject(new LazyServiceIdentifier(() => INVERSIFY_TOKENS.Database))
        private db: IDbService
    ) {
        const config = this.getInvestmentConfig('default');
        this.uniswapProvider = new UniswapProvider(
            process.env.UNISWAP_PRIVATE_KEY ?? "",
            process.env.ALCHEMY_API_KEY ?? "",
            config.chainId,
            config.tokenSymbol
        );
    }

    private async reportBalances() {
        const valueInUsdc = await this.uniswapProvider.getPortfolioValueInUsdc();
        console.log(`Portfolio value: $${valueInUsdc.toNumber().toFixed(2)}`);
    }

    private getInvestmentConfig(sessionId: string): InvestmentConfig {
        // Use sessionId to determine which config to use
        // For now, just use the second config
        return INVESTMENT_CONFIGS[0];
    }

    public async executeInvestment(sessionId: string): Promise<any> {
        await this.reportBalances();
       
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
        if (session.chosenImageIdx === undefined) {
            throw new Error("No investment strategy chosen");
        }

        const config = this.getInvestmentConfig(sessionId);
        const strategyIdx = session.chosenImageIdx;
        const strategy = strategyIdx === 0 ? StrategyType.BuyToken : StrategyType.SellToken;
        session.status = SessionStatus.Investing;
        await this.db.saveItem<Session>(CollectionName.Sessions, session);

        try {
            // Check balances before attempting swap
            const usdcBalance = await this.uniswapProvider.getUsdcBalance();
            const tokenBalance = await this.uniswapProvider.getTokenBalance();
            const ethBalance = await this.uniswapProvider.getEthBalance();
            //if (ethBalance.toNumber() > 0) {
                console.log(`ETH: ${ethBalance.toNumber().toFixed(6)}`);
            //}
            
            console.log(`USDC: ${usdcBalance.toNumber().toFixed(6)}`);
            console.log(`${config.tokenSymbol}: ${tokenBalance.toNumber().toFixed(6)}`);

            let swapResult: SwapResult;
            if (strategy === StrategyType.BuyToken) {
                if (usdcBalance.toNumber() < config.usdcAmount) {
                    throw new Error(`Insufficient USDC balance. Required: ${config.usdcAmount}, Available: ${usdcBalance.toNumber().toFixed(6)}`);
                }
                console.log(`Executing BuyToken strategy: buying ${config.tokenSymbol} with ${config.usdcAmount} USDC.`);
                swapResult = await this.uniswapProvider.buyToken(config.usdcAmount, 0.5);
            } else {
                if (tokenBalance.toNumber() < config.tokenAmount) {
                    throw new Error(`Insufficient ${config.tokenSymbol} balance. Required: ${config.tokenAmount}, Available: ${tokenBalance.toNumber().toFixed(6)}`);
                }
                console.log(`Executing SellToken strategy: selling ${config.tokenAmount} ${config.tokenSymbol}.`);
                swapResult = await this.uniswapProvider.sellToken(config.tokenAmount, 0.5);
            }

            if (!swapResult) {
                throw new Error("Swap operation did not return a result");
            }

            console.log("Swap successful, execution report:", swapResult);
            return swapResult;

        } catch (error) {
            console.error("Error during swap execution:", error);
            // Revert the session status to Judged so that it can be retried
            session.status = SessionStatus.Judged;
            if (error instanceof Error) {
                session.data = { ...session.data, error: error.message };
            }
            await this.db.saveItem<Session>(CollectionName.Sessions, session);
            throw error;
        }
    }

    public async resolveInvestment(sessionId: string): Promise<number | undefined> {
        await this.reportBalances();
        const session = await this.db.getItem<Session>(
            CollectionName.Sessions,
            sessionId
        );
        if (!session) {
            throw new Error("Session not found");
        }
        if (session.chosenImageIdx === undefined) {
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

        const config = this.getInvestmentConfig(sessionId);
        const strategyIdx = session.chosenImageIdx;
        const strategy = strategyIdx === 0 ? StrategyType.BuyToken : StrategyType.SellToken;

        // If the minimum time has not yet passed, return
        const now = new Date().getTime();
        const timeElapsed = now - session.executionReport.timestamp;
        const timeRemaining = MIN_TIME - timeElapsed;
        if (timeRemaining > 0) {
            console.log(`Minimum time not yet passed. ${Math.floor(timeRemaining / 1000 / 60)} minutes remaining`);
            return;
        }

        // Get current price from the pool
        const currentPrice = await this.uniswapProvider.getTokenPrice();
        const executionPrice = executionReport.pricePerToken;

        let won = false;
        //debugger;
        console.log(`Current price: ${currentPrice.toNumber().toFixed(6)}, Execution price: ${executionPrice}`);
        if (strategy === StrategyType.BuyToken) {
            // If we bought token, we win if the price went up
            won = currentPrice.gte(executionPrice);
           
            // Go ahead and sell the token. We'll get more USDC for the same amount of token.
            if (won) {
                console.log(`The price went up, so we won`);
                this.uniswapProvider.sellToken(config.tokenAmount, 0.5).then(() => {
                    console.log(`Sold ${config.tokenSymbol} to claim profit`);
                }).catch((error) => {
                    console.error(`Error selling ${config.tokenSymbol} to claim profit`, error);
                });
            }
        } else {
            // If we sold token, we win if the price went down
            won = currentPrice.lte(executionPrice);
            
            // Go ahead and buy token again. We'll get more token for the same amount of USDC.
            if (won) {
                console.log(`The price went down, so we won`);
                this.uniswapProvider.buyToken(config.usdcAmount, 0.5).then(() => {
                    console.log(`Bought ${config.tokenSymbol} to claim profit`);
                }).catch((error) => {
                    console.error(`Error buying ${config.tokenSymbol} to claim profit`, error);
                });
            }
        }

        // Return the target image index
        const targetImageIdx = won
            ? session.chosenImageIdx
            : (session.chosenImageIdx + 1) % 2;
        
        return targetImageIdx;
    }
}
