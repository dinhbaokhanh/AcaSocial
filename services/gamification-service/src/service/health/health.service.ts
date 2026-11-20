import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { HealthRepository } from "../../repository/health/health.repository";
import { GamificationWorker } from "../worker/gamification.worker";

@Injectable()
export class HealthService {
  constructor(
    private readonly repository: HealthRepository,
    private readonly worker: GamificationWorker,
  ) {}

  async health() {
    await this.repository.ping();
    return { status: "ok", ...this.worker.state() };
  }

  async ready() {
    await this.repository.ping();
    const state = this.worker.state();
    if (state.enabled && (!state.connected || !state.subscribed))
      throw new ServiceUnavailableException("Consumer is not ready");
    return { status: "ready", ...state };
  }
}
