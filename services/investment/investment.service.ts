import { INVERSIFY_TOKENS } from "@/types";
import type { IInvestmentProvider } from "@/types";
import { inject, injectable, LazyServiceIdentifier } from "inversify";


@injectable()
export class InvestmentService  {

    constructor(
        @inject(new LazyServiceIdentifier(() => INVERSIFY_TOKENS.InvestmentProvider))
        private investmentProvider: IInvestmentProvider
    ) {
    }

    // public async invest(
    //     sessionId: string,
    // ): Promise<number> {
    //     return this.investmentProvider.invest(sessionId);
    // }

    public async resolveInvestment(sessionId: string): Promise<number | undefined> {
        return this.investmentProvider.resolveInvestment(sessionId);
    }

    public async executeInvestment(sessionId: string): Promise<void> {
        // Set the status to InvestingInProgress
        await this.investmentProvider.executeInvestment(sessionId);
    }
}
