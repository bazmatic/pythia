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


export function extractJson (text: string): any | null {
    // Find the first opening bracket
    const start = text.indexOf("{");
    if (start === -1) {
        return null;
    }
    // Find the last closing bracket
    const end = text.lastIndexOf("}");
    if (end === -1) {
        return null;
    }
    // Remove all backslashes
    text = text.replace(/\\/g, "");
    // Extract the JSON string
    const json = text.slice(start, end + 1);
    console.log("Extracted and cleaned JSON:", json);
    try {
        return JSON.parse(json);
    } catch (e) {
        return null;
    }

};
