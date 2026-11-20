import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { TransactionManager } from "../../database/transaction-manager";
import { RecoveryRepository, type PreviewJob } from "../../repository/recovery/recovery.repository";
import type { Pagination } from "../pagination";
import { uuid } from "../uuid";
import {
  ReputationEngine,
  ReputationEvent,
  eventHash,
  validateEvent,
} from "../reputation/reputation.engine";
import type { ReplayFinding, ReplayItem, ReplayQuotaBucket, ReplayQuotaEvidence, ReplayRevision } from "../reputation/replay-preflight";

export interface SourceReference {
  eventId: string;
  eventType: string;
  data: {
    schemaVersion: number;
    aggregateId: string;
    reputationRevision: number;
    payloadHash: string;
    payloadBytes: number;
    payloadCharacters: number;
  };
}
export interface ReplayScope {
  aggregateId?: string;
  fromDate?: string;
  toDate?: string;
}

export function validateReference(
  input: unknown,
): asserts input is SourceReference {
  const e = input as SourceReference;
  if (
    !e ||
    !uuid.test(e.eventId) ||
    e.eventType !== "reputation.content.changed" ||
    e.data?.schemaVersion !== 2 ||
    !uuid.test(e.data.aggregateId) ||
    !Number.isSafeInteger(e.data.reputationRevision) ||
    e.data.reputationRevision < 1 ||
    !/^[0-9a-f]{64}$/.test(e.data.payloadHash) ||
    !Number.isSafeInteger(e.data.payloadBytes) ||
    e.data.payloadBytes < 1 ||
    !Number.isSafeInteger(e.data.payloadCharacters) ||
    e.data.payloadCharacters < 1
  )
    throw new Error("Invalid journal reference");
}
class SourceHistoryMissing extends Error {}
const REPLAY_BATCH = 5;
const MAX_REPLAY_BYTES = 32 * 1024 * 1024;

type StagedReplayItem = ReplayItem & { bytes: number };

@Injectable()
export class RecoveryService {
  constructor(
    private readonly repository: RecoveryRepository,
    private readonly transactions: TransactionManager,
    private config: ConfigService,
    private engine: ReputationEngine,
  ) {}
  private async requestSource(path: string, body?: ReplayScope | { buckets: ReplayQuotaBucket[] }) {
    const base = this.config.get<string>(
      "DISCUSSION_SERVICE_URL",
      "http://localhost:8084",
    );
    const response = await fetch(base + "/internal/reputation/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        "X-Internal-Token": this.config.getOrThrow<string>(
          "INTERNAL_SERVICE_TOKEN",
        ),
        ...(body && { "Content-Type": "application/json" }),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (path === "exports" && response.status === 400)
        throw new BadRequestException(
          "Phạm vi vượt 10.000 sự kiện. Hãy chọn một bài viết hoặc thu hẹp khoảng ngày.",
        );
      if (response.status === 404)
        throw new SourceHistoryMissing(
          "Historical event has expired or is unavailable",
        );
      throw new Error(`Source API returned ${response.status}`);
    }
    // Internal endpoints cap each page to 16K characters; limit network response size too.
    const reader = response.body!.getReader();
    let size = 0;
    const parts: Uint8Array[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 512 * 1024)
          throw new Error("Source page exceeds size limit");
        parts.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8")) as unknown;
  }

  private quotaEvidence(scope: ReplayScope) {
    if (!scope.aggregateId && !scope.fromDate && !scope.toDate) return undefined;
    return async (buckets: ReplayQuotaBucket[]) => {
      const response = await this.requestSource("replay-candidates", { buckets }) as {
        data: ReplayQuotaEvidence[];
        limited: boolean;
        incomplete: boolean;
      };
      if (response.incomplete)
        throw new Error("Journal retention no longer covers every day needed to verify scoped replay quota");
      if (!Array.isArray(response.data) || response.incomplete !== false ||
          response.limited !== false || response.data.length > 500)
        throw new Error("Unable to verify competing rewards outside the replay scope");
      return response.data;
    };
  }
  async fetchEvent(reference: SourceReference): Promise<ReputationEvent> {
    validateReference(reference);
    const d = reference.data,
      max = Number(
        this.config.get("GAMIFICATION_MAX_SNAPSHOT_BYTES", "16777216"),
      );
    if (d.payloadBytes > max)
      throw new SourceHistoryMissing(
        "Snapshot exceeds configured memory budget; operator intervention required",
      );
    let offset = 0,
      text = "",
      receivedBytes = 0;
    while (offset < d.payloadCharacters) {
      const chunk = (await this.requestSource(
        `journal/${reference.eventId}?offset=${offset}`,
      )) as {
        chunk: string;
        offset: number;
        nextOffset: number;
        characters: number;
        bytes: number;
        hash: string;
      };
      if (
        typeof chunk.chunk !== "string" ||
        chunk.offset !== offset ||
        chunk.nextOffset !== offset + Array.from(chunk.chunk).length ||
        chunk.nextOffset <= offset ||
        chunk.nextOffset > d.payloadCharacters ||
        chunk.characters !== d.payloadCharacters ||
        chunk.bytes !== d.payloadBytes ||
        chunk.hash !== d.payloadHash
      )
        throw new Error("Journal chunk/manifest mismatch");
      receivedBytes += Buffer.byteLength(chunk.chunk);
      if (receivedBytes > d.payloadBytes || receivedBytes > max)
        throw new Error("Journal payload exceeds declared size");
      text += chunk.chunk;
      offset = chunk.nextOffset;
    }
    if (
      receivedBytes !== d.payloadBytes ||
      createHash("sha256").update(text).digest("hex") !== d.payloadHash
    )
      throw new Error("Journal checksum mismatch");
    const event: unknown = {
      eventId: reference.eventId,
      eventType: reference.eventType,
      data: JSON.parse(text) as unknown,
    };
    validateEvent(event);
    if (
      event.data.aggregateId !== d.aggregateId ||
      event.data.reputationRevision !== d.reputationRevision
    )
      throw new Error("Journal event identity mismatch");
    return event;
  }
  async accept(reference: unknown, silent = false) {
    validateReference(reference);
    await this.transactions.run(async (m) => {
      await this.repository.lockReference(m, reference.eventId);
      await this.repository.insertReference(m, reference.eventId, JSON.stringify(reference), silent);
      const [old] = await this.repository.findReference(m, reference.eventId);
      const a = old.manifest.data,
        b = reference.data;
      if (
        a.payloadHash !== b.payloadHash ||
        a.aggregateId !== b.aggregateId ||
        a.reputationRevision !== b.reputationRevision ||
        a.payloadBytes !== b.payloadBytes ||
        a.payloadCharacters !== b.payloadCharacters
      )
        throw new Error("Conflicting journal reference");
    });
  }

  async previewReplay(actor: string, reason: string, scope: ReplayScope = {}) {
    if (Boolean(scope.fromDate) !== Boolean(scope.toDate))
      throw new BadRequestException("Hãy nhập cả ngày bắt đầu và ngày kết thúc.");
    if (scope.fromDate && scope.toDate && scope.fromDate > scope.toDate)
      throw new BadRequestException("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
    const preview = (await this.requestSource("exports", scope)) as {
      exportId: string;
      totalEvents: number;
      scope?: ReplayScope;
    };
    if (
      !uuid.test(preview.exportId) ||
      !Number.isInteger(preview.totalEvents) ||
      preview.totalEvents < 0 ||
      preview.totalEvents > 10000 ||
      preview.scope?.aggregateId !== scope.aggregateId ||
      preview.scope?.fromDate !== scope.fromDate ||
      preview.scope?.toDate !== scope.toDate
    )
      throw new Error("Invalid export preview");
    return (
      await this.repository.insertReplay(actor, reason, preview.exportId, preview.totalEvents, scope)
    )[0];
  }
  replayJobs(q: Pagination) {
    return this.repository.listReplays(q.limit, (q.page - 1) * q.limit);
  }
  async executeReplay(id: string, actor: string, reason: string) {
    return this.transactions.run(async (m) => {
      const [job] = await this.repository.lockReplay(m, id);
      if (!job)
        throw new BadRequestException("Replay preview missing");
      const resuming = job.status === "needs_intervention";
      if (!resuming && job.status !== "preview_ready")
        return { status: job.status };
      if (job.expired && !job.fullyStaged)
        throw new BadRequestException("Replay preview expired");
      const status = resuming || !job.preflight_complete ? "previewing" : "applying";
      await this.repository.resetReplay(m, id, status);
      await this.repository.appendAudit(
        m,
        actor,
        resuming ? "journal.replay.resumed" : "journal.replay.confirmed",
        id,
        reason,
      );
      return { status };
    });
  }

  private async stageReplayBatch(job: PreviewJob, refs: SourceReference[], advance: number) {
    const events: StagedReplayItem[] = [];
    for (const ref of refs) {
      validateReference(ref);
      const [applied] = await this.repository.findAppliedEvent(ref.eventId);
      if (applied && (applied.aggregate_id !== ref.data.aggregateId || applied.revision !== String(ref.data.reputationRevision)))
        throw new Error(`Conflicting event identity ${ref.eventId}`);
      const event = applied ? null : await this.fetchEvent(ref);
      events.push({
        event_id: ref.eventId,
        aggregate_id: ref.data.aggregateId,
        revision: String(ref.data.reputationRevision),
        payload: event,
        payload_hash: event ? eventHash(event) : null,
        bytes: ref.data.payloadBytes,
      });
    }
    await this.storeReplayItems(job, events, advance);
  }

  private async storeReplayItems(job: PreviewJob, events: StagedReplayItem[], advance: number) {
    await this.transactions.run(async (m) => {
      const [current] = await this.repository.lockPreviewLease(m, job.id, job.lease);
      if (!current) return;
      let bytes = Number(current.staged_bytes);
      for (const event of events) {
        const [staged] = await this.repository.stageReplayItem(
          m,
          job.id,
          event.event_id,
          event.aggregate_id,
          Number(event.revision),
          event.payload ? JSON.stringify(event.payload) : null,
          event.payload_hash,
        );
        if (staged?.stored_payload) {
          bytes += event.bytes;
          if (bytes > MAX_REPLAY_BYTES)
            throw new Error("Replay preview exceeds the staging size limit. Use recovery for individual discussions.");
        }
      }
      await this.repository.advanceReplay(m, job.id, advance, bytes);
    });
  }

  private async stagePrerequisite(job: PreviewJob, { aggregateId, revision }: ReplayRevision) {
    const path = `journal?aggregateId=${aggregateId}&after=${BigInt(revision) - 1n}&through=${revision}`;
    const response = await this.requestSource(path).catch((error: unknown) => {
      if (error instanceof SourceHistoryMissing) return { data: [] };
      throw error;
    }) as { data: SourceReference[] };
    const reference = response.data?.[0];
    if (reference?.data.aggregateId === aggregateId && String(reference.data.reputationRevision) === revision) {
      await this.stageReplayBatch(job, [reference], 0);
      return true;
    }
    const [item] = await this.repository.findInboxPrerequisite(aggregateId, revision);
    if (!item?.payload || !item.payload_hash || !/^[0-9a-f]{64}$/.test(item.payload_hash)) return false;
    validateEvent(item.payload);
    if (item.payload.eventId !== item.event_id || item.payload.data.aggregateId !== aggregateId ||
        String(item.payload.data.reputationRevision) !== revision)
      throw new Error("Inbox prerequisite identity mismatch");
    // The inbox stores the verified original hash. JSONB can reorder object keys.
    await this.storeReplayItems(job, [{ ...item, bytes: Buffer.byteLength(JSON.stringify(item.payload)) }], 0);
    return true;
  }

  private async finishPreview(job: PreviewJob, findings: ReplayFinding[]) {
    await this.repository.finishPreview(
      job.id,
      job.lease,
      findings.length ? "needs_intervention" : "preview_ready",
      JSON.stringify(findings),
      findings[0]?.message ?? null,
      !findings.length,
    );
  }

  private async previewTick() {
    const [job] = await this.repository.claimPreview();
    if (!job) return;
    try {
      if (job.cursor < job.total_events) {
        const page = await this.requestSource(`exports/${job.export_id}?offset=${job.cursor}`) as {
          data: SourceReference[]; total: number; nextOffset: number;
        };
        if (!Array.isArray(page.data) || !page.data.length || page.total !== job.total_events ||
          page.nextOffset !== job.cursor + page.data.length || page.nextOffset > page.total)
          throw new Error("Export page mismatch");
        const batch = page.data.slice(0, REPLAY_BATCH);
        await this.stageReplayBatch(job, batch, batch.length);
        return;
      }

      const findings = await this.transactions.repeatableRead(async (m) =>
        this.engine.replay(m, await this.repository.listReplayItems(m, job.id), false, this.quotaEvidence(job.scope)),
      );
      const gap = findings.find((finding) => finding.kind === "missing_revision");
      if (gap?.revisions?.[0] && await this.stagePrerequisite(job, gap.revisions[0])) return;
      await this.finishPreview(job, findings);
    } catch (error) {
      await this.finishPreview(job, [{ kind: "state", message: String(error).slice(0, 1000) }]);
    }
  }

  private async applyReplay() {
    await this.transactions.run(async (m) => {
      const [job] = await this.repository.lockNextReplay(m);
      if (!job) return;
      await this.repository.savepointForReplay(m);
      let findings: ReplayFinding[];
      try {
        findings = await this.engine.replay(m, await this.repository.listReplayItems(m, job.id), true, this.quotaEvidence(job.scope));
      } catch (error) {
        await this.repository.rollbackReplay(m);
        findings = [{ kind: "state", message: String(error).slice(0, 1000) }];
      }
      if (!findings.length)
        await this.repository.clearReplayPayloads(m, job.id);
      await this.repository.finishReplay(
        m,
        job.id,
        findings.length ? "needs_intervention" : "completed",
        JSON.stringify(findings),
        findings[0]?.message ?? null,
      );
    });
  }
  async tickReplay() {
    await this.previewTick();
    await this.applyReplay();
  }
  async tick() {
    {
      const rows = await this.repository.claimReferences();
      for (const row of rows) {
        try {
          await this.engine.receive(
            await this.fetchEvent(row.manifest),
            row.silent,
          );
          await this.repository.markReferenceApplied(row.event_id, row.claim_token);
        } catch (e) {
          const exhausted =
            e instanceof SourceHistoryMissing || row.attempts >= 7;
          await this.repository.recordReferenceFailure(
            row.event_id,
            row.claim_token,
            String(e).slice(0, 1000),
            exhausted ? "needs_intervention" : "pending",
          );
        }
      }
    }
    // Persist gaps detected from V1/V2 independently of the receiving connection.
    const pending = await this.repository.findAggregatesWithGaps();
    for (const row of pending) await this.engine.detectGap(row.aggregate_id);
    {
      const gaps = await this.repository.claimGaps();
      for (const gap of gaps) {
        try {
          const after = Number(gap.expected_revision) - 1,
            through = Number(gap.through_revision);
          const response = (await this.requestSource(
            `journal?aggregateId=${gap.aggregate_id}&after=${after}&through=${through}`,
          )) as { data: SourceReference[]; nextRevision: number };
          if (!Array.isArray(response.data) || !response.data.length)
            throw new SourceHistoryMissing(
              "Missing revisions are outside retained journal history",
            );
          let expected = after + 1;
          for (const ref of response.data) {
            validateReference(ref);
            if (
              ref.data.aggregateId !== gap.aggregate_id ||
              ref.data.reputationRevision !== expected ||
              expected > through
            )
              throw new SourceHistoryMissing(
                "Source journal contains a revision gap",
              );
            const [mode] = await this.repository.findGapNotificationMode(gap.aggregate_id);
            await this.engine.receive(await this.fetchEvent(ref), mode.silent);
            expected++;
          }
          // Engine.receive also updates this gap, so do not hold the same row lock across it.
          await this.repository.rescheduleGap(gap.aggregate_id, gap.expected_revision, gap.claimed_until);
        } catch (e) {
          await this.repository.recordGapFailure(
            gap.aggregate_id,
            String(e).slice(0, 1000),
            e instanceof SourceHistoryMissing || gap.attempts >= 7
                ? "needs_intervention"
                : "pending",
            gap.expected_revision,
            gap.claimed_until,
          );
        }
      }
    }
  }
}
