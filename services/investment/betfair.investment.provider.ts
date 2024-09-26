import {
    CollectionName,
    IDbService,
    IInvestmentProvider,
    INVERSIFY_TOKENS,
    Investment,
    Session,
    SessionStatus,
} from "@/types";

//import file system functions
import fs from "fs";

import {
    authenticate,
    listClearedOrders,
    listMarketBook,
    listMarketCatalogue,
    placeOrders,
} from "betfair-api-ts";
import {

    ClearedOrderSummaryReport,
    MarketBook,
    MarketCatalogue,
    PlaceExecutionReport,
    PlaceInstruction,
    Runner,
} from "betfair-api-ts/lib/types/bettingAPI/betting";
import { inject, injectable, LazyServiceIdentifier } from "inversify";

type Wager = {
    raceId: string;
    selections: number[];
    stake: number;
    isBack: boolean;
};

enum StrategyType {
    BackFav = "BackFav",
    LayFav = "LayFav",
}

// Extend Investment to BetfairInvestment so we can type investmentData
type BetfairInvestment = Investment & {
    _result?: any; // For testing
    strategies?: {
        chosen: boolean;
        investmentData: Wager;
        result?: number;
    }[];
};

const STRATEGIES = [StrategyType.BackFav, StrategyType.LayFav];

@injectable()
export class BetfairInvestmentProvider implements IInvestmentProvider {
    private timer: NodeJS.Timeout | null = null;
    constructor(
        @inject(INVERSIFY_TOKENS.Database)
        private db: IDbService,
    ) {
        const certificatePath = process.env.BETFAIR_CERT_PATH;
        const keyPath = process.env.BETFAIR_KEY_PATH;

        if (!certificatePath || !keyPath) {
            throw new Error(
                "BETFAIR_CERT_PATH or BETFAIR_KEY_PATH is not set in environment variables"
            );
        }

        const certificate = fs.readFileSync(certificatePath).toString();
        const certificateKey = fs.readFileSync(keyPath).toString();

        authenticate({
            username: process.env.BETFAIR_USERNAME ?? "",
            password: process.env.BETFAIR_PASSWORD ?? "",
            appKey: process.env.BETFAIR_APP_KEY ?? "",
            certificate,
            certificateKey
        })
            .then(client => {
                this.authenticated = true;
            })
            .catch(error => {
                console.error("Failed to authenticate with Betfair:", error);
            });
    }

    private authenticated: boolean = false;

    private async getNextRace(): Promise<MarketCatalogue> {
        const HORSE_RACING = "7";
        const now = new Date();
        const until = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now

        const marketCatalogues: MarketCatalogue[] = await listMarketCatalogue({
            filter: {
                eventTypeIds: [HORSE_RACING],
                bspOnly: true,
                marketStartTime: {
                    from: now.toISOString(),
                    to: until.toISOString()
                },
                marketTypeCodes: ["WIN"]
            },
            maxResults: 1,
            sort: "FIRST_TO_START",
            marketProjection: [
                "EVENT",
                "MARKET_START_TIME",
                "RUNNER_DESCRIPTION",
                "RUNNER_METADATA"
            ]
        });

        if (marketCatalogues.length === 0) {
            throw new Error("No matching events");
        }
        return marketCatalogues[0];
    }

    private async getOptions(
        marketId: string
    ): Promise<{ lay: Runner[]; back: Runner[]; market: MarketBook }> {
        const marketBooks: MarketBook[] = await listMarketBook({
            marketIds: [marketId],
            priceProjection: {
                priceData: ["EX_BEST_OFFERS", "SP_AVAILABLE", "SP_TRADED"],
                exBestOffersOverrides: {
                    bestPricesDepth: 1,
                    rollupModel: "STAKE",
                    rollupLimit: 0
                },
                virtualise: true
            }
        });

        if (marketBooks.length === 0) {
            throw new Error("No market book data available");
        }

        const marketBook = marketBooks[0];
        if (!marketBook.runners) {
            throw new Error("No runners in market book data");
        }
        const fav = getFavouriteBack(marketBook.runners);
        return {
            market: marketBook,
            lay: [fav],
            back: [fav]
        };
    }

    public async invest(sessionId: string): Promise<void> {
        const session = await this.db.getItem<Session>(CollectionName.Sessions, sessionId);
        if (!session) {
            throw new Error("Session not found");
        }
        const strategyIdx = session.chosenImageIdx;

        if (strategyIdx === undefined || strategyIdx === null || strategyIdx < 0 || strategyIdx >= STRATEGIES.length) {
            throw new Error(`Invalid strategy index: ${strategyIdx}`);
        }

        console.log("Investing in strategy:", STRATEGIES[strategyIdx]);


        session.data.strategyIdx = strategyIdx;
        session.status = SessionStatus.Investing;
        await this.db.saveItem<Session>(CollectionName.Sessions, session);
    }

    public async executeInvestment(sessionId: string): Promise<void> {
        const session = await this.db.getItem<Session>(CollectionName.Sessions, sessionId);
        if (!session) {
            throw new Error("Session not found");
        }
        const strategyIdx = session.data.strategyIdx;
        const market = await this.getNextRace();
        const options = await this.getOptions(market.marketId);
        if (strategyIdx < 0 || strategyIdx >= STRATEGIES.length) {
            throw new Error("Invalid strategy");
        }
        const strategy = STRATEGIES[strategyIdx];
        const isLay = strategy === StrategyType.LayFav;
        const placeExecutionReport: PlaceExecutionReport = await makeBet(options.market, options.back[0], 1, isLay);
        // Check if all bets were placed successfully
        const allBetsPlaced = placeExecutionReport.instructionReports?.every(
            report => report.orderStatus !== 'EXPIRED' && report.status === 'SUCCESS'
        );
        
        if (!allBetsPlaced) {
            console.warn("Failed to place bet");
            return;
        }
        session.status = SessionStatus.Invested;
        session.data.customerRef = placeExecutionReport.customerRef;
        session.data.marketId = market.marketId;
        session.data.executionReport = placeExecutionReport;
        await this.db.saveItem<Session>(CollectionName.Sessions, session);
    }

    public async resolveInvestment(sessionId: string): Promise<void> {
        const session = await this.db.getItem<Session>(CollectionName.Sessions, sessionId);
        if (!session) {
            throw new Error("Session not found");
        }
        const investment = session.data as PlaceExecutionReport;
        if (!investment?.customerRef) {
            throw new Error("No customer reference in investment data");
        }
        if (session.chosenImageIdx === undefined || session.chosenImageIdx === null) {
            throw new Error("No chosen image index in session");
        }

        // List most recent settled orders
        const clearedOrderSummaryReport: ClearedOrderSummaryReport = await
            listClearedOrders({
                betStatus: "SETTLED",
                // Only return the orders settled within 24 hours of now
                settledDateRange: {
                    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    to: new Date().toISOString()
                }
        });

        if (!clearedOrderSummaryReport.clearedOrders) {
            console.log("No cleared orders found");
            return;
        }

        // Find the investment in the cleared orders
        const clearedOrder = clearedOrderSummaryReport.clearedOrders.find(
            order => {
                return order.marketId === investment.marketId;
            }             
        );
        if (!clearedOrder) {
            console.log("No cleared order yet");
            return;
        }

        const won = clearedOrder.betOutcome === "WON";
        console.log(won ? "Won!" : "Lost.");

        // if (won) {           
        //     session.targetImageIdx = session.chosenImageIdx;
        //     console.log("Won. Setting target to chosen", session.chosenImageIdx);
        // } else {      
        //     session.targetImageIdx = (session.chosenImageIdx + 1) % 2; // 0 -> 1, 1 -> 0
        //     console.log("Lost. Setting target to other:", session.targetImageIdx)
        // }

        // If we won, then update the session 'targetImageIdx' to the chosen image index, otherwise set it to the other image index
        session.targetImageIdx = won ? session.chosenImageIdx : (session.chosenImageIdx + 1) % 2;
        session.status = SessionStatus.InvestmentResolved;
        await this.db.saveItem<Session>(CollectionName.Sessions, session);
    }
}

function getFavouriteBack(runners: Runner[]): Runner {
    // Sort by price
    runners.sort((a, b) => {
        return (
            a.ex?.availableToBack?.[0]?.price! -
            b.ex?.availableToBack?.[0]?.price!
        );
    });
    // Return the first runner
    return runners[0];
}

async function makeBet(market: MarketBook, runner: Runner, amountPerRunner: number, lay: boolean): Promise<PlaceExecutionReport> {
    // Create an array of PlaceInstruction objects for each runner
    const instructions: PlaceInstruction = {
        orderType: 'LIMIT',
        selectionId: runner.selectionId,
        side: lay ? 'LAY' : 'BACK',
        limitOrder: {
            size: amountPerRunner,
            price: lay ? runner.ex?.availableToLay?.[0]?.price! : runner.ex?.availableToBack?.[0]?.price!,
            persistenceType: 'LAPSE',
            timeInForce: 'FILL_OR_KILL'
        }
    };

    // Place the orders
    try {
        const placeExecutionReport: PlaceExecutionReport = await placeOrders({
            marketId: market.marketId,
            instructions: [instructions],
            marketVersion: market,
            
            customerRef: `bet_${Date.now()}` // Unique reference for this set of bets
        });

        // Log the result
        console.log('Bets placed:', placeExecutionReport);

        return placeExecutionReport;
    } catch (error) {
        console.error('Error placing bets:', error);
        throw error;
    }
}