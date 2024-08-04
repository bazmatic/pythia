// services/container.ts

import { DBService } from '@/services/db.service';
import { JudgeService } from '@/services/judge.service';
import { ImageService } from '@/services/image.service';
import { InvestmentService } from '@/services/investment.service';
import { SessionService } from '@/services/session.service';
import { ServiceName } from '@/types';
import { OpenAIJudgeProvider } from './openai.service';
import { ClaudeJudgeProvider } from './claude.service';
import { LlavaJudgeProvider } from './llava.service';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();


  private constructor() {
    // Initialize services
    if (process.env.JUDGE_PROVIDER === 'openai') {
      this.services.set(ServiceName.JudgementProvider, new OpenAIJudgeProvider());
    } else if (process.env.JUDGE_PROVIDER === 'claude') {
      this.services.set(ServiceName.JudgementProvider, new ClaudeJudgeProvider());
    } else if (process.env.JUDGE_PROVIDER === 'llava') {
      this.services.set(ServiceName.JudgementProvider, new LlavaJudgeProvider());
    } else {
      throw new Error('Invalid JUDGE_PROVIDER');
    }
    this.services.set(ServiceName.Database, new DBService());
    this.services.set(ServiceName.Judge, new JudgeService(this.get(ServiceName.JudgementProvider)));
    this.services.set(ServiceName.Image, new ImageService());
    this.services.set(ServiceName.Investment, new InvestmentService(this.get(ServiceName.Database)));
    this.services.set(ServiceName.Session, new SessionService(
      this.get(ServiceName.Database),
      this.get(ServiceName.Judge),
      this.get(ServiceName.Image),
      this.get(ServiceName.Investment)
    ));
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }
}

export function getService<T>(serviceName: string): T {
  return ServiceContainer.getInstance().get<T>(serviceName);
}