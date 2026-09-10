import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('notifications')
@Index(['recipientId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  recipientId: string

  @Column({ type: 'varchar', nullable: true })
  actorId: string | null

  @Column()
  type: string

  @Column()
  title: string

  @Column()
  body: string

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, unknown>

  @Column({ default: 'normal' })
  priority: string

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
