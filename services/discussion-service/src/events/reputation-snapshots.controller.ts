import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsDateString, IsIn, IsOptional, IsUUID, Matches, ValidateNested } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { reputationJournalRetentionDays } from './reputation-journal-retention';

class ExportScopeDto {
  @IsOptional() @IsUUID() aggregateId?: string;
  @IsOptional() @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) fromDate?: string;
  @IsOptional() @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) toDate?: string;
}

const MAX_EXPORT_EVENTS = 10_000;
const MAX_REPLAY_CANDIDATES = 500;

class ReplayQuotaBucketDto {
  @IsUUID() userId: string;
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) day: string;
  @IsIn(['upvote', 'publication']) category: 'upvote' | 'publication';
}

class ReplayQuotaRequestDto {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => ReplayQuotaBucketDto)
  buckets: ReplayQuotaBucketDto[];
}

const exportFilter = `FROM reputation_journal j
  WHERE ($1::uuid IS NULL OR j.aggregate_id=$1)
    AND ($2::date IS NULL OR j.created_at>=($2::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))
    AND ($3::date IS NULL OR j.created_at<(($3::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))`;

@Controller('internal/reputation')
export class ReputationSnapshotsController {
  constructor(private db: DataSource, private config: ConfigService = new ConfigService()) {}
  @Post('exports')
  async createExport(@Body() scope: ExportScopeDto = {}) {
    const { aggregateId, fromDate, toDate } = scope ?? {};
    if (Boolean(fromDate) !== Boolean(toDate) || (fromDate && toDate && fromDate > toDate))
      throw new BadRequestException('A valid start and end date are required for a date range');
    const params = [aggregateId ?? null, fromDate ?? null, toDate ?? null];
    return this.db.transaction('REPEATABLE READ', async (m) => {
      const [{ count }] = await m.query<{ count: string }[]>(
        `SELECT count(*) FROM (SELECT 1 ${exportFilter} LIMIT $4) AS selected`,
        [...params, MAX_EXPORT_EVENTS + 1],
      );
      if (Number(count) > MAX_EXPORT_EVENTS)
        throw new BadRequestException(
          'Replay selection exceeds 10000 events. Select a discussion or a smaller date range.',
        );
      const [row] = await m.query<{ id: string }[]>(
        `INSERT INTO reputation_exports(manifests) SELECT coalesce(jsonb_agg(jsonb_build_object('eventId',j.event_id,'eventType','reputation.content.changed','data',reputation_journal_manifest(j)) ORDER BY j.aggregate_id,j.revision),'[]'::jsonb) ${exportFilter} RETURNING id`,
        params,
      );
      return {
        exportId: row.id,
        totalEvents: Number(count),
        policy: 'retained-post-cutover-events-only',
        expiresHours: 24,
        scope: {
          aggregateId: aggregateId ?? undefined,
          fromDate: fromDate ?? undefined,
          toDate: toDate ?? undefined,
        },
      };
    });
  }

  @Post('replay-candidates')
  async replayCandidates(@Body() request: ReplayQuotaRequestDto) {
    // Use the same business dates as the scoring engine, not the export's
    // created_at filter. One reward can appear in several revisions.
    const retention = reputationJournalRetentionDays(
      this.config.get('REPUTATION_JOURNAL_RETENTION_DAYS', '90'),
    );
    const [{ data, incomplete }] = await this.db.query<{ data: unknown[]; incomplete: boolean }[]>(
      `WITH buckets AS (
        SELECT DISTINCT * FROM jsonb_to_recordset($1::jsonb) AS b("userId" text, day date, category text)
      ), coverage AS (
        SELECT EXISTS(
          SELECT 1 FROM buckets
          WHERE (day::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') < now()-$3::double precision * interval '1 day'
        ) AS incomplete
      ), matches AS (
        SELECT DISTINCT ON (r.value->>'key', b.day) j.event_id AS "eventId",
          j.aggregate_id AS "aggregateId", j.revision::text AS revision,
          r.value->>'key' AS "rewardKey", b."userId", r.value->>'actorId' AS "actorId",
          b.day::text AS day, b.category, coalesce(r.value->>'courseId','general') AS scope,
          j.payload_text::jsonb->>'occurredAt' AS "occurredAt"
        FROM reputation_journal j
        CROSS JOIN LATERAL jsonb_array_elements(j.payload_text::jsonb->'rewards') r
        JOIN buckets b ON b."userId"=r.value->>'beneficiaryId'
          AND b.category=r.value->>'category'
          AND b.day=(((CASE WHEN b.category='upvote' THEN j.payload_text::jsonb->>'occurredAt'
                          ELSE r.value->>'occurredAt' END)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
        WHERE r.value->>'eligible'='true'
          AND (b.category='publication' OR r.value->>'actorId'<>b."userId")
          AND NOT (SELECT incomplete FROM coverage)
        ORDER BY r.value->>'key', b.day, j.revision
        LIMIT $2
      )
      SELECT incomplete,coalesce((SELECT jsonb_agg(m) FROM matches m),'[]'::jsonb) AS data FROM coverage`,
      [JSON.stringify(request.buckets), MAX_REPLAY_CANDIDATES + 1, retention],
    );
    return { data: data.slice(0, MAX_REPLAY_CANDIDATES), limited: data.length > MAX_REPLAY_CANDIDATES, incomplete };
  }
  @Get('exports/:id')
  async exportPage(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('offset') rawOffset = '0',
  ) {
    const offset = Number(rawOffset);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > MAX_EXPORT_EVENTS)
      throw new BadRequestException('Invalid export offset');
    const [row] = await this.db.query<{ data: unknown[]; total: number }[]>(
      `SELECT (SELECT coalesce(jsonb_agg(e.value ORDER BY e.ordinality),'[]'::jsonb) FROM jsonb_array_elements(manifests) WITH ORDINALITY e WHERE e.ordinality>$2 AND e.ordinality<=$2+50) AS data,jsonb_array_length(manifests) AS total FROM reputation_exports WHERE id=$1 AND created_at>now()-interval '1 day'`,
      [id, offset],
    );
    if (!row) throw new NotFoundException('Export expired');
    return { ...row, nextOffset: offset + row.data.length };
  }
  @Get('journal')
  async journal(
    @Query('aggregateId') aggregateId: string,
    @Query('after') rawAfter = '0',
    @Query('through') rawThrough?: string,
  ) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        aggregateId ?? '',
      )
    )
      throw new BadRequestException('Invalid aggregate');
    const after = Number(rawAfter),
      through =
        rawThrough === undefined ? Number.MAX_SAFE_INTEGER : Number(rawThrough);
    if (
      !Number.isSafeInteger(after) ||
      after < 0 ||
      !Number.isSafeInteger(through) ||
      through < after
    )
      throw new BadRequestException('Invalid revision range');
    return this.db.transaction('REPEATABLE READ', async (m) => {
      const rows = await m.query<
        { event_id: string; revision: string; data: unknown }[]
      >(
        `SELECT event_id,revision,reputation_journal_manifest(j) AS data FROM reputation_journal j
        WHERE aggregate_id=$1 AND revision>$2 AND revision<=$3 ORDER BY revision LIMIT 50`,
        [aggregateId, after, through],
      );
      return {
        data: rows.map((r) => ({
          eventId: r.event_id,
          eventType: 'reputation.content.changed',
          data: r.data,
        })),
        nextRevision: rows.length
          ? Number(rows[rows.length - 1].revision)
          : after,
      };
    });
  }
  @Get('journal/:eventId')
  async chunk(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query('offset') rawOffset = '0',
  ) {
    const offset = Number(rawOffset);
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw new BadRequestException('Invalid payload offset');
    const [row] = await this.db.query<
      { chunk: string; characters: number; bytes: number; hash: string }[]
    >(
      `SELECT substring(payload_text FROM $2::integer+1 FOR 16384) AS chunk,char_length(payload_text) AS characters,octet_length(payload_text) AS bytes,payload_hash AS hash FROM reputation_journal WHERE event_id=$1`,
      [eventId, offset],
    );
    if (!row) throw new NotFoundException('Journal event no longer available');
    return {
      ...row,
      offset,
      nextOffset: offset + Array.from(row.chunk).length,
    };
  }
  @Get('snapshots')
  async snapshots(@Query('after') after?: string) {
    if (
      after &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        after,
      )
    )
      throw new BadRequestException('Invalid cursor');
    return this.db.transaction('REPEATABLE READ', async (m) => {
      const rows = await m.query<{ discussion_id: string; revision: string }[]>(
        'SELECT discussion_id,revision FROM reputation_aggregates WHERE ($1::uuid IS NULL OR discussion_id>$1) ORDER BY discussion_id LIMIT 100',
        [after ?? null],
      );
      const data: unknown[] = [];
      for (const row of rows) {
        const [snapshot] = await m.query<
          { payload: Record<string, unknown> }[]
        >('SELECT reputation_snapshot($1) AS payload', [row.discussion_id]);
        data.push({
          ...snapshot.payload,
          reputationRevision: Number(row.revision),
        });
      }
      return {
        data,
        nextCursor:
          rows.length === 100 ? rows[rows.length - 1].discussion_id : null,
      };
    });
  }
}
