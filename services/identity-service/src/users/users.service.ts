import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../common/redis.provider';
import { parseTtl } from '../common/parse-ttl.util';
import { MailService } from '../mail/mail.service';
import { OtpService } from '../otp/otp.service';
import { RefreshToken } from './refresh-token.entity';
import { User } from './user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmChangeEmailDto, RequestChangeEmailDto } from './dto/change-email.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';

/**
 * UsersService xử lý các nghiệp vụ liên quan đến quản lý hồ sơ người dùng.
 * Tách biệt với AuthService để giữ đúng nguyên tắc Single Responsibility.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private config: ConfigService,
    private mailService: MailService,
    private otpService: OtpService,
  ) {
    // Khởi tạo Cloudinary SDK với credentials từ biến môi trường
    cloudinary.config({
      cloud_name: config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Trả về thông tin hồ sơ qua UserProfileDto — chỉ expose đúng field frontend cần.
   * Lọc bỏ: passwordHash, jti, updatedAt, deletedAt, refreshTokens.
   */
  getProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      dateOfBirth: user.dateOfBirth ?? null,
      avatarUrl: user.avatarUrl ?? null,
      privacy: user.privacy,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(user: User, dto: UpdateProfileDto): Promise<UserProfileDto> {
    user.fullName = dto.fullName;
    if (dto.dateOfBirth) user.dateOfBirth = new Date(dto.dateOfBirth);
    const saved = await this.userRepo.save(user);
    return this.getProfile(saved);
  }

  /**
   * Upload ảnh đại diện lên Cloudinary và lưu URL trả về vào DB.
   * Dùng upload_stream thay vì upload vì file đến dưới dạng Buffer (multer memory storage),
   * không phải đường dẫn file trên disk.
   */
  async uploadAvatar(user: User, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'avatars', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        )
        .end(file.buffer);
    });

    user.avatarUrl = result.secure_url;
    await this.userRepo.save(user);
    return { avatarUrl: result.secure_url };
  }

  /**
   * Đổi mật khẩu.
   * Sau khi đổi thành công:
   * - Revoke toàn bộ refresh token (đăng xuất tất cả thiết bị)
   * - Blacklist jti của access token hiện tại trong Redis
   */
  async changePassword(user: User, dto: ChangePasswordDto, jti: string): Promise<{ message: string }> {
    const match = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!match) throw new BadRequestException('Current password is incorrect');

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);

    await this.refreshTokenRepo.update({ userId: user.id }, { revoked: true });

    const ttl = parseTtl(this.config.get<string>('JWT_ACCESS_EXPIRES_IN'));
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Bước 1 đổi email: kiểm tra email mới chưa được dùng rồi gửi OTP xác minh.
   * OTP key gắn với cả userId và email mới để tránh user A dùng OTP của user B.
   */
  async requestChangeEmail(user: User, dto: RequestChangeEmailDto): Promise<{ message: string }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.newEmail } });
    if (existing) throw new ConflictException('Email already in use');

    const otp = await this.otpService.createOtp(`change-email:${user.id}:${dto.newEmail}`, 300);
    await this.mailService.sendOtp(dto.newEmail, otp, 'Xác thực thay đổi email');

    return { message: 'OTP sent to new email address' };
  }

  /**
   * Bước 2 đổi email: xác minh OTP rồi cập nhật email trong DB.
   * Kiểm tra trùng email lần nữa vì có thể có race condition giữa request và confirm.
   */
  async confirmChangeEmail(user: User, dto: ConfirmChangeEmailDto): Promise<{ message: string }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.newEmail } });
    if (existing) throw new ConflictException('Email already in use');

    const valid = await this.otpService.verifyOtp(`change-email:${user.id}:${dto.newEmail}`, dto.otp);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    user.email = dto.newEmail;
    await this.userRepo.save(user);

    return { message: 'Email updated successfully' };
  }

  async updatePrivacy(user: User, dto: UpdatePrivacyDto): Promise<{ message: string }> {
    user.privacy = dto.privacy;
    await this.userRepo.save(user);
    return { message: 'Privacy settings updated' };
  }

  /**
   * Xóa tài khoản (soft delete).
   * Yêu cầu xác nhận mật khẩu để tránh xóa nhầm.
   * Revoke toàn bộ token rồi mới softDelete — đảm bảo không còn session nào hoạt động.
   */
  async deleteAccount(user: User, dto: DeleteAccountDto, jti: string): Promise<{ message: string }> {
    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Incorrect password');

    await this.refreshTokenRepo.update({ userId: user.id }, { revoked: true });

    const ttl = parseTtl(this.config.get<string>('JWT_ACCESS_EXPIRES_IN'));
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);

    // softDelete chỉ ghi deletedAt, không xóa bản ghi khỏi DB
    // Cho phép khôi phục tài khoản sau này nếu cần
    await this.userRepo.softDelete(user.id);

    return { message: 'Account deleted successfully' };
  }
}
