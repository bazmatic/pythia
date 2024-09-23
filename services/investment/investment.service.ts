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

    public async invest(
        sessionId: string,
    ): Promise<void> {
        return this.investmentProvider.invest(sessionId);
    }

    public async resolveInvestment(sessionId: string): Promise<void> {
        return this.investmentProvider.resolveInvestment(sessionId);
    }

    public async executeInvestment(sessionId: string): Promise<void> {
        await this.investmentProvider.executeInvestment(sessionId);
    }
}
