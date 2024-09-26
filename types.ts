export const INVERSIFY_TOKENS = {
    ClaudeJudgeProvider: Symbol.for("ClaudeJudgeProvider"),
    Database: Symbol.for("Database"),
    Judge: Symbol.for("Judge"),
    JudgementProvider: Symbol.for("JudgementProvider"),
    Image: Symbol.for("Image"),
    Investment: Symbol.for("Investment"),
    InvestmentProvider: Symbol.for("InvestmentProvider"),
    Session: Symbol.for("Session"),
    Stats: Symbol.for("Stats")
};

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
    InvestmentResolved = "resolved",
    ShownFeedback = "shown"
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

export type SessionStats = {
    totalSessions: number;
    wins: number;
    losses: number;
    winPercentage: number;
};

export type Investment = {
    id: string;
    provider: string;
    chosenStrategyIdx: number;
    strategies: StrategyInfo[];
    status: InvestmentStatus;
};

export type StrategyInfo = {
    investmentData: any; // Detailed info particular to the investment provider
    chosen: boolean; // The user chose this
    result?: number; // How successful
};

export type PollFlag = {
    id: string;
    running: boolean;
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
    invest(sessionId: string): Promise<void>;
    executeInvestment(sessionId: string): Promise<void>;
    resolveInvestment(sessionId: string): Promise<void>;
}

export interface Identifiable {
    id: string;
}

export enum CollectionName {
    Sessions = "sessions",
    Investments = "investments",
    Flags = "flags"
}

export interface IDbService {
    getItem<T extends Identifiable>(collectionName: CollectionName, id: string): Promise<T | null>;
    getAllItems<T extends Identifiable>(collectionName: CollectionName): Promise<T[]>;
    query<T extends Identifiable>(collectionName: CollectionName, query: Partial<T>): Promise<T[]>;
    deleteItem(collectionName: CollectionName, id: string): Promise<void>;
    saveItem<T extends Identifiable>(collectionName: CollectionName, item: T): Promise<void>;   
  }

  export interface ISessionService {
    createSession(): Promise<Session>;
    activateSession(sessionId: string, impressionText: string): Promise<void>;
    judgeSession(sessionId: string): Promise<void>;
    invest(sessionId: string): Promise<void>;
    executeInvestment(sessionId: string): Promise<void>;
    resolveInvestment(sessionId: string): Promise<void>;
    shownFeedback(sessionId: string): Promise<void>;
    getSession(sessionId: string): Promise<Session>;
    getSessions(): Promise<Session[]>;
}