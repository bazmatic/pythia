import { CollectionName, DBService } from "./db.service";
import { JudgeService } from "@/services/judge/judge.service";
import { ImageService } from "@/services/image.service";
import { INVERSIFY_TOKENS, Session, SessionStatus } from "@/types";
import { InvestmentService } from "./investment/investment.service";
import { inject, injectable } from "inversify";

const IMAGE_COUNT = 2;

@injectable()
export class SessionService {
    constructor(
        @inject(INVERSIFY_TOKENS.Database)
        private db: DBService,

        @inject(INVERSIFY_TOKENS.Judge)
        private judgeService: JudgeService,

        @inject(INVERSIFY_TOKENS.Image)
        private imageService: ImageService,

        @inject(INVERSIFY_TOKENS.Investment)
        private investmentService: InvestmentService //private investmentService: InvestmentService
    ) {

        this.poll().then(() => {
            console.log("Polling...");
        });

    }

    public async createSession(): Promise<Session> {
        const sessionId = this.generateSessionId();
        const images = await this.imageService.getRandomImageNameList(IMAGE_COUNT);

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
        this.judgeSession(sessionId, impressionText).catch(async e => {
            console.error(e);
        });
        return;
    }

    public async judgeSession(
        sessionId: string,
        impressionText: string
    ): Promise<void> {

        // Judge the impression text and return the chosen image index
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.Unjudged) {
            throw new Error(`Session not in ${SessionStatus.Unjudged} state`);
        }
        console.log("Judging session...");
        const filePaths = session.images.map(imageName =>
            this.imageService.getImagePath(imageName)
        );

        const chosenImageIndex = await this.judgeService.judge(
            filePaths,
            impressionText
        );
        console.log("Chosen image index: ", chosenImageIndex);
        await this.saveSession({
            ...session,
            chosenImageIdx: chosenImageIndex,
            status: SessionStatus.Judged
        });
    }

    public async invest(
        sessionId: string,
    ): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.Judged) {
            throw new Error(`Session not in ${SessionStatus.Judged} state`);
        }
        // Apply the chosen image index to the investment service, and wait for resolution
        return this.investmentService.invest(sessionId);
    }

    public async assess(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session.status !== SessionStatus.InvestmentResolved) {
            throw new Error(`Session not in ${SessionStatus.InvestmentResolved} state`);
        }
        // Assess the investment and update the session status
        // Which strategy was most successful?
        return this.saveSession({
            ...session,
            status: SessionStatus.Assessed
        });
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
            throw new Error(`Session not in ${SessionStatus.InvestmentResolved} state`);
        }
        // Feedback has been shown to the user
        await this.saveSession({
            ...session,
            status: SessionStatus.ShownFeedback
        });
    }

    private async handleUnjudgedSessions(): Promise<void> {
        const unjudgedSessions = await this.query({ status: SessionStatus.Unjudged });
        for (const session of unjudgedSessions) {
            const impressionText = session.impressionText;
            if (!impressionText) {
                throw new Error("Impression text not found");
            }
            await this.judgeSession(session.id, impressionText);
        }
    }

    private async handleJudgedSessions(): Promise<void> {
        const judgedSessions = await this.query({ status: SessionStatus.Judged });
        for (const session of judgedSessions) {
            await this.invest(session.id);
        }
    }

    private async handleInvestmentResolvedSessions(): Promise<void> {
        const investedSessions = await this.query({ status: SessionStatus.InvestmentResolved });
        for (const session of investedSessions) {
            await this.assess(session.id);
        }
    }

    public async getSession(sessionId: string): Promise<Session> {
        const result = await this.db.getItem<Session>(CollectionName.Sessions, sessionId);
        if (!result) {
            throw new Error(`Session with id ${sessionId} not found`);
        }
        return result;
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
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const length = 10;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    public async poll(): Promise<void> {
        setInterval(async () => {
            console.log("Processing sessions...");
            // Look for unjudged sessions
            this.handleUnjudgedSessions().then(async () => {
                console.log("Handled unjudged sessions");
            });

            // Handle judged sessions
            this.handleJudgedSessions().then(async () => {
                console.log("Handled judged sessions");
            });

            // Look for sessions with a strategy not yet resolved
            this.handleInvestmentResolvedSessions().then(async () => {
                console.log("Handled invested sessions");
            });       
        }, 60000);   
    }
}
