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
    Pending = "pending",
    Active = "active",
    Completed = "completed"
}

export type Session = {
    id: string;
    images: string[];
    impressionText?: string;
    chosenImageIdx?: number;
    targetImageIdx?: number;
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
    investmentData: any;
    chosen: boolean;
    result?: number;
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
        sessionId: string,
        strategyIdx: number
    ): Promise<Investment>;

    resolveInvestment(
        sessionId: string
    ): Promise<Investment>;

}
