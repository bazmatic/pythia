import { CollectionName, DBService } from "./db.service";

export enum InvestmentStatus {
    Pending = 'pending',
    Active = 'active',
    Completed = 'completed',
}

export type Investment = {
    id: string;
    strategyIdx: number;
    status: InvestmentStatus;
    result?: number;
};


enum StrategyType  {
    Conservative = 'conservative',
    Aggressive = 'aggressive',
};

export type StrategyReport = {
    chosenStrategyIdx: number;
    targetStrategyIdx: number;
    investment: Investment;
};  

const STRATEGIES = [ StrategyType.Conservative, StrategyType.Aggressive ];

export class InvestmentService {
    constructor(
        private db: DBService,
    ) {

    }

    public async invest(sessionId: string, strategyIdx: number): Promise<StrategyReport> {
        if (strategyIdx < 0 || strategyIdx > STRATEGIES.length) {
            throw new Error('Invalid strategy');
        }
        console.log('Investing in strategy:', STRATEGIES[strategyIdx]);

        await this.db.saveItem<Investment>(CollectionName.Investments,{
            id: sessionId,
            strategyIdx,
            status: InvestmentStatus.Pending,
        });

        if (strategyIdx === 0) {
            // Conservative strategy
            await this.makeConservativeInvestment(sessionId);
        } else if (strategyIdx === 1) {
            // Aggressive strategy
            await this.makeAggressiveInvestment(sessionId);
        }
        const result: Investment = await this.resolveInvestment(sessionId);
        const strategySuccess: number[] = await this.getInvestmentStrategySuccesses(sessionId);
        // Return the index of the largest number in strategySuccess array
        const targetStrategyIdx: number = strategySuccess.indexOf(Math.max(...strategySuccess));

        return {
            chosenStrategyIdx: strategyIdx,
            targetStrategyIdx,
            investment: result,
        }    
    }

    private async makeConservativeInvestment(sessionId: string): Promise<void> {
        // Make a conservative investment
        return Promise.resolve();
    }

    private async makeAggressiveInvestment(sessionId: string): Promise<void> {
        // Make an aggressive investment
        return Promise.resolve();
    }

    private async resolveInvestment(sessionId: string): Promise<Investment> {
        // Resolve the investment
        console.log('Resolving investment');
        const investment: Investment = await this.getInvestment(sessionId);
        return Promise.resolve(investment);
    }

    private async getInvestmentStrategySuccesses(sessionId: string): Promise<number[]> {
        // Get the success rates of each strategy
        return Promise.resolve([Math.random(), Math.random()]);
    }

    private async getInvestment(sessionId: string): Promise<Investment> {  
        return this.db.getItem<Investment>(CollectionName.Investments, sessionId);
    }

}