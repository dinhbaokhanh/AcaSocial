import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Discussion } from '../../discussions/entities/discussion.entity';

/**
 * Tag đại diện cho nhãn môn học / chủ đề gắn với bài viết.
 * Mỗi bài viết phải có ít nhất 1 tag.
 * Tag được quản lý bởi admin/moderator.
 */
@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  // URL-friendly slug, ví dụ: "co-so-du-lieu", "oop"
  @Column({ length: 120, unique: true })
  slug: string;

  @Column('text', { nullable: true })
  description: string;

  // Đếm số bài viết sử dụng tag này — cập nhật khi tạo/xóa bài viết
  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'inactive' | 'merged';

  @Column({ name: 'merged_into_tag_id', type: 'uuid', nullable: true })
  mergedIntoTagId: string | null;

  @ManyToMany(() => Discussion, (d) => d.tags)
  discussions: Discussion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
