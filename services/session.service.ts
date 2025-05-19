
import { JudgeService } from "@/services/judge/judge.service";
import { ImageService } from "@/services/image.service";
import { CollectionName, IDbService, INVERSIFY_TOKENS, ISessionService, PollFlag, Session, SessionStatus } from "@/types";
import { InvestmentService } from "./investment/investment.service";
import { inject, injectable } from "inversify";

const IMAGE_COUNT = 2;

@injectable()
export class SessionService implements ISessionService {
    constructor(
        @inject(INVERSIFY_TOKENS.Database)
        private db: IDbService,

        @inject(INVERSIFY_TOKENS.Judge)
        private judgeService: JudgeService,

        @inject(INVERSIFY_TOKENS.Image)
        private imageService: ImageService,

        @inject(INVERSIFY_TOKENS.Investment)
        private investmentService: InvestmentService //private investmentService: InvestmentService
    ) {}

    public async createSession(): Promise<Session> {
        const sessionId = this.generateSessionId();
        const images = await this.imageService.getRandomImageNameList(
            IMAGE_COUNT
        );

        const newSession: Session = {
            id: sessionId,
            images,
            status: SessionStatus.New
        };

        this.db.saveItem<Session>(CollectionName.Sessions, newSession);

        return newSession;
    }

    public async activateSession(
        sessionId: string,
        impressionText: string
    ): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.New) {
            throw new Error(`Session not in ${SessionStatus.New} state`);
        }
        await this.saveSession({
            ...session,
            impressionText,
            status: SessionStatus.Unjudged
        });
        this.judgeSession(sessionId).catch(async e => {
            console.error(e);
        });
        return;
    }

    public async judgeSession(
        sessionId: string
        //impressionText: string
    ): Promise<void> {
        // Judge the impression text and return the chosen image index
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.Unjudged) {
            throw new Error(`Session not in ${SessionStatus.Unjudged} state`);
        }
        if (!session.impressionText) {
            throw new Error("Impression text not found");
        }
        console.log("Judging session...");
        const filePaths = session.images.map(imageName =>
            this.imageService.getImagePath(imageName)
        );

        const chosenImageIndex = await this.judgeService.judge(
            filePaths,
            session.impressionText
        );
        console.log("Chosen image index: ", chosenImageIndex);
        await this.saveSession({
            ...session,
            chosenImageIdx: chosenImageIndex,
            status: SessionStatus.Judged
        });
    }

    // public async invest(sessionId: string): Promise<void> {
    //     const session = await this.getSession(sessionId);
    //     if (session.status !== SessionStatus.Judged) {
    //         console.warn(`Session not in ${SessionStatus.Judged} state`);
    //         return;
    //     }
    //     // Apply the chosen image index to the investment service, and wait for resolution
    //     // Set status to DecidingInvestment
    //     await this.saveSession({
    //         ...session,
    //         status: SessionStatus.DecidingInvestment
    //     });
    //     const investmentStrategyIdx = await this.investmentService.invest(sessionId);
    //     session.status = SessionStatus.Investing;
    //     await this.saveSession({
    //         ...session,
    //         data: {
    //             investmentStrategyIdx
    //         }
    //     });

    // }

    public async executeInvestment(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.Investing) {
            console.warn(`Session not in ${SessionStatus.Investing} state. State: ${session.status}`);
            return;
        }
        //Set status to investing in progress
        await this.saveSession({
            ...session,
            status: SessionStatus.InvestingInProgress
        });
        // Execute the investment and update the session status
        try {
            console.log("Executing investment...");
            const executionReport = await this.investmentService.executeInvestment(sessionId);
            await this.saveSession({
                ...session,
                executionReport,
                status: SessionStatus.Invested
            });
        } catch (error) {
            await this.saveSession({
                ...session,
                status: SessionStatus.Investing
            });
            console.error(error);
        }
    }

    public async resolveInvestment(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.Invested) {
            console.warn(`Session not in ${SessionStatus.Invested} state. State: ${session.status}`);
            return;
        }
        // Resolve the investment and update the session status
        const targetImageIdx = await this.investmentService.resolveInvestment(sessionId);
        if (targetImageIdx === undefined) {
            console.warn(`Investment not resolved for session ${sessionId}`);
            return;
        }
        //const won = targetImageIdx === session.chosenImageIdx;
        await this.saveSession({
            ...session,
            status: SessionStatus.InvestmentResolved,
            targetImageIdx,
        });
    }

    public async shownFeedback(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.InvestmentResolved) {
            throw new Error(
                `Session not in ${SessionStatus.InvestmentResolved} state`
            );
        }
        // Feedback has been shown to the user
        await this.saveSession({
            ...session,
            status: SessionStatus.ShownFeedback
        });
    }

    public async getSession(sessionId: string): Promise<Session> {
        const result = await this.db.getItem<Session>(
            CollectionName.Sessions,
            sessionId
        );
        if (!result) {
            throw new Error(`Session with id ${sessionId} not found`);
        }
        return result;
    }

    public async processSession(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        switch (session.status) {
            case SessionStatus.Unjudged:
                await this.judgeSession(sessionId);
                break;
            case SessionStatus.Judged:
                await this.executeInvestment(sessionId);
                break;
            case SessionStatus.InvestingInProgress:
                break;
            case SessionStatus.Invested:
                await this.resolveInvestment(sessionId);
                break;
            case SessionStatus.InvestmentResolved:
                await this.shownFeedback(sessionId);
                break;
            case SessionStatus.ShownFeedback:
                break;

            default:
                console.log(`Session status ${session.status}`);
        }
    }

    public async getSessions(): Promise<Session[]> {
        const result = await this.db.getAllItems<Session>(CollectionName.Sessions);

        return result.sort((a, b) => {
            return (b.created_at ?? 0) - (a.created_at ?? 0)
        });
    }

    public async saveSession(session: Session): Promise<void> {
        return this.db.saveItem<Session>(CollectionName.Sessions, session);
    }

    public async query(query: Partial<Session>): Promise<Session[]> {
        return this.db.query<Session>(CollectionName.Sessions, query);
    }
    private generateSessionId(): string {
        const characters = "0123456789";
        const length = 12;
        let result = "";
        for (let i = 0; i < length; i++) {
            if (i > 0 && i % 4 === 0) {
                result += "-";
            }
            result += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );
        }
        return result;
    }
}
