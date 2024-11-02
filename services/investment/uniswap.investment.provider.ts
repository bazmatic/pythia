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
import { ChainId, Token } from "@uniswap/sdk-core";

enum StrategyType {
    BuyEth = "BuyEth",
    SellEth = "SellEth"
}

// export const USDC_TOKEN_ARBITRUM = new Token(
//   ChainId.ARBITRUM_ONE,
//   '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
//   6,
//   'USDC',
//   'USD Coin'
// )

// export const WETH_TOKEN_ARBITRUM = new Token(
//   ChainId.ARBITRUM_ONE,
//   '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
//   18,
//   'WETH',
//   'Wrapped Ether'
// )

const STRATEGIES = [StrategyType.BuyEth, StrategyType.SellEth];

@injectable()
export class UniswapInvestmentProvider implements IInvestmentProvider {
    constructor(
        @inject(new LazyServiceIdentifier(() => INVERSIFY_TOKENS.Database))
        private db: IDbService
    ) {}

    public async invest(sessionId: string): Promise<void> {
        const session = await this.db.getItem<Session>(
            CollectionName.Sessions,
            sessionId
        );
        if (!session) {
            throw new Error("Session not found");
        }
        const strategyIdx = session.chosenImageIdx;

        if (
            strategyIdx === undefined ||
            strategyIdx === null ||
            strategyIdx < 0 ||
            strategyIdx >= STRATEGIES.length
        ) {
            throw new Error(`Invalid strategy index: ${strategyIdx}`);
        }

        console.log("Investing in strategy:", STRATEGIES[strategyIdx]);

        session.data.strategyIdx = strategyIdx;
        session.status = SessionStatus.Investing;
        await this.db.saveItem<Session>(CollectionName.Sessions, session);
    }

    public async executeInvestment(sessionId: string): Promise<void> {
        const session = await this.db.getItem<Session>(
            CollectionName.Sessions,
            sessionId
        );
        if (!session) {
            throw new Error("Session not found");
        }
        const privateKey = process.env.UNISWAP_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("UNISWAP_PRIVATE_KEY is not set");
        }
        const rpcUrl = process.env.UNISWAP_RPC_URL;
        if (!rpcUrl) {
            throw new Error("RPC_URL is not set");
        }
        const uniswapProvider = new UniswapProvider(privateKey, rpcUrl); //, UNISWAP_ROUTER_ADDRESSES.Arbitrum, ChainId);
        const strategyIdx = session.data.strategyIdx;
        const strategy = STRATEGIES[strategyIdx];
        const pool = await uniswapProvider.getUsdcWethPool();

        let swapResult: SwapResult;
        if (strategy === StrategyType.BuyEth) {
            swapResult = await uniswapProvider.buyWeth("0.0005", 0.5);
            console.log(pool);
        } else if (strategy === StrategyType.SellEth) {
            swapResult = await uniswapProvider.sellWeth("0.0005", 0.5);
        } else {
            throw new Error(`Invalid strategy: ${strategy}`);
        }
        if (!swapResult) {
            console.warn("Failed to place bet");
            return;
        }
        session.status = SessionStatus.Invested;
        session.data.executionReport = swapResult;
        await this.db.saveItem<Session>(CollectionName.Sessions, session);
    }

    public async resolveInvestment(sessionId: string): Promise<void> {
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

        const executionReport = session.data.executionReport as SwapResult;
        if (!executionReport) {
            throw new Error("No execution report found");
        }

        const privateKey = process.env.UNISWAP_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("UNISWAP_PRIVATE_KEY is not set");
        }
        const rpcUrl = process.env.RPC_URL;
        if (!rpcUrl) {
            throw new Error("RPC_URL is not set");
        }

        const uniswapProvider = new UniswapProvider(privateKey, rpcUrl);
        const strategy = STRATEGIES[session.data.strategyIdx];

        // Get current price from the pool
        const currentPrice = await uniswapProvider.getWethPrice();
        const executionPrice = parseFloat(executionReport.pricePerToken);

        let won = false;
        if (strategy === StrategyType.BuyEth) {
            // If we bought ETH, we win if the price went up
            won = currentPrice > executionPrice;
        } else if (strategy === StrategyType.SellEth) {
            // If we sold ETH, we win if the price went down
            won = currentPrice < executionPrice;
        }

        // Update session with results
        session.targetImageIdx = won
            ? session.chosenImageIdx
            : (session.chosenImageIdx + 1) % 2;
        session.status = SessionStatus.InvestmentResolved;
        await this.db.saveItem<Session>(CollectionName.Sessions, session);
    }
}
