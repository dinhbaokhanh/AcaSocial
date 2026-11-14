import { enqueueRoomNotification } from './room-notifications';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { authenticated } from '../common/content-policy';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import { Room, RoomStatus, RoomVisibility } from './room.entity';
import { RoomsService } from './rooms.service';
import { CancelClosureDto, ClosureScheduleDto } from './room.dto';

export interface ScheduleRow {
  id: string;
  room_id: string;
  close_at: Date;
  reason: string;
  status: 'pending' | 'completed' | 'cancelled';
  version: number;
  updated_by: string;
}
interface DeliveryRow {
  id: string;
  schedule_id: string;
  schedule_version: number;
  event_type: string;
  recipient_id: string;
  room_id: string;
  payload: Record<string, unknown>;
}
export interface AnnouncementRow {
  id: string;
  room_id: string;
  close_at: Date;
  reason: string;
  version: number;
  name: string;
  slug: string;
  visibility: string;
}
@Injectable()
export class RoomLifecycleService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  private logger = new Logger(RoomLifecycleService.name);
  constructor(
    private db: DataSource,
    private config: ConfigService,
    private rooms: RoomsService,
  ) {}
  onModuleInit() {
    if (this.config.get('ROOM_LIFECYCLE_ENABLED', 'true') !== 'true') return;
    const tick = () => {
      if (!this.pending)
        this.pending = this.tick()
          .catch((e) => this.logger.error(String(e)))
          .finally(() => {
            this.pending = undefined;
          });
    };
    this.timer = setInterval(tick, 30000);
    tick();
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.pending;
  }
  private admin(user: GatewayUser) {
    const actor = authenticated(user);
    if (user.role !== 'admin')
      throw new ForbiddenException('Admin role required');
    return actor;
  }
  private async lockRoom(m: EntityManager, id: string) {
    const room = await m.findOne(Room, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }
  async current(id: string, user: GatewayUser) {
    const room = await this.rooms.findOne(id, user);
    if (
      room.visibility !== RoomVisibility.PUBLIC &&
      !['admin', 'moderator'].includes(user.role ?? '')
    ) {
      const permitted = user.id
        ? await this.db.query<unknown[]>(
            "SELECT 1 FROM room_memberships WHERE room_id=$1 AND user_id=$2 AND status='active' AND (expires_at IS NULL OR expires_at>now())",
            [id, user.id],
          )
        : [];
      if (!permitted.length) throw new NotFoundException('Room not found');
    }
    const rows = await this.db.query<ScheduleRow[]>(
      `SELECT * FROM room_lifecycle_schedules WHERE room_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }
  async schedule(
    id: string,
    dto: ClosureScheduleDto,
    user: GatewayUser,
    update = false,
  ) {
    const actor = this.admin(user);
    if (this.config.get('ROOM_LIFECYCLE_ENABLED', 'true') !== 'true')
      throw new BadRequestException('Room lifecycle is disabled');
    const hours = Number(
      this.config.get('ROOM_CLOSURE_MIN_NOTICE_HOURS', '168'),
    );
    if (!Number.isFinite(hours) || hours < 0)
      throw new BadRequestException('Invalid notice configuration');
    return this.db.transaction(async (m) => {
      const room = await this.lockRoom(m, id);
      if (room.status !== RoomStatus.ACTIVE)
        throw new ConflictException('Only active rooms can be scheduled');
      const [{ valid }] = await m.query<{ valid: boolean }[]>(
        `SELECT $1::timestamptz >= clock_timestamp() + $2 * interval '1 hour' AS valid`,
        [dto.closeAt, hours],
      );
      if (!valid)
        throw new BadRequestException(
          `Room closure requires at least ${hours} hours notice`,
        );
      const [before] = await m.query<ScheduleRow[]>(
        `SELECT * FROM room_lifecycle_schedules WHERE room_id=$1 AND status='pending' FOR UPDATE`,
        [id],
      );
      if (update ? !before || before.version !== dto.expectedVersion : !!before)
        throw new ConflictException('Schedule changed; reload before editing');
      if (before && new Date(before.close_at) <= new Date())
        throw new ConflictException('Closure deadline has passed');
      const [after] = update
        ? await m.query<ScheduleRow[]>(
            `WITH updated AS (UPDATE room_lifecycle_schedules SET close_at=$2,reason=$3,version=version+1,updated_by=$4,updated_at=now() WHERE id=$1 RETURNING *) SELECT * FROM updated`,
            [before.id, dto.closeAt, dto.reason, actor],
          )
        : await m.query<ScheduleRow[]>(
            `INSERT INTO room_lifecycle_schedules(room_id,close_at,reason,created_by,updated_by) VALUES($1,$2,$3,$4,$4) RETURNING *`,
            [id, dto.closeAt, dto.reason, actor],
          );
      await m.update(Room, id, { closureAt: dto.closeAt });
      const eventType = update
        ? 'room.closure.rescheduled'
        : 'room.closure.scheduled';
      await this.audit(m, id, actor, eventType, before ?? null, after);
      await this.enqueue(m, room, after, eventType, actor);
      return after;
    });
  }
  async cancel(id: string, dto: CancelClosureDto, user: GatewayUser) {
    const actor = this.admin(user);
    return this.db.transaction(async (m) => {
      const room = await this.lockRoom(m, id);
      const [before] = await m.query<ScheduleRow[]>(
        `SELECT * FROM room_lifecycle_schedules WHERE room_id=$1 AND status='pending' FOR UPDATE`,
        [id],
      );
      if (!before || before.version !== dto.expectedVersion)
        throw new ConflictException('Schedule changed; reload before editing');
      const [{ expired }] = await m.query<{ expired: boolean }[]>(
        'SELECT $1::timestamptz <= clock_timestamp() AS expired',
        [before.close_at],
      );
      if (expired) throw new ConflictException('Closure deadline has passed');
      const [after] = await m.query<ScheduleRow[]>(
        `WITH updated AS (UPDATE room_lifecycle_schedules SET status='cancelled',version=version+1,updated_by=$2,updated_at=now() WHERE id=$1 RETURNING *) SELECT * FROM updated`,
        [before.id, actor],
      );
      await m.update(Room, id, { closureAt: null });
      await this.audit(m, id, actor, 'room.closure.cancelled', before, {
        ...after,
        cancellationReason: dto.reason,
      });
      await this.enqueue(m, room, after, 'room.closure.cancelled', actor);
      return after;
    });
  }
  async announcements(user: GatewayUser, page = 1) {
    authenticated(user);
    const rows = await this.db.query<AnnouncementRow[]>(
      `SELECT s.id,s.room_id,s.close_at,s.reason,s.version,r.name,r.slug,r.visibility FROM room_lifecycle_schedules s JOIN rooms r ON r.id=s.room_id
      WHERE s.status='pending' AND (r.visibility='public' OR $1::text='admin' OR $1::text='moderator' OR EXISTS(SELECT 1 FROM room_memberships m WHERE m.room_id=r.id AND m.user_id=$2 AND m.status='active' AND (m.expires_at IS NULL OR m.expires_at>now())))
      ORDER BY s.close_at,s.id LIMIT 20 OFFSET $3`,
      [user.role, user.id, (page - 1) * 20],
    );
    return rows;
  }
  async audit(
    m: EntityManager,
    id: string,
    actor: string,
    action: string,
    before: unknown,
    after: unknown,
  ) {
    await m.query(
      'INSERT INTO catalog_audits(entity_id,actor_id,action,before,after) VALUES($1,$2,$3,$4,$5)',
      [id, actor, action, JSON.stringify(before), JSON.stringify(after)],
    );
  }
  async enqueue(
    m: EntityManager,
    room: Room,
    schedule: { id: string; version: number; close_at: Date },
    eventType: string,
    actor: string,
  ) {
    return enqueueRoomNotification(m, room, schedule, eventType, actor);
  }

  async tick() {
    await this.db.transaction(async (m) => {
      const rooms = await m.query<{ id: string }[]>(
        `SELECT r.id FROM rooms r WHERE r.status='active' AND r.closure_at<=now() ORDER BY r.closure_at LIMIT 20 FOR UPDATE OF r SKIP LOCKED`,
      );
      for (const { id } of rooms) {
        const room = await m.findOneByOrFail(Room, { id });
        const [before] = await m.query<ScheduleRow[]>(
          `SELECT * FROM room_lifecycle_schedules WHERE room_id=$1 AND status='pending' AND close_at<=now() FOR UPDATE`,
          [id],
        );
        if (!before) continue;
        if (Date.now() - new Date(before.close_at).getTime() > 120000)
          this.logger.warn(`Overdue room closure ${before.id}`);
        await m.update(Room, id, {
          status: RoomStatus.READ_ONLY,
          metadataVersion: room.metadataVersion + 1,
        });
        const [after] = await m.query<ScheduleRow[]>(
          `WITH updated AS (UPDATE room_lifecycle_schedules SET status='completed',completed_at=now(),updated_at=now() WHERE id=$1 RETURNING *) SELECT * FROM updated`,
          [before.id],
        );
        await this.audit(
          m,
          id,
          before.updated_by,
          'room.closed',
          before,
          after,
        );
        await this.enqueue(m, room, after, 'room.closed', before.updated_by);
      }
    });
    await this.db.transaction(async (m) => {
      const deliveries = await m.query<DeliveryRow[]>(
        `SELECT * FROM room_notification_deliveries WHERE delivered_at IS NULL ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`,
      );
      for (const delivery of deliveries) {
        // Recheck permission before dispatch; room-sensitive text is never put in notifications.
        await m.query(
          `INSERT INTO discussion_outbox(id,event_type,payload)
          SELECT $1,$2,$3::jsonb || jsonb_build_object('recipientId',$4::uuid::text)
          WHERE NOT EXISTS(SELECT 1 FROM room_lifecycle_schedules s WHERE s.id=$6 AND s.version<>$7) AND EXISTS(SELECT 1 FROM rooms r WHERE r.id=$5 AND (r.visibility='public' OR EXISTS(SELECT 1 FROM room_memberships x WHERE x.room_id=r.id AND x.user_id=$4 AND x.status='active' AND (x.expires_at IS NULL OR x.expires_at>now()))))
          ON CONFLICT DO NOTHING`,
          [
            delivery.id,
            delivery.event_type,
            JSON.stringify(delivery.payload),
            delivery.recipient_id,
            delivery.room_id,
            delivery.schedule_id,
            delivery.schedule_version,
          ],
        );
        await m.query(
          'UPDATE room_notification_deliveries SET delivered_at=now() WHERE id=$1',
          [delivery.id],
        );
      }
    });
  }
}
