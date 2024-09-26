import { inject, injectable } from "inversify";
import { INVERSIFY_TOKENS, IDbService, CollectionName, Session, SessionStatus, SessionStats } from "@/types";


@injectable()
export class StatsService {
    constructor(
        @inject(INVERSIFY_TOKENS.Database)
        private db: IDbService
    ) {}

    public async getStats(): Promise<SessionStats> {
        const sessions = await this.db.getAllItems<Session>(CollectionName.Sessions);
        const completedSessions = sessions.filter(
            session => session.status === SessionStatus.InvestmentResolved || session.status === SessionStatus.ShownFeedback
        );

        const totalSessions = completedSessions.length;
        const wins = completedSessions.filter(
            session => session.chosenImageIdx === session.targetImageIdx
        ).length;
        const losses = totalSessions - wins;
        const winPercentage = totalSessions > 0 ? (wins / totalSessions) * 100 : 0;

        return {
            totalSessions,
            wins,
            losses,
            winPercentage: Number(winPercentage.toFixed(2))
        };
    }
}
