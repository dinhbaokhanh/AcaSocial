import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

export type ReportableType = 'discussion' | 'comment' | 'answer';

// Report/case schema retained for future implementation; manual approval uses ModerationReview.
@Entity('content_reports')
@Unique(['entityType', 'entityId', 'reporterId', 'contentVersion'])
export class ContentReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'entity_type', length: 20 }) entityType: ReportableType;
  @Column({ name: 'entity_id', type: 'uuid' }) entityId: string;
  @Column({ name: 'reporter_id', type: 'uuid' }) reporterId: string;
  @Column({ name: 'content_version', type: 'int', default: 1 }) contentVersion: number;
  @Column({ name: 'reason_code', length: 40 }) reasonCode: string;
  @Column({ type: 'text', default: '' }) details: string;
  @Column({ length: 20, default: 'open' }) status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  @Column({ name: 'case_id', type: 'uuid' }) caseId: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('moderation_cases')
@Index(['status', 'createdAt'])
export class ModerationCase {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'entity_type', length: 20 }) entityType: ReportableType;
  @Column({ name: 'entity_id', type: 'uuid' }) entityId: string;
  @Column({ name: 'content_version', type: 'int', default: 1 }) contentVersion: number;
  @Column({ length: 20, default: 'open' }) status: 'open' | 'claimed' | 'resolved';
  @Column({ length: 20, default: 'medium' }) severity: 'low' | 'medium' | 'high' | 'critical';
  @Column({ name: 'report_count', type: 'int', default: 1 }) reportCount: number;
  @Column({ name: 'assigned_to', type: 'uuid', nullable: true }) assignedTo: string | null;
  @Column({ name: 'claimed_at', type: 'timestamptz', nullable: true }) claimedAt: Date | null;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt: Date | null;
  @Column({ name: 'resolution_action', type: 'varchar', length: 30, nullable: true }) resolutionAction: string | null;
  @Column({ name: 'resolution_note', type: 'text', nullable: true }) resolutionNote: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('moderation_audit_logs')
@Index(['caseId', 'createdAt'])
export class ModerationAuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'case_id', type: 'uuid', nullable: true }) caseId: string | null;
  @Column({ name: 'entity_type', length: 20 }) entityType: ReportableType;
  @Column({ name: 'entity_id', type: 'uuid' }) entityId: string;
  @Column({ length: 40 }) action: string;
  @Column({ name: 'actor_id', type: 'uuid' }) actorId: string;
  @Column({ type: 'text', default: '' }) note: string;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
