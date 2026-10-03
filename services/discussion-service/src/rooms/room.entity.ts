import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum RoomType {
  MAJOR = 'major',
  COURSE = 'course',
  EVENT = 'event',
  FORUM = 'forum',
}
export enum RoomVisibility {
  PUBLIC = 'public',
  RESTRICTED = 'restricted',
  PRIVATE = 'private',
}
export enum PostingPolicy {
  ANYONE = 'anyone',
  MEMBERS = 'members',
  APPROVED = 'approved_contributors',
}
export enum RoomStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  READ_ONLY = 'read_only',
  ARCHIVED = 'archived',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 100, unique: true }) slug: string;
  @Column({ length: 200 }) name: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ name: 'room_type', type: 'varchar', length: 20 }) roomType: RoomType;
  @Column({ name: 'parent_room_id', type: 'uuid', nullable: true }) parentRoomId: string | null;
  @ManyToOne(() => Room, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_room_id' }) parent: Room | null;
  @Column({ type: 'varchar', length: 20, default: RoomVisibility.PUBLIC }) visibility: RoomVisibility;
  @Column({ name: 'membership_policy', type: 'varchar', length: 20, default: 'open' })
  membershipPolicy: 'open' | 'approval' | 'invite_only';
  @Column({ name: 'posting_policy', type: 'varchar', length: 30, default: PostingPolicy.ANYONE })
  postingPolicy: PostingPolicy;
  @Column({ type: 'varchar', length: 20, default: RoomStatus.ACTIVE }) status: RoomStatus;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy: string;
  @Column({ name: 'start_at', type: 'timestamptz', nullable: true }) startAt: Date | null;
  @Column({ name: 'end_at', type: 'timestamptz', nullable: true }) endAt: Date | null;
  @Column({ name: 'rules_version', type: 'int', default: 1 }) rulesVersion: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('room_academic_bindings')
@Unique(['roomId'])
export class RoomAcademicBinding {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'room_id', type: 'uuid' }) roomId: string;
  @Column({ name: 'major_id', type: 'uuid' }) majorId: string;
  @Column({ name: 'curriculum_id', type: 'uuid', nullable: true }) curriculumId: string | null;
  @Column({ name: 'course_id', type: 'uuid', nullable: true }) courseId: string | null;
  @Column({ name: 'curriculum_course_id', type: 'uuid', nullable: true })
  curriculumCourseId: string | null;
}

@Entity('room_memberships')
@Unique(['roomId', 'userId'])
@Index(['userId', 'status'])
export class RoomMembership {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'room_id', type: 'uuid' }) roomId: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: 'owner' | 'moderator' | 'contributor' | 'member';
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'pending' | 'active' | 'muted' | 'banned' | 'left';
  @Column({ name: 'assigned_by', type: 'uuid', nullable: true }) assignedBy: string | null;
  @CreateDateColumn({ name: 'joined_at' }) joinedAt: Date;
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true }) expiresAt: Date | null;
}

@Entity('room_rules')
@Unique(['roomId', 'ruleCode', 'version'])
export class RoomRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'room_id', type: 'uuid' }) roomId: string;
  @Column({ name: 'rule_code', length: 40 }) ruleCode: string;
  @Column({ length: 160 }) title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'varchar', length: 20, default: 'medium' }) severity: 'low' | 'medium' | 'high';
  @Column({ type: 'int', default: 1 }) version: number;
  @Column({ type: 'boolean', default: true }) active: boolean;
}
