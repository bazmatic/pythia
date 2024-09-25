
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
            data: {},
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

    public async invest(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.Judged) {
            throw new Error(`Session not in ${SessionStatus.Judged} state`);
        }
        // Apply the chosen image index to the investment service, and wait for resolution
        return this.investmentService.invest(sessionId);
    }

    public async executeInvestment(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.Investing) {
            throw new Error(`Session not in ${SessionStatus.Investing} state`);
        }
        // Execute the investment and update the session status
        return this.investmentService.executeInvestment(sessionId);
    }

    public async resolveInvestment(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.Invested) {
            throw new Error(`Session not in ${SessionStatus.Invested} state`);
        }
        // Resolve the investment and update the session status
        return this.investmentService.resolveInvestment(sessionId);
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
                await this.invest(sessionId);
                break;
            case SessionStatus.Investing:
                await this.executeInvestment(sessionId);
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
        return this.db.getAllItems<Session>(CollectionName.Sessions);
    }

    public async saveSession(session: Session): Promise<void> {
        return this.db.saveItem<Session>(CollectionName.Sessions, session);
    }

    public async query(query: Partial<Session>): Promise<Session[]> {
        return this.db.query<Session>(CollectionName.Sessions, query);
    }

    private generateSessionId(): string {
        const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567890123456789012345678901234567890123456789";
        const length = 10;
        let result = "";
        for (let i = 0; i < length; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );
        }
        return result;
    }
}
