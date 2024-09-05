import { Container } from "inversify";
import { DBService } from "@/services/db.service";
import { JudgeService } from "@/services/judge/judge.service";
import { ImageService } from "@/services/image.service";
import { InvestmentService } from "@/services/investment/investment.service";
import { SessionService } from "@/services/session.service";
import { BetfairInvestmentProvider } from "./investment/betfair.investment.provider";
import { INVERSIFY_TOKENS } from "@/types";
import { ClaudeJudgeProvider } from "./judge/claude.service";
// import getDecorators from "inversify-inject-decorators";

const container = new Container();

container.bind<ImageService>(INVERSIFY_TOKENS.Image).to(ImageService).inSingletonScope();
container.bind<JudgeService>(INVERSIFY_TOKENS.Judge).to(JudgeService).inSingletonScope();
container.bind<BetfairInvestmentProvider>(INVERSIFY_TOKENS.InvestmentProvider).to(BetfairInvestmentProvider).inSingletonScope();
container.bind<InvestmentService>(INVERSIFY_TOKENS.Investment).to(InvestmentService).inSingletonScope();
container.bind<SessionService>(INVERSIFY_TOKENS.Session).to(SessionService).inSingletonScope();

container.bind<ClaudeJudgeProvider>(INVERSIFY_TOKENS.JudgementProvider).to(ClaudeJudgeProvider).inSingletonScope();
container.bind<DBService>(INVERSIFY_TOKENS.Database).to(DBService).inSingletonScope();

//const { lazyInject } = getDecorators(container);

export { container };