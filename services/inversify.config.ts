import { Container } from "inversify";
import { JudgeService } from "@/services/judge/judge.service";
import { ImageService } from "@/services/image.service";
import { InvestmentService } from "@/services/investment/investment.service";
import { SessionService } from "@/services/session.service";
import { BetfairInvestmentProvider } from "./investment/betfair.investment.provider";
import { IDbService, IInvestmentProvider, IJudgeProvider, INVERSIFY_TOKENS, ISessionService } from "@/types";
import { ClaudeJudgeProvider } from "./judge/providers/claude.judge.provider";
import { SupabaseDbProvider } from "./db/supabase.db.provider";
// import getDecorators from "inversify-inject-decorators";

const container = new Container();

container.bind<ImageService>(INVERSIFY_TOKENS.Image).to(ImageService).inSingletonScope();
container.bind<JudgeService>(INVERSIFY_TOKENS.Judge).to(JudgeService).inSingletonScope();
container.bind<IInvestmentProvider>(INVERSIFY_TOKENS.InvestmentProvider).to(BetfairInvestmentProvider).inSingletonScope();
container.bind<InvestmentService>(INVERSIFY_TOKENS.Investment).to(InvestmentService).inSingletonScope();
container.bind<ISessionService>(INVERSIFY_TOKENS.Session).to(SessionService).inSingletonScope();

container.bind<IJudgeProvider>(INVERSIFY_TOKENS.JudgementProvider).to(ClaudeJudgeProvider).inSingletonScope();
container.bind<IDbService>(INVERSIFY_TOKENS.Database).to(SupabaseDbProvider).inSingletonScope();

//const { lazyInject } = getDecorators(container);

export { container };