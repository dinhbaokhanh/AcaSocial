import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  OnModuleInit,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import type { StringValue } from 'ms';
import { REDIS_CLIENT } from '../common/redis.provider';
import { parseTtl } from '../common/parse-ttl.util';
import { MailService } from '../mail/mail.service';
import { OtpService } from '../otp/otp.service';
import { RefreshToken } from '../users/refresh-token.entity';
import { User } from '../users/user.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

/**
 * AuthService chứa toàn bộ logic nghiệp vụ xác thực.
 * Controller chỉ nhận/trả HTTP, mọi xử lý thực sự đều ở đây.
 */
@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
    private otpService: OtpService,
  ) {}

  async onModuleInit() {
    await this.userRepo.createQueryBuilder()
      .update(User)
      .set({ username: null })
      .where('is_verified = false AND username IS NOT NULL')
      .execute();
  }

  /**
   * Đăng ký tài khoản mới.
   * Tài khoản được tạo với isVerified = false, chưa đăng nhập được cho đến khi xác minh OTP.
   * withDeleted: true đảm bảo email đã soft-delete cũng không được đăng ký lại.
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existingEmail = await this.userRepo.findOne({ where: { email: dto.email }, withDeleted: true });
    if (existingEmail) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: null,
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      email: dto.email,
      passwordHash,
      isVerified: false,
    });
    await this.userRepo.save(user);

    // Gửi OTP xác thực, TTL 300 giây (5 phút)
    const otp = await this.otpService.createOtp(`register:${dto.email}`, 300);
    await this.mailService.sendOtp(dto.email, otp, 'Xác thực đăng ký tài khoản');

    return { message: 'Registration successful. Please verify your email with OTP.' };
  }

  /**
   * Xác minh OTP sau đăng ký để kích hoạt tài khoản.
   */
  async verifyRegisterOtp(dto: VerifyOtpDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Account already verified');

    const existingUsername = await this.userRepo.findOne({ where: { username: dto.username }, withDeleted: true });
    if (existingUsername) throw new ConflictException('Username already taken');

    const valid = await this.otpService.verifyOtp(`register:${dto.email}`, dto.otp);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    user.isVerified = true;
    user.username = dto.username;
    await this.userRepo.save(user);

    return { message: 'Account verified successfully' };
  }

  /**
   * Gửi lại OTP xác thực đăng ký cho người dùng chưa kích hoạt.
   * Cooldown 60 giây giữa các lần gửi để ngăn kẻ tấn công dùng endpoint này
   * như một công cụ spam email đến người dùng khác.
   * createOtp() reset fail counter và lock cũ — đây là hành vi đúng khi user chủ động yêu cầu OTP mới.
   */
  async resendOtp(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Account already verified');

    // Kiểm tra cooldown: chặn gửi lại nếu chưa đủ 60 giây kể từ lần cuối
    const cooldownKey = `otp_cooldown:register:${email}`;
    const onCooldown = await this.redis.exists(cooldownKey);
    if (onCooldown) {
      const ttl = await this.redis.ttl(cooldownKey);
      throw new HttpException(
        `Vui lòng đợi ${ttl} giây trước khi gửi lại OTP.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = await this.otpService.createOtp(`register:${email}`, 300);
    await this.mailService.sendOtp(email, otp, 'Xác thực đăng ký tài khoản');

    // Đặt cooldown SAU khi gửi thành công — tránh block khi mail server lỗi
    await this.redis.set(cooldownKey, '1', 'EX', 60);

    return { message: 'OTP resent successfully' };
  }

  /**
   * Đăng nhập bằng email/username + password.
   * Ghi lại thời điểm đăng nhập thành công vào lastLoginAt để hỗ trợ audit và UI.
   */
  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    // Phân biệt đăng nhập bằng email hay username dựa vào ký tự '@'
    const isEmail = dto.identifier.includes('@');
    const user = isEmail
      ? await this.userRepo.findOne({ where: { email: dto.identifier } })
      : await this.userRepo.findOne({ where: { username: dto.identifier } });

    // Trả về cùng một lỗi cho mọi trường hợp sai để tránh lộ thông tin
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isVerified) throw new UnauthorizedException('Account not verified');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    // Cập nhật lastLoginAt không đồng bộ — không block việc trả token về client
    // Fire-and-forget: nếu update lỗi cũng không ảnh hưởng đến flow đăng nhập
    this.userRepo.update(user.id, { lastLoginAt: new Date() }).catch(() => {});

    return this.generateTokens(user);
  }

  /**
   * Cấp lại cặp token mới từ refreshToken còn hiệu lực.
   *
   * Reuse detection (phát hiện token bị đánh cắp):
   * Refresh token rotation đảm bảo mỗi token chỉ dùng được một lần.
   * Nếu token hợp lệ đã bị revoke (= đã dùng rồi) mà vẫn được gửi lên,
   * có hai khả năng: client dùng token cũ (bug) hoặc token bị đánh cắp và kẻ tấn công
   * đã dùng trước. Trong cả hai trường hợp, phản ứng an toàn nhất là thu hồi
   * TOÀN BỘ session của user để buộc đăng nhập lại trên tất cả thiết bị.
   *
   * Flow:
   *   Token không tồn tại trong DB  → 401 (token giả hoặc đã xóa)
   *   Token tồn tại + đã revoke      → REUSE DETECTED → revoke all sessions → 401
   *   Token tồn tại + hết hạn        → 401 (expired)
   *   Token tồn tại + hợp lệ         → revoke cũ → cấp cặp mới
   */
  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');

    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    // Token không tồn tại trong DB — hash sai hoặc đã bị xóa
    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Token đã bị revoke mà vẫn được dùng lại → dấu hiệu token bị đánh cắp.
    // Thu hồi toàn bộ session để giới hạn thiệt hại — user sẽ cần đăng nhập lại.
    if (stored.revoked) {
      await this.refreshTokenRepo.update(
        { userId: stored.userId, revoked: false },
        { revoked: true },
      );
      throw new UnauthorizedException(
        'Security alert: refresh token reuse detected. All sessions have been revoked. Please login again.',
      );
    }

    // Token hết hạn tự nhiên
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Token hợp lệ — revoke ngay trước khi cấp token mới (rotation)
    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    return this.generateTokens(stored.user);
  }

  /**
   * Đăng xuất: vô hiệu hóa access token hiện tại và toàn bộ refresh token của user.
   * jti (JWT ID) được thêm vào Redis blacklist với TTL bằng thời gian còn lại thực tế
   * của access token (exp - now), thay vì TTL cố định từ config.
   * Điều này tránh blacklist entry tồn tại lâu hơn cần thiết, tiết kiệm bộ nhớ Redis.
   */
  async logout(userId: string, jti: string, exp: number): Promise<{ message: string }> {
    // Revoke toàn bộ refresh token — đăng xuất khỏi tất cả thiết bị
    await this.refreshTokenRepo.update({ userId, revoked: false }, { revoked: true });

    // TTL = thời gian còn lại thực tế của token (giây), tối thiểu 1 giây
    // exp là Unix timestamp (giây) từ JWT payload
    const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);

    return { message: 'Logged out successfully' };
  }

  /**
   * Bước 1 quên mật khẩu: gửi OTP xác minh danh tính.
   * TTL 600 giây (10 phút) để người dùng có thêm thời gian.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // Luôn trả về cùng một message dù email tồn tại hay không.
    // Tránh user enumeration — hacker không biết được email nào đã đăng ký.
    if (user) {
      const otp = await this.otpService.createOtp(`reset:${dto.email}`, 600);
      await this.mailService.sendOtp(dto.email, otp, 'Đặt lại mật khẩu');
    }

    return { message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được mã OTP.' };
  }

  /**
   * Bước 2 quên mật khẩu: xác minh OTP rồi cập nhật mật khẩu mới.
   * Sau khi đổi mật khẩu:
   * - Revoke toàn bộ refresh token để buộc đăng nhập lại trên mọi thiết bị.
   * - Set passwordChangedAt = now để JwtStrategy từ chối mọi access token cũ
   *   (access token được phát hành trước thời điểm này sẽ không còn hiệu lực).
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await this.otpService.verifyOtp(`reset:${dto.email}`, dto.otp);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    // Đánh dấu thời điểm đổi mật khẩu — JwtStrategy sẽ từ chối token phát hành trước mốc này
    user.passwordChangedAt = new Date();
    await this.userRepo.save(user);

    // Buộc đăng nhập lại trên tất cả thiết bị sau khi đổi mật khẩu
    await this.refreshTokenRepo.update({ userId: user.id }, { revoked: true });

    return { message: 'Password reset successfully. Please login again.' };
  }

  /**
   * Tạo cặp accessToken + refreshToken cho một user.
   * Được dùng chung bởi login() và refreshToken().
   *
   * accessToken: JWT ngắn hạn, chứa id/email/jti trong payload
   * refreshToken: UUID ngẫu nhiên, lưu dạng SHA-256 hash trong DB
   */
  private async generateTokens(user: User) {
    // jti (JWT ID) là định danh duy nhất của token này, dùng để blacklist khi logout
    const jti = randomUUID();
    const accessToken = this.jwtService.sign(
      // role được đưa vào payload để Gateway đọc và forward qua X-User-Role header
      // các service phía sau dùng header này để kiểm tra quyền, không cần verify JWT lại
      { sub: user.id, username: user.username, email: user.email, role: user.role, jti },
      { expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') as StringValue },
    );

    // Refresh token là UUID thô gửi về client, DB chỉ lưu hash của nó
    const refreshTokenRaw = randomUUID();
    const tokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');

    // Tính expiresAt từ JWT_REFRESH_EXPIRES_IN thay vì hardcode 7 ngày
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES_IN');
    const expiresAt = new Date(Date.now() + parseTtl(refreshExpires) * 1000);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({ tokenHash, expiresAt, userId: user.id }),
    );

    return { accessToken, refreshToken: refreshTokenRaw };
  }
}
