import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique } from 'typeorm';

// Số thứ tự của mỗi người ẩn danh trong một bài, để nickname không trùng nhau trong bài đó.
@Entity('anonymous_aliases')
@Unique('anonymous_aliases_discussion_seq', ['discussionId', 'seq'])
export class AnonymousAlias {
  @PrimaryColumn({ name: 'discussion_id', type: 'uuid', primaryKeyConstraintName: 'anonymous_aliases_pkey' })
  discussionId: string;
  @PrimaryColumn({ name: 'author_id', type: 'uuid', primaryKeyConstraintName: 'anonymous_aliases_pkey' })
  authorId: string;
  @Column({ type: 'int' }) seq: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
