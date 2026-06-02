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

/**
 * Enum kiểm soát mức độ hiển thị hồ sơ người dùng với người khác.
 * PUBLIC  — ai cũng xem được thông tin cá nhân
 * PRIVATE — chỉ bản thân mới xem được
 */
export enum Privacy {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

/**
 * Role của user trong hệ thống (platform-wide, không phụ thuộc context).
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
 * Mỗi thuộc tính có decorator @Column() tương ứng với một cột trong bảng.
 */
@Entity('users')
export class User {
  // UUID tự sinh — dùng chuỗi thay vì số nguyên để tránh lộ số lượng user
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  // Email là định danh duy nhất để đăng nhập
  @Column({ unique: true, length: 255 })
  email: string;

  // Lưu hash của mật khẩu (bcrypt), không bao giờ lưu plain text
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ type: 'enum', enum: Privacy, default: Privacy.PUBLIC })
  privacy: Privacy;

  // Tài khoản chỉ được dùng sau khi xác minh email bằng OTP
  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  // Role mặc định là student khi đăng ký, admin có thể thay đổi sau
  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft delete: không xóa bản ghi khỏi DB, chỉ ghi thời điểm xóa.
  // Các query thông thường sẽ tự lọc bỏ những bản ghi có deletedAt != null.
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  // Một user có thể có nhiều refresh token (đăng nhập từ nhiều thiết bị)
  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
