import { IInvestmentProvider, Investment, StrategyReport } from "@/types";


export class InvestmentService  {

    constructor(
        private investmentProvider: IInvestmentProvider
    ) {
    }

    public async invest(
        sessionId: string,
    ): Promise<void> {
        return this.investmentProvider.invest(sessionId);
    }

    public async resolveInvestment(sessionId: string): Promise<void> {
        return this.investmentProvider.resolveInvestment(sessionId);
    }
}
