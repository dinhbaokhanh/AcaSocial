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

/**
 * Discussion là entity chính, ánh xạ tới bảng "discussions" trong PostgreSQL.
 * Mỗi bài viết có thể là Question (hỏi đáp) hoặc Discussion (thảo luận).
 *
 * authorId tham chiếu đến Identity Service (không có FK trực tiếp vì khác database).
 * mediaIds tham chiếu đến Media Service thông qua bảng discussion_media.
 */
@Entity('discussions')
export class Discussion {
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

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  // ID của comment được chấp nhận là câu trả lời đúng (chỉ dùng cho Question)
  @Column({ name: 'accepted_comment_id', type: 'uuid', nullable: true })
  acceptedCommentId: string | null;

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
