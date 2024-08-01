// services/container.ts

import { DBService } from '@/services/db.service';
import { JudgeService } from '@/services/judge.service';
import { ImageService } from '@/services/image.service';
import { InvestmentService } from '@/services/investment.service';
import { SessionService } from '@/services/session.service';
import { ServiceName } from '@/types';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    // Initialize services
    this.services.set(ServiceName.Database, new DBService());
    this.services.set(ServiceName.Judge, new JudgeService());
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