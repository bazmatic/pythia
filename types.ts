export enum InvestmentStatus {
    Pending = "pending",
    Active = "active",
    Completed = "completed"
}

export type StrategyReport = {
    chosenStrategyIdx: number;
    targetStrategyIdx: number;
    investment: Investment;
};

export enum SessionStatus {
    New = "new",
    Unjudged = "unjudged",
    Judged = "judged",
    Investing = "investing",
    Invested = "invested",
    InvestmentResolved = "investmentResolved",
    Assessed = "assessed",
    ShownFeedback = "shownFeedback",
}

export type Session = {
    id: string;
    images: string[];
    impressionText?: string;
    chosenImageIdx?: number;
    targetImageIdx?: number;
    data?: any;
    status: SessionStatus;
};

export type Investment = {
    id: string;
    provider: string;
    chosenStrategyIdx: number;
    strategies: StrategyInfo[],
    status: InvestmentStatus;
};

export type StrategyInfo = {
    investmentData: any; // Detailed info particular to the investment provider
    chosen: boolean; // The user chose this
    result?: number; // How successful
};


export enum ServiceName {
    Database = "database",
    Investment = "investment",
    Judge = "judge",
    JudgementProvider = "judgementProvider",
    Image = "image",
    Session = "session"
}

export interface IJudgeProvider {
    provideJudgement(
        imagesPathA: string,
        imagePathB: string,
        impressionText: string
    ): Promise<number>;
}

export interface IInvestmentProvider {
    invest(
        sessionId: string
    ): Promise<void>;

    resolveInvestment(
        sessionId: string
    ): Promise<void>;

}
