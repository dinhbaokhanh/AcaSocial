import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { TransactionManager } from "../../database/transaction-manager";
import { ReconciliationRepository } from "../../repository/reconciliation/reconciliation.repository";
import type { Pagination } from "../pagination";

export interface RebuildRequest {
  userId: string;
  idempotencyKey: string;
  previewJobId: string;
  reason: string;
}

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly repository: ReconciliationRepository,
    private readonly transactions: TransactionManager,
  ) {}

  async enqueueReconciliation(actor: string) {
    return (await this.repository.insertPreview(actor))[0];
  }
  jobs(query: Pagination) {
    return this.repository.listJobs(
      query.limit,
      (query.page - 1) * query.limit,
    );
  }
  findings(id: string, query: Pagination) {
    return this.repository.listFindings(
      id,
      query.limit,
      (query.page - 1) * query.limit,
    );
  }

  async rebuild(dto: RebuildRequest, actor: string) {
    return this.transactions.run(async (m) => {
      await this.repository.lockRebuildRequest(m, dto.idempotencyKey);
      const [old] = await this.repository.findRebuild(m, dto.idempotencyKey);
      if (old) {
        if (
          old.user_id !== dto.userId ||
          old.actor_id !== actor ||
          old.reason !== dto.reason ||
          old.preview_job_id !== dto.previewJobId
        )
          throw new ConflictException(
            "Idempotency key has different parameters",
          );
        return old;
      }
      const preview = await this.repository.findEligiblePreview(
        m,
        dto.previewJobId,
        dto.userId,
      );
      if (!preview.length)
        throw new BadRequestException(
          "A completed preview from the last 24 hours is required",
        );
      const [job] = await this.repository.insertRebuild(
        m,
        actor,
        dto.userId,
        dto.reason,
        dto.idempotencyKey,
        dto.previewJobId,
      );
      await this.repository.appendAudit(
        m,
        actor,
        "projection.rebuild.requested",
        dto.userId,
        dto.reason,
      );
      return job;
    });
  }

  async tick() {
    await this.transactions.repeatableRead(async (m) => {
      const [job] = await this.repository.lockNextJob(m);
      if (!job) return;
      if (job.kind === "rebuild" && job.user_id) {
        // Same user lock as the scoring engine. Retry a serialization failure on the next tick.
        await this.repository.lockUser(m, job.user_id);
        await this.repository.rebuildUserScore(m, job.user_id);
        await this.repository.clearCourseScores(m, job.user_id);
        await this.repository.rebuildCourseScores(m, job.user_id);
        await this.repository.clearBadgesWithoutDecisions(m, job.user_id);
        await this.repository.rebuildBadges(m, job.user_id);
        await this.repository.appendAudit(
          m,
          job.actor_id,
          "projection.rebuilt",
          job.user_id,
          job.reason,
        );
      }
      const userFilter = job.user_id;
      await this.repository.insertFindings(m, job.id, userFilter);
      const counts = await this.repository.countFindings(m, job.id);
      const [{ pending }] = await this.repository.countPendingEvents(m);
      await this.repository.completeJob(
        m,
        job.id,
        JSON.stringify({
          counts,
          totalFindings: counts.reduce((n, r) => n + Number(r.count), 0),
          pending,
          dryRun: job.kind !== "rebuild",
        }),
      );
    });
  }
}
