import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * RefreshToken lưu trữ các token dùng để cấp lại access token mới khi hết hạn.
 *
 * Lý do không lưu token thô (raw):
 * Nếu DB bị lộ, kẻ tấn công không thể dùng hash để giả mạo token.
 * Token thô chỉ tồn tại trên client (cookie/localStorage), DB chỉ lưu SHA-256 hash.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // SHA-256 hash của refresh token thực — không lưu token gốc vào DB
  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  // Thời điểm hết hạn — timestamptz bao gồm timezone để tránh lệch giờ
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  // true = token đã bị vô hiệu hóa (logout, đổi mật khẩu, xóa tài khoản)
  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Khi user bị xóa, toàn bộ refresh token liên quan cũng tự xóa theo (CASCADE)
  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}
