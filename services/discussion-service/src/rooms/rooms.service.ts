import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import { authenticated } from '../common/content-policy';
import { AcademicReferenceService } from '../common/academic-reference.service';
import { OutboxService } from '../events/outbox.service';
import {
  CreateRoomDto,
  CreateRoomRuleDto,
  UpdateMembershipDto,
  UpdateRoomStatusDto,
  UpdateRoomPolicyDto,
} from './room.dto';
import {
  PostingPolicy,
  Room,
  RoomAcademicBinding,
  RoomMembership,
  RoomRule,
  RoomStatus,
  RoomType,
  RoomVisibility,
} from './room.entity';

@Injectable()
export class RoomsService {
  constructor(
    private readonly db: DataSource,
    private readonly academic: AcademicReferenceService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateRoomDto, user: GatewayUser) {
    const actor = authenticated(user);
    if (
      [RoomType.MAJOR, RoomType.COURSE].includes(dto.roomType) &&
      user.role !== 'admin'
    )
      throw new ForbiddenException(
        'Only admins create canonical academic rooms',
      );
    if (dto.startAt && dto.endAt && dto.endAt <= dto.startAt)
      throw new BadRequestException('endAt must be after startAt');

    const parent = dto.parentRoomId
      ? await this.db.getRepository(Room).findOneBy({ id: dto.parentRoomId })
      : null;
    if (dto.parentRoomId && !parent)
      throw new BadRequestException('Parent room not found');
    if (dto.roomType === RoomType.COURSE && parent?.roomType !== RoomType.MAJOR)
      throw new BadRequestException(
        'Course room must be a child of a major room',
      );
    if ([RoomType.EVENT, RoomType.FORUM].includes(dto.roomType) && parent)
      await this.requireRoomManager(parent.id, user);

    let context: Awaited<
      ReturnType<AcademicReferenceService['context']>
    > | null = null;
    if (dto.roomType === RoomType.COURSE) {
      if (!dto.curriculumCourseId)
        throw new BadRequestException(
          'Course room requires curriculumCourseId',
        );
      context = await this.academic.context(dto.curriculumCourseId);
      const parentBinding = await this.binding(parent!.id);
      if (!parentBinding || parentBinding.majorId !== context.majorId)
        throw new BadRequestException(
          'Course does not belong to the parent major room',
        );
    }
    if (dto.roomType === RoomType.MAJOR && !dto.majorId)
      throw new BadRequestException('Major room requires majorId');
    if (dto.roomType === RoomType.MAJOR)
      await this.academic.major(dto.majorId!);
    if (dto.roomType === RoomType.MAJOR) {
      const existing = await this.db
        .getRepository(RoomAcademicBinding)
        .createQueryBuilder('binding')
        .innerJoin(Room, 'room', 'room.id = binding.roomId')
        .where('binding.majorId = :majorId', { majorId: dto.majorId })
        .andWhere('room.roomType = :type', { type: RoomType.MAJOR })
        .getOne();
      if (existing)
        throw new ConflictException('Canonical major room already exists');
    }
    if (dto.roomType === RoomType.COURSE) {
      const existing = await this.db
        .getRepository(RoomAcademicBinding)
        .createQueryBuilder('binding')
        .innerJoin(Room, 'room', 'room.id = binding.roomId')
        .where('binding.curriculumCourseId = :id', {
          id: dto.curriculumCourseId,
        })
        .andWhere('room.roomType = :type', { type: RoomType.COURSE })
        .getOne();
      if (existing)
        throw new ConflictException('Canonical course room already exists');
    }

    try {
      const roomId = await this.db.transaction(async (manager) => {
        const room = await manager.save(
          Room,
          manager.create(Room, {
            slug: dto.slug,
            name: dto.name,
            description: dto.description ?? '',
            roomType: dto.roomType,
            parentRoomId: dto.parentRoomId ?? null,
            visibility: dto.visibility ?? RoomVisibility.PUBLIC,
            membershipPolicy: dto.membershipPolicy ?? 'open',
            postingPolicy: dto.postingPolicy ?? PostingPolicy.ANYONE,
            reviewPolicy: dto.reviewPolicy ?? 'direct',
            status:
              dto.roomType === RoomType.EVENT &&
              dto.startAt &&
              dto.startAt > new Date()
                ? RoomStatus.DRAFT
                : RoomStatus.ACTIVE,
            createdBy: actor,
            startAt: dto.startAt ?? null,
            endAt: dto.endAt ?? null,
          }),
        );
        let binding: Partial<RoomAcademicBinding> | null = null;
        if (dto.roomType === RoomType.MAJOR)
          binding = {
            roomId: room.id,
            majorId: dto.majorId!,
            curriculumId: null,
            courseId: null,
            curriculumCourseId: null,
          };
        else if (context)
          binding = {
            roomId: room.id,
            majorId: context.majorId,
            curriculumId: context.curriculumId,
            courseId: context.courseId,
            curriculumCourseId: context.curriculumCourseId,
          };
        else if (parent) {
          const inherited = await manager.findOneBy(RoomAcademicBinding, {
            roomId: parent.id,
          });
          if (inherited)
            binding = {
              roomId: room.id,
              majorId: inherited.majorId,
              curriculumId: inherited.curriculumId,
              courseId: inherited.courseId,
              curriculumCourseId: inherited.curriculumCourseId,
            };
        }
        if (binding)
          await manager.save(
            RoomAcademicBinding,
            manager.create(RoomAcademicBinding, binding),
          );
        await manager.save(
          RoomMembership,
          manager.create(RoomMembership, {
            roomId: room.id,
            userId: actor,
            role: 'owner',
            status: 'active',
            assignedBy: actor,
            expiresAt: null,
          }),
        );
        await this.outbox.event(manager, 'room.created', {
          roomId: room.id,
          roomType: room.roomType,
        });
        return room.id;
      });
      return this.findOne(roomId, user);
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException(
          'Room slug or academic binding already exists',
        );
      throw error;
    }
  }

  async list(
    type?: RoomType,
    parentRoomId?: string,
    user: GatewayUser = { id: null, role: null },
  ) {
    const qb = this.db.getRepository(Room).createQueryBuilder('room');
    if (type) qb.andWhere('room.roomType = :type', { type });
    if (parentRoomId)
      qb.andWhere('room.parentRoomId = :parentRoomId', { parentRoomId });
    if (!['admin', 'moderator'].includes(user.role ?? '')) {
      qb.andWhere(
        `(room.visibility != :private OR EXISTS (
        SELECT 1 FROM room_memberships membership
        WHERE membership.room_id = room.id AND membership.user_id = :viewer AND membership.status = 'active'
      ))`,
        { private: RoomVisibility.PRIVATE, viewer: user.id ?? null },
      );
    }
    const rooms = await qb.orderBy('room.name', 'ASC').getMany();
    const bindings = rooms.length
      ? await this.db
          .getRepository(RoomAcademicBinding)
          .createQueryBuilder('b')
          .where('b.roomId IN (:...ids)', { ids: rooms.map((room) => room.id) })
          .getMany()
      : [];
    const managedIds = user.id ? await this.managedRoomIds(user) : [];
    const globalManager =
      !!user.id && ['admin', 'moderator'].includes(user.role ?? '');
    const ownMemberships = user.id
      ? await this.db.getRepository(RoomMembership).findBy({ userId: user.id })
      : [];
    return rooms.map((room) => ({
      ...room,
      effectivePostPermission: this.postPermission(
        room,
        ownMemberships.find((m) => m.roomId === room.id),
      ),
      canManage: globalManager || managedIds.includes(room.id),
      canConfigurePolicy:
        user.role === 'admin' ||
        ownMemberships.some(
          (m) =>
            m.roomId === room.id &&
            m.status === 'active' &&
            m.role === 'owner' &&
            (!m.expiresAt || m.expiresAt > new Date()),
        ),
      academicBinding: bindings.find((b) => b.roomId === room.id) ?? null,
    }));
  }

  async findOne(
    idOrSlug: string,
    user: GatewayUser = { id: null, role: null },
  ) {
    const repo = this.db.getRepository(Room);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const room = await repo.findOne({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (
      room.visibility === RoomVisibility.PRIVATE &&
      !['admin', 'moderator'].includes(user.role ?? '')
    ) {
      const membership = user.id
        ? await this.db
            .getRepository(RoomMembership)
            .findOneBy({ roomId: room.id, userId: user.id, status: 'active' })
        : null;
      if (!membership) throw new NotFoundException('Room not found');
    }
    return { ...room, academicBinding: await this.binding(room.id) };
  }

  async join(id: string, user: GatewayUser) {
    const actor = authenticated(user);
    const room = await this.db.getRepository(Room).findOneBy({ id });
    if (!room) throw new NotFoundException('Room not found');
    if (room.membershipPolicy === 'invite_only')
      throw new ForbiddenException('This room is invite only');
    const existing = await this.db
      .getRepository(RoomMembership)
      .findOneBy({ roomId: id, userId: actor });
    if (existing && ['active', 'pending', 'muted'].includes(existing.status))
      return existing;
    if (existing?.status === 'banned')
      throw new ForbiddenException('You are banned from this room');
    const membership =
      existing ??
      this.db
        .getRepository(RoomMembership)
        .create({ roomId: id, userId: actor });
    membership.role = 'member';
    membership.status =
      room.membershipPolicy === 'approval' ? 'pending' : 'active';
    membership.assignedBy = null;
    membership.expiresAt = null;
    return this.db.getRepository(RoomMembership).save(membership);
  }

  async assertCanPost(roomId: string, user: GatewayUser) {
    const actor = authenticated(user);
    const room = await this.db.getRepository(Room).findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== RoomStatus.ACTIVE)
      throw new ForbiddenException('Room is not accepting new posts');
    const memberships = this.db.getRepository(RoomMembership);
    let membership = await memberships.findOneBy({ roomId, userId: actor });
    if (
      !membership &&
      room.visibility === RoomVisibility.PUBLIC &&
      room.membershipPolicy === 'open' &&
      room.postingPolicy === PostingPolicy.MEMBERS
    ) {
      await memberships
        .createQueryBuilder()
        .insert()
        .values({
          roomId,
          userId: actor,
          role: 'member',
          status: 'active',
          assignedBy: null,
          expiresAt: null,
        })
        .orIgnore()
        .execute();
      membership = await memberships.findOneBy({ roomId, userId: actor });
    }
    if (membership?.expiresAt && membership.expiresAt <= new Date())
      throw new ForbiddenException('Membership expired');
    if (
      membership?.postPermission === 'blocked' ||
      membership?.status === 'banned' ||
      membership?.status === 'muted'
    )
      throw new ForbiddenException('You cannot post in this room');
    if (
      room.visibility === RoomVisibility.PRIVATE &&
      membership?.status !== 'active'
    )
      throw new ForbiddenException(
        'Active membership required for a private room',
      );
    if (
      room.postingPolicy === PostingPolicy.MEMBERS &&
      membership?.status !== 'active'
    )
      throw new ForbiddenException('Active membership required');
    if (
      room.postingPolicy === PostingPolicy.APPROVED &&
      !(
        membership?.status === 'active' &&
        ['owner', 'moderator', 'contributor'].includes(membership.role)
      )
    )
      throw new ForbiddenException('Approved contributor role required');
    return {
      room,
      binding: await this.binding(roomId),
      requiresApproval: this.postPermission(room, membership) === 'approval',
    };
  }

  async managedRoomIds(user: GatewayUser): Promise<string[]> {
    const actor = authenticated(user);
    const memberships = await this.db
      .getRepository(RoomMembership)
      .createQueryBuilder('membership')
      .where('membership.userId = :actor', { actor })
      .andWhere("membership.status = 'active'")
      .andWhere("membership.role IN ('owner', 'moderator')")
      .andWhere(
        '(membership.expiresAt IS NULL OR membership.expiresAt > CURRENT_TIMESTAMP)',
      )
      .getMany();
    return memberships.map((membership) => membership.roomId);
  }

  async requireRoomManager(roomId: string, user: GatewayUser) {
    const actor = authenticated(user);
    if (['admin', 'moderator'].includes(user.role ?? '')) return;
    const membership = await this.db
      .getRepository(RoomMembership)
      .findOneBy({ roomId, userId: actor, status: 'active' });
    if (
      !membership ||
      (membership.expiresAt && membership.expiresAt <= new Date()) ||
      !['owner', 'moderator'].includes(membership.role)
    )
      throw new ForbiddenException('Room manager role required');
  }

  async addRule(roomId: string, dto: CreateRoomRuleDto, user: GatewayUser) {
    await this.requireRoomManager(roomId, user);
    return this.db.transaction(async (manager) => {
      const room = await manager.findOne(Room, {
        where: { id: roomId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!room) throw new NotFoundException('Room not found');
      const previous = await manager.getRepository(RoomRule).findOne({
        where: { roomId, ruleCode: dto.ruleCode, active: true },
        order: { version: 'DESC' },
      });
      if (previous) {
        previous.active = false;
        await manager.save(previous);
      }
      const rule = await manager.save(
        RoomRule,
        manager.create(RoomRule, {
          roomId,
          ...dto,
          version: (previous?.version ?? 0) + 1,
          active: true,
        }),
      );
      room.rulesVersion += 1;
      await manager.save(room);
      await this.outbox.event(manager, 'room.rules.changed', {
        roomId,
        rulesVersion: room.rulesVersion,
      });
      return rule;
    });
  }

  async updateMembership(
    roomId: string,
    memberId: string,
    dto: UpdateMembershipDto,
    user: GatewayUser,
  ) {
    const actor = authenticated(user);
    await this.requireRoomManager(roomId, user);
    if (dto.postPermission !== undefined)
      await this.requirePolicyOwner(roomId, user);
    return this.db.transaction(async (m) => {
      // Serialize membership changes with room policy locking and last-owner checks.
      const room = await m.findOne(Room, {
        where: { id: roomId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!room) throw new NotFoundException('Room not found');
      const membership = await m.findOneBy(RoomMembership, {
        roomId,
        userId: memberId,
      });
      if (!membership) throw new NotFoundException('Room membership not found');
      const actorMembership = await m.findOneBy(RoomMembership, {
        roomId,
        userId: actor,
        status: 'active',
      });
      const canManageOwners =
        user.role === 'admin' ||
        (actorMembership?.role === 'owner' &&
          (!actorMembership.expiresAt ||
            actorMembership.expiresAt > new Date()));
      if (
        (membership.role === 'owner' ||
          dto.role === 'owner' ||
          dto.postPermission !== undefined) &&
        !canManageOwners
      )
        throw new ForbiddenException(
          'Chỉ chủ room và quản trị viên được cấu hình quyền đăng',
        );
      if (
        membership.role === 'owner' &&
        membership.status === 'active' &&
        (dto.role !== 'owner' || dto.status !== 'active')
      ) {
        const count = await m.countBy(RoomMembership, {
          roomId,
          role: 'owner',
          status: 'active',
        });
        if (count <= 1)
          throw new ConflictException(
            'A room must retain at least one active owner',
          );
      }
      if (
        room.policyLocked &&
        user.role !== 'admin' &&
        dto.postPermission !== undefined &&
        dto.postPermission !== membership.postPermission
      )
        throw new ForbiddenException('Chính sách đã được quản trị viên khóa');
      const before = {
        role: membership.role,
        status: membership.status,
        postPermission: membership.postPermission,
      };
      membership.role = dto.role;
      membership.status = dto.status;
      membership.assignedBy = actor;
      if (dto.postPermission !== undefined)
        membership.postPermission = dto.postPermission;
      await m.query(
        'INSERT INTO room_policy_audits (room_id, actor_id, member_id, before, after) VALUES ($1,$2,$3,$4,$5)',
        [roomId, actor, memberId, JSON.stringify(before), JSON.stringify(dto)],
      );
      return m.save(RoomMembership, membership);
    });
  }

  async updateStatus(
    roomId: string,
    dto: UpdateRoomStatusDto,
    user: GatewayUser,
  ) {
    await this.requireRoomManager(roomId, user);
    const room = await this.db.getRepository(Room).findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    room.status = dto.status as RoomStatus;
    return this.db.getRepository(Room).save(room);
  }

  postPermission(
    room: Room,
    membership?: RoomMembership | null,
  ): 'direct' | 'approval' | 'blocked' {
    if (
      membership &&
      (['banned', 'muted'].includes(membership.status) ||
        (membership.expiresAt && membership.expiresAt <= new Date()))
    )
      return 'blocked';
    if (membership?.postPermission === 'blocked') return 'blocked';
    if (
      membership?.status === 'active' &&
      membership.postPermission &&
      membership.postPermission !== 'inherit'
    )
      return membership.postPermission;
    return room.reviewPolicy === 'approval' ? 'approval' : 'direct';
  }

  async members(roomId: string, user: GatewayUser) {
    await this.requireRoomManager(roomId, user);
    const members = await this.db
      .getRepository(RoomMembership)
      .find({ where: { roomId }, order: { joinedAt: 'ASC' } });
    let profiles: { id: string; fullName: string }[] = [];
    try {
      for (let offset = 0; offset < members.length; offset += 100) {
        const response = await fetch(
          this.config.get('IDENTITY_SERVICE_URL', 'http://localhost:8081') +
            '/internal/users/display',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Token': this.config.get('INTERNAL_SERVICE_TOKEN', ''),
            },
            body: JSON.stringify({
              ids: members.slice(offset, offset + 100).map((m) => m.userId),
            }),
            signal: AbortSignal.timeout(2000),
          },
        );
        if (response.ok) {
          const batch: unknown = await response.json();
          if (Array.isArray(batch)) profiles.push(...batch);
        }
      }
    } catch {
      /* Names are optional; permission management remains available. */
    }
    return members.map((m) => ({
      ...m,
      fullName: profiles.find((p) => p.id === m.userId)?.fullName,
    }));
  }

  async policyHistory(roomId: string, user: GatewayUser) {
    await this.requireRoomManager(roomId, user);
    return this.db.query(
      'SELECT * FROM room_policy_audits WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
      [roomId],
    );
  }

  async requirePolicyOwner(roomId: string, user: GatewayUser) {
    const actor = authenticated(user);
    if (user.role === 'admin') return;
    const membership = await this.db
      .getRepository(RoomMembership)
      .findOneBy({ roomId, userId: actor, status: 'active' });
    if (
      membership?.role !== 'owner' ||
      (membership.expiresAt && membership.expiresAt <= new Date())
    )
      throw new ForbiddenException(
        'Chỉ chủ room và quản trị viên được cấu hình quyền đăng',
      );
  }

  async updatePolicy(
    roomId: string,
    dto: UpdateRoomPolicyDto,
    user: GatewayUser,
  ) {
    const actor = authenticated(user);
    await this.requirePolicyOwner(roomId, user);
    return this.db.transaction(async (m) => {
      const room = await m.findOne(Room, {
        where: { id: roomId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!room) throw new NotFoundException('Room not found');
      if (
        user.role !== 'admin' &&
        (room.policyLocked || dto.policyLocked !== undefined)
      )
        throw new ForbiddenException(
          'Chỉ quản trị viên được thay đổi chính sách đã khóa',
        );
      const before = {
        reviewPolicy: room.reviewPolicy,
        policyLocked: room.policyLocked,
      };
      room.reviewPolicy = dto.reviewPolicy;
      if (dto.policyLocked !== undefined) room.policyLocked = dto.policyLocked;
      await m.query(
        'INSERT INTO room_policy_audits (room_id, actor_id, before, after) VALUES ($1,$2,$3,$4)',
        [roomId, actor, JSON.stringify(before), JSON.stringify(dto)],
      );
      return m.save(Room, room);
    });
  }

  binding(roomId: string) {
    return this.db.getRepository(RoomAcademicBinding).findOneBy({ roomId });
  }

  /**
   * Tìm canonical room cho một academic context.
   * Ưu tiên: course room (curriculumCourseId) → major room (majorId).
   * Trả về null nếu không tìm thấy room nào phù hợp.
   */
  async findCanonicalRoom(
    curriculumCourseId: string | null,
    majorId: string | null,
  ): Promise<Room | null> {
    const bindingRepo = this.db.getRepository(RoomAcademicBinding);
    const roomRepo = this.db.getRepository(Room);

    if (curriculumCourseId) {
      const binding = await bindingRepo
        .createQueryBuilder('b')
        .innerJoin(Room, 'room', 'room.id = b.roomId')
        .where('b.curriculumCourseId = :curriculumCourseId', {
          curriculumCourseId,
        })
        .andWhere('room.roomType = :type', { type: RoomType.COURSE })
        .andWhere('room.status = :status', { status: RoomStatus.ACTIVE })
        .select('b.roomId', 'roomId')
        .getRawOne<{ roomId: string }>();
      if (binding) return roomRepo.findOneBy({ id: binding.roomId });
    }

    if (majorId) {
      const binding = await bindingRepo
        .createQueryBuilder('b')
        .innerJoin(Room, 'room', 'room.id = b.roomId')
        .where('b.majorId = :majorId', { majorId })
        .andWhere('room.roomType = :type', { type: RoomType.MAJOR })
        .andWhere('room.status = :status', { status: RoomStatus.ACTIVE })
        .select('b.roomId', 'roomId')
        .getRawOne<{ roomId: string }>();
      if (binding) return roomRepo.findOneBy({ id: binding.roomId });
    }

    return null;
  }
}
