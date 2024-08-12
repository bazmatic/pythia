import {
    IInvestmentProvider,
    Investment,
    InvestmentStatus,
    StrategyReport
} from "@/types";

//import file system functions
import fs from "fs";

import { CollectionName, DBService } from "../db.service";
import { authenticate, listEventTypes, listMarketBook, listMarketCatalogue, listRunnerBook } from "betfair-api-ts";
import { EventResult, ListEventTypesParams, MarketBettingType, MarketBook, MarketCatalogue, MarketFilter, Runner, RunnerCatalog } from "betfair-api-ts/lib/types/bettingAPI/betting";
import { BetfairHistoricService } from "./betfair.historic.service";

type Wager = {
    raceId: string;
    selections: number[];
    stake: number;
    isBack: boolean;
};

enum StrategyType {
    BackPositiveSet = "BackPositiveSet",
    LayPositiveSet = "LayPositiveSet"
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

const STRATEGIES = [StrategyType.BackPositiveSet, StrategyType.LayPositiveSet];

export class BetfairInvestmentProvider implements IInvestmentProvider {
    constructor(private db: DBService, callback: (error: any, authenticated: boolean) => void) {
        callback(null, true);
    //     const certificatePath = process.env.BETFAIR_CERT_PATH;
    //     const keyPath = process.env.BETFAIR_KEY_PATH;

    //     if (!certificatePath || !keyPath) {
    //         throw new Error("BETFAIR_CERT_PATH or BETFAIR_KEY_PATH is not set in environment variables");
    //     }

    //     const certificate = fs.readFileSync(certificatePath).toString();
    //     const certificateKey = fs.readFileSync(keyPath).toString();

    //     authenticate({
    //         username: process.env.BETFAIR_USERNAME ?? "",
    //         password: process.env.BETFAIR_PASSWORD ?? "",
    //         appKey: process.env.BETFAIR_APP_KEY ?? "",
    //         certificate,
    //         certificateKey,
    //     }).then(client => {
    //         this.authenticated = true;
    //         callback(null, true)
    //     }).catch(error => {
    //         console.error("Failed to authenticate with Betfair:", error);
    //         callback(error, false)
    //     });
    }

    private authenticated: boolean = false;

    // private async getNextRace(): Promise<MarketCatalogue> {
  
    //     const HORSE_RACING = "7";
    //     const now = new Date();
    //     const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    //     const marketCatalogues: MarketCatalogue[] = await listMarketCatalogue({
    //         filter: {
    //             eventTypeIds: [HORSE_RACING], // Horse Racing
    //             marketStartTime: {
    //                 from: now.toISOString(),
    //                 to: tomorrow.toISOString()
    //             },
    //             marketTypeCodes: ['WIN'] // Assuming you're interested in win markets
    //         },
    //         maxResults: 1000,
    //         sort: 'FIRST_TO_START',
    //         marketProjection: ['EVENT', 'MARKET_START_TIME', 'RUNNER_DESCRIPTION', 'RUNNER_METADATA']
    //     });
    //     if (marketCatalogues.length === 0) {
    //         throw new Error("No matching events");
    //     }
    //     return marketCatalogues[0];       
    // }

    public async getNextRace(): Promise<any> {
        // Get a random record from
        const historicService = new BetfairHistoricService();
        return historicService.getNextRace();
    }

    public async invest(
        sessionId: string,
        strategyIdx: number
    ): Promise<Investment> {
        const investmentId = sessionId;
        if (strategyIdx < 0 || strategyIdx >= STRATEGIES.length) {
            throw new Error("Invalid strategy");
        }
        console.log("Investing in strategy:", STRATEGIES[strategyIdx]);

        const race: any = await this.getNextRace();
        console.log(`*** RACE: ${JSON.stringify(race)}`);
        const positiveSet = await this.calculatePositiveSet(race.market.runners);
        const chosenStrategyType = STRATEGIES[strategyIdx];

        const stake = 10;
        const investment: BetfairInvestment = {
            id: investmentId,
            provider: "Betfair",
            chosenStrategyIdx: strategyIdx,
            status: InvestmentStatus.Active,
            strategies: [],
            _result: race
        };

        const chosenStrategy = {
            chosen: true,
            investmentData: {
                raceId: race.id,
                selections: positiveSet.map(s => s.id),
                stake,
                isBack: chosenStrategyType === StrategyType.BackPositiveSet
            },
            result: undefined
        };

        const unchosenStrategy = {
            chosen: false,
            investmentData: {
                raceId: race.id,
                selections: positiveSet.map(s => s.id),
                stake,
                isBack: chosenStrategyType === StrategyType.LayPositiveSet
            },
            result: undefined
        };
        investment.strategies.push(chosenStrategy);
        investment.strategies.push(unchosenStrategy);

        await this.db.saveItem<Investment>(
            CollectionName.Investments,
            investment
        );

        this.resolveInvestment(sessionId).then(() => {
            console.log("Investment resolved");
        });
           
        return investment;

    }

    private async calculatePositiveSet(runners: any[]): Promise<any[]> {
        // Sort selections by odds (ascending)
        // Get the betfair odds for each runner
        debugger;

        let positiveSet: any[] = [];
        let cumulativeProbability = 0;

        for (const runner of runners) {
            if (!runner.bsp) continue;
            const impliedProbability = 1 / runner.bsp;
            if (cumulativeProbability + impliedProbability < 1) {
                positiveSet.push(runner);
                cumulativeProbability += impliedProbability;
            } else {
                break;
            }
        }
        console.log(`Positive set: ${JSON.stringify(positiveSet)}`);

        return positiveSet;
    }

    public async resolveInvestment(sessionId: string): Promise<Investment> {
        const investment = await this.getInvestment(sessionId);
        // If already resolved, just return the result
        if (investment.status === InvestmentStatus.Completed) {
            return investment;
        }
        // If not resolved, work out how successful each strategy was
        for (const strategy of investment.strategies) {
            const wager = strategy.investmentData;
            const raceResult = investment._result;
            debugger;
            console.log(`Selections: ${JSON.stringify(wager.selections)}`);
            console.log(`Winner: ${JSON.stringify(raceResult.market.winner)}`);
            let win = false;
            if (wager.isBack) {
                win = wager.selections.includes(raceResult.market.winner.id);
            }
            else {
                win = !wager.selections.includes(raceResult.market.winner.id);
            }
            if (win) {
                strategy.result = wager.stake;
            } else {
                strategy.result = -wager.stake;
            }

        }
        // Save the updated investment as completed
        debugger;
        investment.status = InvestmentStatus.Completed;
        await this.db.saveItem<Investment>(
            CollectionName.Investments,
            investment
        );
        return investment;
    }

    public async getInvestment(sessionId: string): Promise<BetfairInvestment> {
        return this.db.getItem<Investment>(
            CollectionName.Investments,
            sessionId
        ) as Promise<BetfairInvestment>;
    }
}
