import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Discussion } from '../../discussions/entities/discussion.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Quan hệ ManyToOne với Discussion
  @ManyToOne(() => Discussion, (discussion) => discussion.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'discussion_id' })
  discussion: Discussion;

  @Column({ name: 'discussion_id', type: 'uuid' })
  discussionId: string;

  // Tác giả bình luận (Tham chiếu Identity Service)
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column('text')
  content: string;

  // Self-referencing relationship cho bình luận phân cấp (Replies)
  @ManyToOne(() => Comment, (comment) => comment.replies, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment: Comment;

  @Column({ name: 'parent_comment_id', type: 'uuid', nullable: true })
  parentCommentId: string | null;

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  replies: Comment[];

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  // Cache counters cho Vote
  @Column({ name: 'upvote_count', default: 0 })
  upvoteCount: number;

  @Column({ name: 'downvote_count', default: 0 })
  downvoteCount: number;

  // Schema retained; comments do not require approval.
  @Column({ name: 'moderation_status', type: 'varchar', length: 20, default: 'approved' })
  moderationStatus: 'pending' | 'approved' | 'hidden';

  @Column({ type: 'varchar', length: 20, default: 'visible' })
  visibility: 'visible' | 'held' | 'hidden';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft delete: Bài xóa vẫn giữ comment, nhưng comment xóa sẽ bị ẩn
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
