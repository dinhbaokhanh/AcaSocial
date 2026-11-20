import { Injectable } from "@nestjs/common";
import {
  type ReputationActivity,
  ReputationRepository,
} from "../../repository/reputation/reputation.repository";
import type { Pagination } from "../pagination";
import { RulesService } from "../rules/rules.service";

@Injectable()
export class ReputationService {
  constructor(
    private readonly repository: ReputationRepository,
    private rules: RulesService,
  ) {}
  async summary(userId: string) {
    const [row] = await this.repository.findSummary(userId);
    const [start] = await this.repository.findStartDate();
    const [pending] = await this.repository.countPendingForUser(userId);
    return {
      totalScore: row?.total_score ?? "0",
      generalScore: row?.general_score ?? "0",
      updatedAt: row?.updated_at ?? null,
      startedAt: start.effective_at,
      updating: Number(pending.count) > 0,
    };
  }
  async page(kind: ReputationActivity, userId: string, query: Pagination) {
    const [rows, [total]] = await Promise.all([
      this.repository.listActivity(
        kind,
        userId,
        query.limit,
        (query.page - 1) * query.limit,
      ),
      this.repository.countActivity(kind, userId),
    ]);
    return {
      data: rows,
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems: Number(total.count),
        totalPages: Math.ceil(Number(total.count) / query.limit),
      },
    };
  }

  async definitions() {
    const rule = await this.rules.current();
    return ["Helper", "Contributor", "Expert"].map((code, i) => ({
      code,
      threshold: rule.config.thresholds[i],
      version: rule.version,
    }));
  }
}
