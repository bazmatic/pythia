// services/container.ts

import { DBService } from '@/services/db.service';
import { JudgeService } from '@/services/judge.service';
import { ImageService } from '@/services/image.service';
import { InvestmentService } from '@/services/investment.service';
import { SessionService } from '@/services/session.service';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    // Initialize services
    this.services.set('db', new DBService());
    this.services.set('judge', new JudgeService());
    this.services.set('image', new ImageService());
    this.services.set('investment', new InvestmentService(this.get('db')));
    this.services.set('session', new SessionService(
      this.get('db'),
      this.get('judge'),
      this.get('image'),
      this.get('investment')
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

export function useService<T>(serviceName: string): T {
  return ServiceContainer.getInstance().get<T>(serviceName);
}