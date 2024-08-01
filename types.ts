export type InvestmentResult = {
    strategy: number;
    result: number;
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

export enum ServiceName {
  Database = "database",
  Investment = "investment",
  Judge = "judge",
  Image = "image",
  Session = "session",
}
