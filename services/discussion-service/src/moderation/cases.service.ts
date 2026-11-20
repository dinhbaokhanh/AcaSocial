import { ConflictException, ForbiddenException, Injectable, OnModuleDestroy, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { authenticated, lockPost, requireReadable } from '../common/content-policy';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import { RoomsService } from '../rooms/rooms.service';
import type { ReportDto } from './cases.controller';

@Injectable()
export class CasesService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private readonly logger = new Logger(CasesService.name);
  constructor(private readonly db: DataSource, private readonly rooms: RoomsService, private readonly config: ConfigService) {}
  onModuleInit() { this.timer = setInterval(() => { void this.tick().catch(() => this.logger.error(JSON.stringify({ event: 'ai.worker.error', code: 'DATABASE_ERROR' }))); }, 3000); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async scope(user: GatewayUser) {
    authenticated(user);
    if (['admin', 'moderator'].includes(user.role ?? '')) return null;
    const ids = await this.rooms.managedRoomIds(user);
    if (!ids.length) throw new ForbiddenException('Room manager role required');
    return ids;
  }
  async report(user: GatewayUser, dto: ReportDto) {
    const actor = authenticated(user);
    return this.db.transaction(async m => {
      const post = await lockPost(m, dto.entityId, false);
      requireReadable(post, user);
      if (post.roomId) await this.rooms.findOne(post.roomId, user);
      if (post.pendingRevision) throw new ConflictException('A revision is awaiting review; reload after moderation');
      if (post.contentVersion !== dto.contentVersion) throw new ConflictException('Content changed; reload before reviewing');
      // The post lock serializes case creation and counters for this target.
      const [duplicate] = await m.query('SELECT id FROM content_reports WHERE entity_id=$1 AND reporter_id=$2 AND content_version=$3', [post.id, actor, dto.contentVersion]);
      if (duplicate) return { accepted: true };
      const [{ count }] = await m.query("SELECT count(*) FROM content_reports WHERE reporter_id=$1 AND created_at > now()-interval '1 hour'", [actor]);
      if (Number(count) >= 30) throw new BadRequestException('Report limit reached');
      let [item] = await m.query("SELECT id FROM moderation_cases WHERE entity_type='discussion' AND entity_id=$1 AND content_version=$2 AND status IN ('open','claimed') FOR UPDATE", [post.id, dto.contentVersion]);
      if (!item) {
        [item] = await m.query("INSERT INTO moderation_cases(entity_type,entity_id,content_version,report_count) VALUES ('discussion',$1,$2,0) RETURNING id", [post.id, dto.contentVersion]);
        await m.query('INSERT INTO ai_moderation_jobs(case_id,content_version,title,content) VALUES ($1,$2,$3,$4)', [item.id, post.contentVersion, post.title, post.content]);
      }
      await m.query("INSERT INTO content_reports(entity_type,entity_id,reporter_id,content_version,reason_code,details,case_id) VALUES ('discussion',$1,$2,$3,$4,$5,$6)", [post.id, actor, dto.contentVersion, dto.reasonCode, dto.details ?? '', item.id]);
      await m.query('UPDATE moderation_cases SET report_count=report_count+1 WHERE id=$1', [item.id]);
      await m.query(`INSERT INTO moderation_audit_logs(case_id,entity_type,entity_id,actor_id,action,metadata)
        VALUES ($1,'discussion',$2,$3,'report.created','{}')`, [item.id, post.id, actor]);
      return { accepted: true };
    });
  }
  async list(user: GatewayUser, status: string, page = 1, roomId?: string, reason?: string) {
    const scope = await this.scope(user);
    if (!['open', 'claimed', 'resolved'].includes(status)) throw new BadRequestException('Invalid status');
    if (!Number.isInteger(page) || page < 1 || page > 100000) throw new BadRequestException('Invalid page');
    if (roomId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId)) throw new BadRequestException('Invalid room');
    if (reason && !['spam','harassment','hate','threat','privacy','other'].includes(reason)) throw new BadRequestException('Invalid reason');
    return this.db.query(`SELECT c.*, p.title, p.content, p.moderation_status, p.pending_revision, p.content_version AS current_version,
      j.state AS ai_state, j.result AS ai_result, j.error_code AS ai_error,
      j.title AS analyzed_title, j.content AS analyzed_content,
      (SELECT jsonb_agg(jsonb_build_object('reason',r.reason_code,'details',r.details)) FROM content_reports r WHERE r.case_id=c.id) AS reports
      FROM moderation_cases c JOIN discussions p ON p.id=c.entity_id
      LEFT JOIN ai_moderation_jobs j ON j.case_id=c.id
      WHERE c.status=$1 AND p.deleted_at IS NULL AND ($2::uuid[] IS NULL OR p.room_id=ANY($2::uuid[]))
      AND ($3::uuid IS NULL OR p.room_id=$3) AND ($4::text IS NULL OR EXISTS (SELECT 1 FROM content_reports r WHERE r.case_id=c.id AND r.reason_code=$4))
      ORDER BY c.created_at,c.id LIMIT 30 OFFSET $5`, [status, scope, roomId ?? null, reason ?? null, (page - 1) * 30]);
  }
  async claim(user: GatewayUser, id: string) {
    const scope = await this.scope(user);
    return this.db.transaction(async m => {
    const rows = await m.query(`UPDATE moderation_cases c SET status='claimed',assigned_to=$2,claimed_at=now()
      FROM discussions p WHERE c.id=$1 AND c.entity_id=p.id AND p.deleted_at IS NULL
      AND c.status='open' AND ($3::uuid[] IS NULL OR p.room_id=ANY($3::uuid[])) RETURNING c.id`, [id, user.id, scope]);
    if (!rows[0]?.length) throw new ConflictException('Case unavailable');
    await m.query(`INSERT INTO moderation_audit_logs(case_id,entity_type,entity_id,actor_id,action,metadata)
      SELECT id,entity_type,entity_id,$2,'case.claimed','{}' FROM moderation_cases WHERE id=$1`, [id, user.id]);
    return { claimed: true };
    });
  }
  private async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.db.query("UPDATE ai_moderation_jobs SET state='failed',error_code='LEASE_EXHAUSTED' WHERE state='processing' AND lease_until<now() AND attempts>=3");
      const [jobs] = await this.db.transaction(m => m.query(`WITH picked AS (
        SELECT id FROM ai_moderation_jobs WHERE (state='pending' AND available_at<=now())
        OR (state='processing' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
        UPDATE ai_moderation_jobs j SET state='processing',attempts=attempts+1,lease_until=now()+interval '90 seconds'
        FROM picked WHERE j.id=picked.id RETURNING j.*`));
      const job = jobs[0];
      if (!job) return;
      const startedAt = Date.now();
      try {
        const [current] = await this.db.query(`SELECT p.id FROM moderation_cases c JOIN discussions p ON p.id=c.entity_id
          WHERE c.id=$1 AND c.status IN ('open','claimed') AND p.content_version=$2 AND p.deleted_at IS NULL`, [job.case_id, job.content_version]);
        if (!current) {
          await this.db.query("UPDATE ai_moderation_jobs SET state='stale',lease_until=NULL WHERE id=$1 AND attempts=$2", [job.id, job.attempts]);
          return;
        }
        const response = await fetch(`${this.config.get('AI_SERVICE_URL', 'http://localhost:8087')}/internal/ai/moderate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Internal-Token': this.config.get('INTERNAL_SERVICE_TOKEN', '') },
          body: JSON.stringify({ title: job.title, content: job.content, policyVersion: job.policy_version }), signal: AbortSignal.timeout(45000),
        });
        if (!response.ok) throw new Error('AI_UNAVAILABLE');
        const result = await response.json();
        if (!['completed','uncertain'].includes(result.status) || !['allow','review','hide'].includes(result.recommendedAction) || !Array.isArray(result.categories)) throw new Error('INVALID_RESULT');
        await this.db.transaction(async m => {
        const updated = await m.query(`UPDATE ai_moderation_jobs j SET state=CASE WHEN EXISTS (
          SELECT 1 FROM moderation_cases c JOIN discussions p ON p.id=c.entity_id
          WHERE c.id=j.case_id AND c.status IN ('open','claimed') AND p.content_version=j.content_version AND p.deleted_at IS NULL)
          THEN 'succeeded' ELSE 'stale' END, result=$3,lease_until=NULL,error_code=NULL WHERE id=$1 AND attempts=$2 RETURNING state`, [job.id, job.attempts, JSON.stringify(result)]);
        if (updated[0]?.[0]?.state === 'succeeded') await m.query(`INSERT INTO ai_inference_runs
          (id,inference_id,entity_type,entity_id,content_version,model_version,policy_version,recommended_action,raw_result)
          SELECT $1,$1,'discussion',c.entity_id,$2,$3,$4,$5,$6 FROM moderation_cases c WHERE c.id=$7
          ON CONFLICT (inference_id) DO NOTHING`, [job.id, job.content_version, result.modelVersion, job.policy_version, result.recommendedAction, JSON.stringify(result), job.case_id]);
        });
        this.logger.log(JSON.stringify({ event: 'ai.job.finished', jobId: job.id, attempt: job.attempts, durationMs: Date.now() - startedAt }));
      } catch {
        this.logger.warn(JSON.stringify({ event: 'ai.job.failed', jobId: job.id, attempt: job.attempts, durationMs: Date.now() - startedAt, code: 'AI_UNAVAILABLE' }));
        await this.db.query("UPDATE ai_moderation_jobs SET state=CASE WHEN attempts>=3 THEN 'failed' ELSE 'pending' END,available_at=now()+interval '30 seconds',lease_until=NULL,error_code='AI_UNAVAILABLE' WHERE id=$1 AND attempts=$2", [job.id, job.attempts]);
      }
    } finally { this.busy = false; }
  }
}
