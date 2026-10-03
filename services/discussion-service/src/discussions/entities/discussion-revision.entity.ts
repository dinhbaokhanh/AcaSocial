import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('discussion_revisions')
@Unique(['discussionId', 'contentVersion'])
export class DiscussionRevision {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'discussion_id', type: 'uuid' }) discussionId: string;
  @Column({ name: 'content_version', type: 'int' }) contentVersion: number;
  @Column({ length: 300 }) title: string;
  @Column({ type: 'text' }) content: string;
  @Column({ name: 'revision_type', type: 'varchar', length: 20, default: 'semantic' })
  revisionType: 'editorial' | 'semantic';
  @Column({ name: 'edited_by', type: 'uuid' }) editedBy: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

// Schema retained for future topic suggestions; no module is currently registered.
@Entity('discussion_tag_assignments')
export class DiscussionTagAssignment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'discussion_id', type: 'uuid' }) discussionId: string;
  @Column({ name: 'tag_id', type: 'uuid', nullable: true }) tagId: string | null;
  @Column({ name: 'topic_id', type: 'uuid', nullable: true }) topicId: string | null;
  @Column({ name: 'content_version', type: 'int' }) contentVersion: number;
  @Column({ type: 'varchar', length: 20 }) source: 'author' | 'ai' | 'moderator';
  @Column({ type: 'varchar', length: 20 }) status: 'suggested' | 'accepted' | 'rejected' | 'removed';
  @Column({ type: 'real', nullable: true }) confidence: number | null;
  @Column({ name: 'model_version', type: 'varchar', length: 100, nullable: true }) modelVersion: string | null;
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true }) reviewedBy: string | null;
  @Column({ name: 'parent_assignment_id', type: 'uuid', nullable: true }) parentAssignmentId: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
