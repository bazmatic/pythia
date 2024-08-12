import { IInvestmentProvider, Investment, StrategyReport } from "@/types";


export class InvestmentService  {

    constructor(
        private investmentProvider: IInvestmentProvider
    ) {
    }

    public async invest(
        sessionId: string,
        strategyIdx: number
    ): Promise<Investment> {
        return this.investmentProvider.invest(sessionId, strategyIdx);
    }

    public async resolveInvestment(sessionId: string): Promise<Investment> {
        return this.investmentProvider.resolveInvestment(sessionId);
    }
}
