import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

// Schema reserved for future AI functionality; no AI module is registered.
@Entity('ai_inference_runs')
@Unique(['inferenceId'])
@Index(['entityType', 'entityId', 'contentVersion'])
export class AiInferenceRun {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'inference_id', type: 'uuid' }) inferenceId: string;
  @Column({ name: 'entity_type', type: 'varchar', length: 20 }) entityType: 'discussion' | 'answer';
  @Column({ name: 'entity_id', type: 'uuid' }) entityId: string;
  @Column({ name: 'content_version', type: 'int' }) contentVersion: number;
  @Column({ name: 'model_version', type: 'varchar', length: 100 }) modelVersion: string;
  @Column({ name: 'policy_version', type: 'varchar', length: 100 }) policyVersion: string;
  @Column({ name: 'room_rules_version', type: 'int', nullable: true }) roomRulesVersion: number | null;
  @Column({ name: 'recommended_action', type: 'varchar', length: 20 })
  recommendedAction: 'allow' | 'review' | 'block';
  @Column({ name: 'category_scores', type: 'jsonb', default: {} }) categoryScores: Record<string, number>;
  @Column({ name: 'raw_result', type: 'jsonb', default: {} }) rawResult: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('moderation_reviews')
// Used for manual admin decisions without an AI inference reference.
export class ModerationReview {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'entity_type', type: 'varchar', length: 20 }) entityType: 'discussion' | 'answer' | 'comment';
  @Column({ name: 'entity_id', type: 'uuid' }) entityId: string;
  @Column({ name: 'content_version', type: 'int' }) contentVersion: number;
  @Column({ type: 'varchar', length: 20 }) decision: 'allow' | 'hold' | 'hide';
  @Column({ name: 'reason_codes', type: 'jsonb', default: [] }) reasonCodes: string[];
  @Column({ type: 'text', default: '' }) note: string;
  @Column({ name: 'reviewer_id', type: 'uuid' }) reviewerId: string;
  @Column({ name: 'related_ai_run_id', type: 'uuid', nullable: true }) relatedAiRunId: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
