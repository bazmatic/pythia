
import { CollectionName, DBService } from "./db.service";
import { randomUUID } from "crypto";
import { JudgeService } from "./judge.service";
import { ImageService } from "./image.service";
import { InvestmentService, StrategyReport } from "./investment.service";
  
export type Session = {
    id: string;
    images: string[];
    impressionText?: string;    
    chosenImageIdx?: number;
    targetImageIdx?: number;
    status: SessionStatus;
};

export enum SessionStatus {
    Pending = 'pending',
    Active = 'active',
    Completed = 'completed'
}

export class SessionService {

    constructor(
        private db: DBService,
        private judgeService: JudgeService,
        private imageService: ImageService,
        private investmentService: InvestmentService
        //private investmentService: InvestmentService
    ) {

    }

    public async createSession(): Promise<Session> {
        const sessionId = randomUUID();
        const images = await this.imageService.getRandomImageNameList(2);
    
        const newSession: Session = {
          id: sessionId,
          images,
          status: SessionStatus.Pending
        };
    
        this.db.saveItem<Session>(CollectionName.Sessions, newSession);
        return newSession;
    }

    public async activateSession(sessionId: string, impressionText: string): Promise<void> {
        const session = await this.getSession(sessionId);
        await this.saveSession ({
            ...session,
            impressionText,
            status: SessionStatus.Active
        });
        this.processSession(sessionId, impressionText).catch(async (e) => {
            console.error(e);
        });
        return;
    }

    public async processSession(sessionId: string, impressionText: string): Promise<boolean> {
        // Judge the impression text and return the chosen image index
        const session = await this.getSession(sessionId);
        const filePaths = session.images.map(imageName => this.imageService.getImagePath(imageName));
        const chosenImageIndex = await this.judgeService.judge(filePaths, impressionText);
        await this.saveSession({
            ...session,
            chosenImageIdx: chosenImageIndex
        });

        // Apply the chosen image index to the investment service, and wait for resolution
        const strategyReport: StrategyReport = await this.investmentService.invest(sessionId, chosenImageIndex);

        // Update the session with the correct target (the most successful strategy)
        const updatedSession = await this.getSession(sessionId);
        await this.saveSession({
            ...updatedSession,
            targetImageIdx: strategyReport.targetStrategyIdx,
            status: SessionStatus.Completed
        });
        return strategyReport.targetStrategyIdx === chosenImageIndex;
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
}