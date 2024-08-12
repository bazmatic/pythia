import { CollectionName, DBService } from "./db.service";
import { JudgeService } from "@/services/judge/judge.service";
import { ImageService } from "@/services/image.service";
import { Investment, Session, SessionStatus } from "@/types";
import { InvestmentService } from "./investment/investment.service";

const IMAGE_COUNT = 2;

export class SessionService {
    constructor(
        private db: DBService,
        private judgeService: JudgeService,
        private imageService: ImageService,
        private investmentService: InvestmentService //private investmentService: InvestmentService
    ) {}

    public async createSession(): Promise<Session> {
        const sessionId = this.generateSessionId();
        const images = await this.imageService.getRandomImageNameList(IMAGE_COUNT);

        const newSession: Session = {
            id: sessionId,
            images,
            status: SessionStatus.Pending
        };

        this.db.saveItem<Session>(CollectionName.Sessions, newSession);
        return newSession;
    }

    public async activateSession(
        sessionId: string,
        impressionText: string
    ): Promise<void> {
        const session = await this.getSession(sessionId);
        await this.saveSession({
            ...session,
            impressionText,
            status: SessionStatus.Active
        });
        this.processSession(sessionId, impressionText).catch(async e => {
            console.error(e);
        });
        return;
    }

    public async processSession(
        sessionId: string,
        impressionText: string
    ): Promise<boolean> {
        console.log("Processing session...");
        // Judge the impression text and return the chosen image index
        const session = await this.getSession(sessionId);
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
            chosenImageIdx: chosenImageIndex
        });

        // Apply the chosen image index to the investment service, and wait for resolution

        console.log("Investing...");
        const investment: Investment = await this.investmentService.invest(sessionId, chosenImageIndex);
        console.log(`Investment: ${JSON.stringify(investment)}`);
        debugger;

        // Update the session with the correct target (the most successful strategy)
        const updatedSession = await this.getSession(sessionId);
        const targetStrategyIdx = investment.strategies.reduce(
            (best, strategy, idx) =>
                (strategy?.result ?? 0) > (investment.strategies[best]?.result ?? 0) ? idx : best,
            0
        );
        if (updatedSession.chosenImageIdx === targetStrategyIdx) {
            console.log("***** Correct choice!");
        } else {
            console.log("***** Incorrect choice!");
        }
        await this.saveSession({
            ...updatedSession,
            targetImageIdx: targetStrategyIdx,
            status: SessionStatus.Completed
        });
        return targetStrategyIdx === chosenImageIndex;
    }

    public async getSession(sessionId: string): Promise<Session> {
        return this.db.getItem<Session>(CollectionName.Sessions, sessionId);
    }

    public async getSessions(): Promise<Session[]> {
        return this.db.getAllItems<Session>(CollectionName.Sessions);
    }

    public async saveSession(session: Session): Promise<void> {
        return this.db.saveItem<Session>(CollectionName.Sessions, session);
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
}
