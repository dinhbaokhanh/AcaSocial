import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../common/redis.provider';
import { MailService } from '../mail/mail.service';
import { OtpService } from '../otp/otp.service';
import { RefreshToken } from './refresh-token.entity';
import { User } from './user.entity';
import { Role } from './user.entity';
import { UserRoleAudit } from './role-audit.entity';
import { AdminUserListDto, ChangeUserRoleDto } from './dto/admin-users.dto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ConfirmChangeEmailDto,
  RequestChangeEmailDto,
} from './dto/change-email.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';

/**
 * UsersService xử lý các nghiệp vụ liên quan đến quản lý hồ sơ người dùng.
 * Tách biệt với AuthService để giữ đúng nguyên tắc Single Responsibility.
 *
 * Upload avatar đã được tách sang media-service.
 * Field avatarUrl vẫn tồn tại trong entity — media-service sẽ gọi về để update sau.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private mailService: MailService,
    private otpService: OtpService,
  ) {}

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
      lastLoginAt: user.lastLoginAt ?? null,
    };
  }

  async adminList(query: AdminUserListDto) {
    const qb = this.userRepo.createQueryBuilder('user');
    if (query.search) qb.andWhere('(user.email ILIKE :q OR user.username ILIKE :q OR user.fullName ILIKE :q)', { q: `%${query.search}%` });
    if (query.role) qb.andWhere('user.role = :role', { role: query.role });
    const [data, totalItems] = await qb.orderBy('user.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
    return {
      data: data.map((user) => this.getProfile(user)),
      meta: { page: query.page, limit: query.limit, totalItems, totalPages: Math.ceil(totalItems / query.limit) },
    };
  }

  async changeRole(id: string, dto: ChangeUserRoleDto, actor: User) {
    return this.userRepo.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!user) throw new NotFoundException('User not found');
      if (user.id === actor.id && dto.role !== Role.ADMIN)
        throw new ForbiddenException('Administrators cannot demote themselves');
      if (user.role === dto.role) return this.getProfile(user);
      if (user.role === Role.ADMIN && dto.role !== Role.ADMIN) {
        const admins = await manager.count(User, { where: { role: Role.ADMIN } });
        if (admins <= 1) throw new ForbiddenException('The system must retain at least one admin');
      }
      const oldRole = user.role;
      user.role = dto.role;
      user.passwordChangedAt = new Date();
      await manager.save(user);
      await manager.update(RefreshToken, { userId: user.id }, { revoked: true });
      await manager.save(UserRoleAudit, manager.create(UserRoleAudit, {
        userId: user.id, oldRole, newRole: dto.role, changedBy: actor.id, reason: dto.reason.trim(),
      }));
      return this.getProfile(user);
    });
  }

  roleAudits(userId: string) {
    return this.userRepo.manager.getRepository(UserRoleAudit).find({
      where: { userId }, order: { createdAt: 'DESC' }, take: 100,
    });
  }

  async updateProfile(
    user: User,
    dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    user.fullName = dto.fullName;
    if (dto.dateOfBirth) user.dateOfBirth = new Date(dto.dateOfBirth);
    const saved = await this.userRepo.save(user);
    return this.getProfile(saved);
  }

  async updateAvatar(user: User, avatarUrl: string): Promise<UserProfileDto> {
    user.avatarUrl = avatarUrl;
    const saved = await this.userRepo.save(user);
    return this.getProfile(saved);
  }

  /**
   * Đổi mật khẩu.
   * Sau khi đổi thành công:
   * - Đăng xuất tất cả thiết bị
   * - Set passwordChangedAt = now để JwtStrategy từ chối token phát hành trước mốc này
   * - Blacklist jti của access token hiện tại với TTL thực tế còn lại
   */
  async changePassword(
    user: User,
    dto: ChangePasswordDto,
    jti: string,
    exp: number,
  ): Promise<{ message: string }> {
    const match = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!match) throw new BadRequestException('Current password is incorrect');

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    // Đánh dấu thời điểm đổi mật khẩu — JwtStrategy từ chối token phát hành trước mốc này
    user.passwordChangedAt = new Date();
    await this.userRepo.save(user);

    await this.refreshTokenRepo.update({ userId: user.id }, { revoked: true });

    // TTL = thời gian còn lại thực tế của token, tối thiểu 1 giây
    const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Bước 1 đổi email: kiểm tra email mới chưa được dùng rồi gửi OTP xác minh.
   * OTP key gắn với cả userId và email mới để tránh user A dùng OTP của user B.
   */
  async requestChangeEmail(
    user: User,
    dto: RequestChangeEmailDto,
  ): Promise<{ message: string }> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.newEmail },
    });
    if (existing) throw new ConflictException('Email already in use');

    const otp = await this.otpService.createOtp(
      `change-email:${user.id}:${dto.newEmail}`,
      300,
    );
    await this.mailService.sendOtp(
      dto.newEmail,
      otp,
      'Xác thực thay đổi email',
    );

    return { message: 'OTP sent to new email address' };
  }

  /**
   * Bước 2 đổi email: xác minh OTP rồi cập nhật email trong DB.
   * Kiểm tra trùng email lần nữa vì có thể có race condition giữa request và confirm.
   */
  async confirmChangeEmail(
    user: User,
    dto: ConfirmChangeEmailDto,
  ): Promise<{ message: string }> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.newEmail },
    });
    if (existing) throw new ConflictException('Email already in use');

    const valid = await this.otpService.verifyOtp(
      `change-email:${user.id}:${dto.newEmail}`,
      dto.otp,
    );
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    user.email = dto.newEmail;
    await this.userRepo.save(user);

    return { message: 'Email updated successfully' };
  }

  async updatePrivacy(
    user: User,
    dto: UpdatePrivacyDto,
  ): Promise<{ message: string }> {
    user.privacy = dto.privacy;
    await this.userRepo.save(user);
    return { message: 'Privacy settings updated' };
  }

  /**
   * Xóa tài khoản (soft delete).
   * Yêu cầu xác nhận mật khẩu để tránh xóa nhầm.
   * Revoke toàn bộ token rồi mới softDelete — đảm bảo không còn session nào hoạt động.
   */
  async deleteAccount(
    user: User,
    dto: DeleteAccountDto,
    jti: string,
    exp: number,
  ): Promise<{ message: string }> {
    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Incorrect password');

    await this.refreshTokenRepo.update({ userId: user.id }, { revoked: true });

    // TTL = thời gian còn lại thực tế của token, tối thiểu 1 giây
    const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);

    await this.userRepo.softDelete(user.id);

    return { message: 'Account deleted successfully' };
  }
}
