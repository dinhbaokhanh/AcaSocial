import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';

export enum Privacy {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

/**
 * Role của user trong hệ thống.
 * - student   : người dùng thông thường, mặc định khi đăng ký
 * - teacher   : giảng viên, có thể tạo khóa học và đăng tài liệu
 * - moderator : kiểm duyệt nội dung toàn hệ thống, do admin bổ nhiệm
 * - admin     : toàn quyền quản trị
 */
export enum Role {
  STUDENT = 'student',
  TEACHER = 'teacher',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

/**
 * User là entity chính, ánh xạ tới bảng "users" trong PostgreSQL.
 */
@Entity('users')
export class User {
  // UUID tự sinh — dùng chuỗi
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100, nullable: true })
  username: string | null;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ type: 'enum', enum: Privacy, default: Privacy.PUBLIC })
  privacy: Privacy;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role: Role;

  /**
   * Ghi lại thời điểm mật khẩu được thay đổi lần cuối.
   * JwtStrategy dùng field này để từ chối access token được phát hành TRƯỚC khi đổi mật khẩu.
   * Ví dụ: user đổi mật khẩu lúc 10:00, token phát hành lúc 9:50 → bị từ chối dù chưa hết hạn.
   * Áp dụng cho cả resetPassword (quên mật khẩu) lẫn changePassword (đổi chủ động).
   * Nullable vì các tài khoản cũ chưa từng đổi mật khẩu sẽ không có giá trị này.
   */
  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt: Date | null;

  /**
   * Ghi lại thời điểm đăng nhập thành công gần nhất.
   * Dùng để hiển thị trong UI ("Đăng nhập lần cuối: ...") và hỗ trợ audit bảo mật
   * (phát hiện đăng nhập bất thường từ địa điểm/thời gian lạ).
   * Nullable vì tài khoản mới chưa từng đăng nhập sẽ không có giá trị này.
   */
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft delete: không xóa bản ghi khỏi DB, chỉ ghi thời điểm xóa.
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  // Một user có thể có nhiều refresh token (đăng nhập từ nhiều thiết bị)
  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
