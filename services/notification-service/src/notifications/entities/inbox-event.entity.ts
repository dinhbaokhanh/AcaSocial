import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('inbox_events')
export class InboxEvent {
  @PrimaryColumn()
  eventId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  processedAt: Date;
}