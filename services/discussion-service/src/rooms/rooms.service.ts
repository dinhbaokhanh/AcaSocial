import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import { authenticated } from '../common/content-policy';
import { AcademicReferenceService } from '../common/academic-reference.service';
import { OutboxService } from '../events/outbox.service';
import { CreateRoomDto, CreateRoomRuleDto, UpdateMembershipDto, UpdateRoomStatusDto } from './room.dto';
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
  ) {}

  async create(dto: CreateRoomDto, user: GatewayUser) {
    const actor = authenticated(user);
    if ([RoomType.MAJOR, RoomType.COURSE].includes(dto.roomType) && user.role !== 'admin')
      throw new ForbiddenException('Only admins create canonical academic rooms');
    if (dto.startAt && dto.endAt && dto.endAt <= dto.startAt)
      throw new BadRequestException('endAt must be after startAt');

    const parent = dto.parentRoomId
      ? await this.db.getRepository(Room).findOneBy({ id: dto.parentRoomId })
      : null;
    if (dto.parentRoomId && !parent) throw new BadRequestException('Parent room not found');
    if (dto.roomType === RoomType.COURSE && parent?.roomType !== RoomType.MAJOR)
      throw new BadRequestException('Course room must be a child of a major room');
    if ([RoomType.EVENT, RoomType.FORUM].includes(dto.roomType) && parent)
      await this.requireRoomManager(parent.id, user);

    let context: Awaited<ReturnType<AcademicReferenceService['context']>> | null = null;
    if (dto.roomType === RoomType.COURSE) {
      if (!dto.curriculumCourseId)
        throw new BadRequestException('Course room requires curriculumCourseId');
      context = await this.academic.context(dto.curriculumCourseId);
      const parentBinding = await this.binding(parent!.id);
      if (!parentBinding || parentBinding.majorId !== context.majorId)
        throw new BadRequestException('Course does not belong to the parent major room');
    }
    if (dto.roomType === RoomType.MAJOR && !dto.majorId)
      throw new BadRequestException('Major room requires majorId');
    if (dto.roomType === RoomType.MAJOR) await this.academic.major(dto.majorId!);
    if (dto.roomType === RoomType.MAJOR) {
      const existing = await this.db.getRepository(RoomAcademicBinding)
        .createQueryBuilder('binding')
        .innerJoin(Room, 'room', 'room.id = binding.roomId')
        .where('binding.majorId = :majorId', { majorId: dto.majorId })
        .andWhere('room.roomType = :type', { type: RoomType.MAJOR })
        .getOne();
      if (existing) throw new ConflictException('Canonical major room already exists');
    }
    if (dto.roomType === RoomType.COURSE) {
      const existing = await this.db.getRepository(RoomAcademicBinding)
        .createQueryBuilder('binding')
        .innerJoin(Room, 'room', 'room.id = binding.roomId')
        .where('binding.curriculumCourseId = :id', { id: dto.curriculumCourseId })
        .andWhere('room.roomType = :type', { type: RoomType.COURSE })
        .getOne();
      if (existing) throw new ConflictException('Canonical course room already exists');
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
            status: dto.roomType === RoomType.EVENT && dto.startAt && dto.startAt > new Date()
              ? RoomStatus.DRAFT
              : RoomStatus.ACTIVE,
            createdBy: actor,
            startAt: dto.startAt ?? null,
            endAt: dto.endAt ?? null,
          }),
        );
        let binding: Partial<RoomAcademicBinding> | null = null;
        if (dto.roomType === RoomType.MAJOR)
          binding = { roomId: room.id, majorId: dto.majorId!, curriculumId: null, courseId: null, curriculumCourseId: null };
        else if (context)
          binding = { roomId: room.id, majorId: context.majorId, curriculumId: context.curriculumId, courseId: context.courseId, curriculumCourseId: context.curriculumCourseId };
        else if (parent) {
          const inherited = await manager.findOneBy(RoomAcademicBinding, { roomId: parent.id });
          if (inherited)
            binding = { roomId: room.id, majorId: inherited.majorId, curriculumId: inherited.curriculumId, courseId: inherited.courseId, curriculumCourseId: inherited.curriculumCourseId };
        }
        if (binding) await manager.save(RoomAcademicBinding, manager.create(RoomAcademicBinding, binding));
        await manager.save(RoomMembership, manager.create(RoomMembership, {
          roomId: room.id, userId: actor, role: 'owner', status: 'active', assignedBy: actor, expiresAt: null,
        }));
        await this.outbox.event(manager, 'room.created', { roomId: room.id, roomType: room.roomType });
        return room.id;
      });
      return this.findOne(roomId, user);
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Room slug or academic binding already exists');
      throw error;
    }
  }

  async list(type?: RoomType, parentRoomId?: string, user: GatewayUser = { id: null, role: null }) {
    const qb = this.db.getRepository(Room).createQueryBuilder('room');
    if (type) qb.andWhere('room.roomType = :type', { type });
    if (parentRoomId) qb.andWhere('room.parentRoomId = :parentRoomId', { parentRoomId });
    if (!['admin', 'moderator'].includes(user.role ?? '')) {
      qb.andWhere(`(room.visibility != :private OR EXISTS (
        SELECT 1 FROM room_memberships membership
        WHERE membership.room_id = room.id AND membership.user_id = :viewer AND membership.status = 'active'
      ))`, { private: RoomVisibility.PRIVATE, viewer: user.id ?? null });
    }
    const rooms = await qb.orderBy('room.name', 'ASC').getMany();
    const bindings = rooms.length
      ? await this.db.getRepository(RoomAcademicBinding)
          .createQueryBuilder('b').where('b.roomId IN (:...ids)', { ids: rooms.map((room) => room.id) }).getMany()
      : [];
    const managedIds = user.id ? await this.managedRoomIds(user) : [];
    const globalManager = !!user.id && ['admin', 'moderator'].includes(user.role ?? '');
    return rooms.map((room) => ({
      ...room,
      canManage: globalManager || managedIds.includes(room.id),
      academicBinding: bindings.find((b) => b.roomId === room.id) ?? null,
    }));
  }

  async findOne(idOrSlug: string, user: GatewayUser = { id: null, role: null }) {
    const repo = this.db.getRepository(Room);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
    const room = await repo.findOne({ where: isUuid ? { id: idOrSlug } : { slug: idOrSlug } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.visibility === RoomVisibility.PRIVATE && !['admin', 'moderator'].includes(user.role ?? '')) {
      const membership = user.id
        ? await this.db.getRepository(RoomMembership).findOneBy({ roomId: room.id, userId: user.id, status: 'active' })
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
    const existing = await this.db.getRepository(RoomMembership).findOneBy({ roomId: id, userId: actor });
    if (existing?.status === 'banned') throw new ForbiddenException('You are banned from this room');
    const membership = existing ?? this.db.getRepository(RoomMembership).create({ roomId: id, userId: actor });
    membership.role = 'member';
    membership.status = room.membershipPolicy === 'approval' ? 'pending' : 'active';
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
      !membership && room.visibility === RoomVisibility.PUBLIC &&
      room.membershipPolicy === 'open' && room.postingPolicy === PostingPolicy.MEMBERS
    ) {
      await memberships.createQueryBuilder()
        .insert()
        .values({ roomId, userId: actor, role: 'member', status: 'active', assignedBy: null, expiresAt: null })
        .orIgnore()
        .execute();
      membership = await memberships.findOneBy({ roomId, userId: actor });
    }
    if (membership?.status === 'banned' || membership?.status === 'muted')
      throw new ForbiddenException('You cannot post in this room');
    if (room.visibility === RoomVisibility.PRIVATE && membership?.status !== 'active')
      throw new ForbiddenException('Active membership required for a private room');
    if (room.postingPolicy === PostingPolicy.MEMBERS && membership?.status !== 'active')
      throw new ForbiddenException('Active membership required');
    if (
      room.postingPolicy === PostingPolicy.APPROVED &&
      !(membership?.status === 'active' && ['owner', 'moderator', 'contributor'].includes(membership.role))
    ) throw new ForbiddenException('Approved contributor role required');
    return { room, binding: await this.binding(roomId) };
  }

  async managedRoomIds(user: GatewayUser): Promise<string[]> {
    const actor = authenticated(user);
    const memberships = await this.db.getRepository(RoomMembership).createQueryBuilder('membership')
      .where('membership.userId = :actor', { actor })
      .andWhere("membership.status = 'active'")
      .andWhere("membership.role IN ('owner', 'moderator')")
      .andWhere('(membership.expiresAt IS NULL OR membership.expiresAt > CURRENT_TIMESTAMP)')
      .getMany();
    return memberships.map((membership) => membership.roomId);
  }

  async requireRoomManager(roomId: string, user: GatewayUser) {
    const actor = authenticated(user);
    if (['admin', 'moderator'].includes(user.role ?? '')) return;
    const membership = await this.db.getRepository(RoomMembership).findOneBy({ roomId, userId: actor, status: 'active' });
    if (!membership || (membership.expiresAt && membership.expiresAt <= new Date()) || !['owner', 'moderator'].includes(membership.role))
      throw new ForbiddenException('Room manager role required');
  }

  async addRule(roomId: string, dto: CreateRoomRuleDto, user: GatewayUser) {
    await this.requireRoomManager(roomId, user);
    return this.db.transaction(async (manager) => {
      const room = await manager.findOne(Room, { where: { id: roomId }, lock: { mode: 'pessimistic_write' } });
      if (!room) throw new NotFoundException('Room not found');
      const previous = await manager.getRepository(RoomRule).findOne({
        where: { roomId, ruleCode: dto.ruleCode, active: true },
        order: { version: 'DESC' },
      });
      if (previous) {
        previous.active = false;
        await manager.save(previous);
      }
      const rule = await manager.save(RoomRule, manager.create(RoomRule, {
        roomId,
        ...dto,
        version: (previous?.version ?? 0) + 1,
        active: true,
      }));
      room.rulesVersion += 1;
      await manager.save(room);
      await this.outbox.event(manager, 'room.rules.changed', { roomId, rulesVersion: room.rulesVersion });
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
    const membership = await this.db.getRepository(RoomMembership).findOneBy({ roomId, userId: memberId });
    if (!membership) throw new NotFoundException('Room membership not found');
    const actorMembership = await this.db.getRepository(RoomMembership).findOneBy({
      roomId, userId: actor, status: 'active',
    });
    const canManageOwners = user.role === 'admin' || actorMembership?.role === 'owner';
    if ((membership.role === 'owner' || dto.role === 'owner') && !canManageOwners)
      throw new ForbiddenException('Only a room owner or admin can manage owners');
    if (
      membership.role === 'owner' && membership.status === 'active' &&
      (dto.role !== 'owner' || dto.status !== 'active')
    ) {
      const ownerCount = await this.db.getRepository(RoomMembership).countBy({
        roomId, role: 'owner', status: 'active',
      });
      if (ownerCount <= 1) throw new ConflictException('A room must retain at least one active owner');
    }
    membership.role = dto.role;
    membership.status = dto.status;
    membership.assignedBy = actor;
    return this.db.getRepository(RoomMembership).save(membership);
  }

  async updateStatus(roomId: string, dto: UpdateRoomStatusDto, user: GatewayUser) {
    await this.requireRoomManager(roomId, user);
    const room = await this.db.getRepository(Room).findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    room.status = dto.status as RoomStatus;
    return this.db.getRepository(Room).save(room);
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
        .where('b.curriculumCourseId = :curriculumCourseId', { curriculumCourseId })
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
