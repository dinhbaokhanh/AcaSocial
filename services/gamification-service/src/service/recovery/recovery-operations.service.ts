import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { TransactionManager } from "../../database/transaction-manager";
import {
  RecoveryOperationsRepository,
  type RecoveryItemKind,
} from "../../repository/recovery/recovery-operations.repository";
import type { Pagination } from "../pagination";
import { eventHash, validateEvent } from "../reputation/reputation.engine";
import { validateReference } from "./recovery.service";

@Injectable()
export class RecoveryOperationsService {
  constructor(
    private readonly repository: RecoveryOperationsRepository,
    private readonly transactions: TransactionManager,
  ) {}

  gaps(query: Pagination) {
    return this.repository.listGaps(
      query.limit,
      (query.page - 1) * query.limit,
    );
  }
  references(query: Pagination) {
    return this.repository.listReferences(
      query.limit,
      (query.page - 1) * query.limit,
    );
  }
  failures(query: Pagination) {
    return this.repository.listFailures(
      query.limit,
      (query.page - 1) * query.limit,
    );
  }
  inboxFailures(query: Pagination) {
    return this.repository.listInboxFailures(
      query.limit,
      (query.page - 1) * query.limit,
    );
  }
  async retry(
    kind: RecoveryItemKind,
    id: string,
    reason: string,
    actor: string,
  ) {
    await this.transactions.run(async (m) => {
      const found = await this.repository.lockRecoveryItem(m, kind, id);
      if (!found.length) throw new BadRequestException("Unknown recovery item");
      if (kind === "references" || kind === "inbox") {
        const [item] = await this.repository.findRecoveryItemStatus(
          m,
          kind,
          id,
        );
        if (item.status === "replay_held")
          throw new ConflictException(
            "Replay item requires preflight before scoring",
          );
      }
      if (kind === "gaps" && !(await this.repository.resetGap(m, id)).length)
        throw new ConflictException("Recovery gap is already resolved");
      if (kind === "references" && !(await this.repository.resetReference(m, id)).length)
        throw new ConflictException("Source reference is already processed");
      if (kind === "inbox") {
        const reset = await this.repository.resetInbox(m, id);
        if (!reset.length)
          throw new ConflictException("Inbox event has no retryable error");
      }
      if (kind === "failures") {
        const [failure] = await this.repository.lockFailedEvent(m, id);
        if (!failure) throw new BadRequestException("Unknown failed event");
        let event: unknown;
        try {
          event = JSON.parse(failure.payload);
        } catch {
          throw new BadRequestException(
            "Repair producer first: invalid JSON cannot be retried",
          );
        }

        if (
          (event as { data?: { schemaVersion?: number } })?.data
            ?.schemaVersion === 2
        ) {
          try {
            validateReference(event);
          } catch {
            throw new BadRequestException(
              "Repair producer first: invalid journal reference",
            );
          }
          const [prior] = await this.repository.findReference(m, event.eventId);
          if (
            prior &&
            (prior.manifest.data.payloadHash !== event.data.payloadHash ||
              prior.manifest.data.aggregateId !== event.data.aggregateId ||
              prior.manifest.data.reputationRevision !==
                event.data.reputationRevision ||
              prior.manifest.data.payloadBytes !== event.data.payloadBytes ||
              prior.manifest.data.payloadCharacters !== event.data.payloadCharacters)
          )
            throw new ConflictException("Conflicting journal reference");
          const queued = await this.repository.queueFailedReference(
            m,
            event.eventId,
            JSON.stringify(event),
          );
          if (!queued.length)
            throw new ConflictException("Source reference was changed or cannot be retried");
        } else {
          try {
            validateEvent(event);
          } catch {
            throw new BadRequestException(
              "Repair producer first: invalid event cannot be retried",
            );
          }
          const hash = eventHash(event);
          const prior = await this.repository.findExistingEvent(
            m,
            event.eventId,
            event.data.aggregateId,
            event.data.reputationRevision,
          );
          if (
            prior.some(
              (p) => p.event_id !== event.eventId || p.payload_hash !== hash,
            )
          )
            throw new ConflictException("Conflicting event identity");
          const queued = await this.repository.queueFailedEvent(
            m,
            event.eventId,
            event.data.aggregateId,
            event.data.reputationRevision,
            JSON.stringify(event),
            hash,
          );
          if (!queued.length)
            throw new ConflictException("Inbox event was changed or cannot be retried");
        }
        await this.repository.markFailureRetried(m, id);
      }
      await this.repository.appendAudit(m, actor, `retry.${kind}`, id, reason);
    });
    return { status: "queued" };
  }

  async metrics() {
    const [stats] = await this.repository.findMetrics();
    return stats;
  }
}
