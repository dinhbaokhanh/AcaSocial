import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('answers')
@Index(['discussionId', 'createdAt'])
export class Answer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'discussion_id', type: 'uuid' }) discussionId: string;
  @Column({ name: 'author_id', type: 'uuid' }) authorId: string;
  @Column({ type: 'text' }) content: string;
  @Column({ name: 'is_anonymous', default: false }) isAnonymous: boolean;
  @Column({ name: 'content_version', type: 'int', default: 1 }) contentVersion: number;
  // Schema retained; answers do not require approval and AI fields remain reserved.
  @Column({ name: 'moderation_status', type: 'varchar', length: 20, default: 'pending' })
  moderationStatus: 'pending' | 'approved' | 'hidden';
  @Column({ type: 'varchar', length: 20, default: 'visible' })
  visibility: 'visible' | 'held' | 'hidden';
  @Column({ name: 'ai_screening_status', type: 'varchar', length: 20, default: 'queued' })
  aiScreeningStatus: 'queued' | 'processing' | 'completed' | 'failed';
  @Column({ name: 'ai_recommended_action', type: 'varchar', length: 20, nullable: true })
  aiRecommendedAction: 'allow' | 'review' | 'block' | null;
  @Column({ name: 'upvote_count', default: 0 }) upvoteCount: number;
  @Column({ name: 'downvote_count', default: 0 }) downvoteCount: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at', nullable: true }) deletedAt: Date | null;
}

@Entity('answer_revisions')
@Unique(['answerId', 'contentVersion'])
export class AnswerRevision {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'answer_id', type: 'uuid' }) answerId: string;
  @Column({ name: 'content_version', type: 'int' }) contentVersion: number;
  @Column({ type: 'text' }) content: string;
  @Column({ name: 'revision_type', type: 'varchar', length: 20 }) revisionType: 'editorial' | 'semantic';
  @Column({ name: 'edited_by', type: 'uuid' }) editedBy: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('answer_acceptances')
@Index(['discussionId', 'revokedAt'])
export class AnswerAcceptance {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'discussion_id', type: 'uuid' }) discussionId: string;
  @Column({ name: 'answer_id', type: 'uuid' }) answerId: string;
  @Column({ name: 'question_version', type: 'int' }) questionVersion: number;
  @Column({ name: 'answer_version', type: 'int' }) answerVersion: number;
  @Column({ name: 'accepted_by', type: 'uuid' }) acceptedBy: string;
  @CreateDateColumn({ name: 'accepted_at' }) acceptedAt: Date;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt: Date | null;
  @Column({ name: 'revoked_by', type: 'uuid', nullable: true }) revokedBy: string | null;
  @Column({ name: 'revoke_reason', type: 'varchar', length: 100, nullable: true }) revokeReason: string | null;
}
