import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './user.entity';

@Entity('user_role_audits')
export class UserRoleAudit {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ name: 'old_role', type: 'varchar', length: 20 }) oldRole: Role;
  @Column({ name: 'new_role', type: 'varchar', length: 20 }) newRole: Role;
  @Column({ name: 'changed_by', type: 'uuid' }) changedBy: string;
  @Column({ type: 'text' }) reason: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
