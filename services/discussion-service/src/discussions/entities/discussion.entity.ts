import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { PostType } from '../enums/post-type.enum';
import { PostStatus } from '../enums/post-status.enum';
import { Tag } from '../../tags/entities/tag.entity';
import { DiscussionMedia } from './discussion-media.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Index } from 'typeorm';

/**
 * Discussion là entity chính, ánh xạ tới bảng "discussions" trong PostgreSQL.
 * Mỗi bài viết có thể là Question (hỏi đáp) hoặc Discussion (thảo luận).
 *
 * authorId tham chiếu đến Identity Service (không có FK trực tiếp vì khác database).
 * mediaIds tham chiếu đến Media Service thông qua bảng discussion_media.
 */
@Entity('discussions')
@Index(['roomId'])
export class Discussion {
  @Column({ name: 'room_id', type: 'uuid', nullable: true })
  roomId: string | null;

  @Column({ name: 'major_id', type: 'uuid', nullable: true })
  majorId: string | null;

  @Column({ name: 'curriculum_id', type: 'uuid', nullable: true })
  curriculumId: string | null;

  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string | null;

  @Column({ name: 'curriculum_course_id', type: 'uuid', nullable: true })
  curriculumCourseId: string | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 300 })
  title: string;

  @Column('text')
  content: string;

  @Column({ name: 'post_type', type: 'enum', enum: PostType })
  postType: PostType;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.OPEN })
  status: PostStatus;

  @Column({ name: 'content_provenance', type: 'varchar', length: 20, nullable: true })
  contentProvenance: 'OFFICIAL' | 'DERIVED' | 'SIMULATED' | null;

  // Tham chiếu đến user trong Identity Service — không dùng FK vì khác DB
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  // Cache counters — tránh COUNT() mỗi query
  @Column({ name: 'upvote_count', default: 0 })
  upvoteCount: number;

  @Column({ name: 'downvote_count', default: 0 })
  downvoteCount: number;

  @Column({ name: 'comment_count', default: 0 })
  commentCount: number;

  @Column({ name: 'answer_count', default: 0 })
  answerCount: number;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  // ID của comment được chấp nhận là câu trả lời đúng (chỉ dùng cho Question)
  @Column({ name: 'accepted_comment_id', type: 'uuid', nullable: true })
  acceptedCommentId: string | null;

  @Column({ name: 'accepted_answer_id', type: 'uuid', nullable: true })
  acceptedAnswerId: string | null;

  @Column({ name: 'content_version', type: 'int', default: 1 })
  contentVersion: number;

  // Manual admin/moderator approval uses moderation fields; AI fields remain reserved.
  @Column({ name: 'moderation_status', type: 'varchar', length: 20, default: 'pending' })
  moderationStatus: 'pending' | 'approved' | 'hidden';

  @Column({ type: 'varchar', length: 20, default: 'visible' })
  visibility: 'visible' | 'held' | 'hidden';

  @Column({ name: 'ai_screening_status', type: 'varchar', length: 20, default: 'queued' })
  aiScreeningStatus: 'queued' | 'processing' | 'completed' | 'failed';

  @Column({ name: 'ai_recommended_action', type: 'varchar', length: 20, nullable: true })
  aiRecommendedAction: 'allow' | 'review' | 'block' | null;

  @Column({ name: 'comments_locked', default: false })
  commentsLocked: boolean;

  @Column({ name: 'comments_locked_by', type: 'uuid', nullable: true })
  commentsLockedBy: string | null;

  @Column({ name: 'comments_locked_at', type: 'timestamptz', nullable: true })
  commentsLockedAt: Date | null;

  @Column({ name: 'comments_lock_reason', type: 'text', nullable: true })
  commentsLockReason: string | null;

  // Quan hệ ManyToMany với Tag thông qua bảng trung gian discussion_tags
  @ManyToMany(() => Tag, (tag) => tag.discussions)
  @JoinTable({
    name: 'discussion_tags',
    joinColumn: { name: 'discussion_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags: Tag[];

  // File media đính kèm — chỉ lưu mediaId tham chiếu đến Media Service
  @OneToMany(() => DiscussionMedia, (dm) => dm.discussion)
  media: DiscussionMedia[];

  // Danh sách bình luận của bài viết
  @OneToMany(() => Comment, (comment) => comment.discussion)
  comments: Comment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft delete: không xóa bản ghi khỏi DB, chỉ ghi thời điểm xóa
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
