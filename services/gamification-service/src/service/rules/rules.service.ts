import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { TransactionManager } from "../../database/transaction-manager";
import { RulesRepository } from "../../repository/rules/rules.repository";
import type { Pagination } from "../pagination";
import type { RuleUpdate } from "./rules";

@Injectable()
export class RulesService {
  constructor(
    private readonly repository: RulesRepository,
    private readonly transactions: TransactionManager,
  ) {}

  async current() {
    return (await this.repository.findCurrent())[0];
  }

  async updateRules(dto: RuleUpdate, actor: string) {
    if (!(
      dto.thresholds[0] < dto.thresholds[1] &&
      dto.thresholds[1] < dto.thresholds[2]
    ))
      throw new BadRequestException("Thresholds must be strictly increasing");
    return this.transactions.run(async (m) => {
      await this.repository.lockRuleChanges(m);
      const [before] = await this.repository.lockCurrent(m);
      if (before.version !== dto.expectedVersion)
        throw new ConflictException("Rules changed; reload before editing");
      const { expectedVersion: _version, reason, ...config } = dto;
      const [after] = await this.repository.insertRules(
        m,
        JSON.stringify(config),
        actor,
        reason,
      );
      await this.repository.appendAudit(
        m,
        actor,
        reason,
        JSON.stringify(before),
        JSON.stringify(after),
      );
      return after;
    });
  }
  audits(query: Pagination) {
    return this.repository.listAudits(
      query.limit,
      (query.page - 1) * query.limit,
    );
  }
}
