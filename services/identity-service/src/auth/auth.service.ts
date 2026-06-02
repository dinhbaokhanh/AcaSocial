import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
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
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
    private otpService: OtpService,
  ) {}

  /**
   * Đăng ký tài khoản mới.
   * Tài khoản được tạo với isVerified = false, chưa đăng nhập được cho đến khi xác minh OTP.
   * withDeleted: true đảm bảo email đã soft-delete cũng không được đăng ký lại.
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
      withDeleted: true, // Kiểm tra cả tài khoản đã xóa mềm
    });
    if (existing) throw new ConflictException('Email already registered');

    // bcrypt với salt rounds = 10 — đủ an toàn, không quá chậm
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
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

    const valid = await this.otpService.verifyOtp(`register:${dto.email}`, dto.otp);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    user.isVerified = true;
    await this.userRepo.save(user);

    return { message: 'Account verified successfully' };
  }

  /**
   * Gửi lại OTP xác thực đăng ký cho người dùng chưa kích hoạt.
   */
  async resendOtp(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Account already verified');

    const otp = await this.otpService.createOtp(`register:${email}`, 300);
    await this.mailService.sendOtp(email, otp, 'Xác thực đăng ký tài khoản');

    return { message: 'OTP resent successfully' };
  }

  /**
   * Đăng nhập bằng email + password.
   * Trả về cặp accessToken (ngắn hạn) và refreshToken (dài hạn).
   *
   * Lý do dùng 2 token:
   * - accessToken hết hạn nhanh (15 phút) giảm thiểu thiệt hại khi bị lộ
   * - refreshToken cho phép lấy accessToken mới mà không cần đăng nhập lại
   */
  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    // Trả về cùng một lỗi cho cả 2 trường hợp (sai email / sai password)
    // để tránh kẻ tấn công biết email nào tồn tại trong hệ thống
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isVerified) throw new UnauthorizedException('Account not verified');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  /**
   * Cấp lại cặp token mới từ refreshToken còn hiệu lực.
   * Áp dụng cơ chế Token Rotation: mỗi lần dùng refreshToken thì revoke token cũ
   * và cấp token mới — phát hiện được nếu token bị đánh cắp và dùng 2 lần.
   */
  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    // So sánh hash thay vì token gốc — DB không bao giờ lưu token thô
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');

    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke token cũ ngay lập tức trước khi cấp token mới (Token Rotation)
    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    return this.generateTokens(stored.user);
  }

  /**
   * Đăng xuất: vô hiệu hóa access token hiện tại và toàn bộ refresh token của user.
   * jti (JWT ID) được thêm vào Redis blacklist với TTL bằng thời hạn còn lại của access token.
   */
  async logout(userId: string, jti: string): Promise<{ message: string }> {
    // Revoke toàn bộ refresh token — đăng xuất khỏi tất cả thiết bị
    await this.refreshTokenRepo.update({ userId, revoked: false }, { revoked: true });

    // Blacklist jti trong Redis để Gateway từ chối access token này ngay lập tức,
    // dù token vẫn chưa hết hạn về mặt thời gian
    const ttl = parseTtl(this.config.get<string>('JWT_ACCESS_EXPIRES_IN'));
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);

    return { message: 'Logged out successfully' };
  }

  /**
   * Bước 1 quên mật khẩu: gửi OTP xác minh danh tính.
   * TTL 600 giây (10 phút) để người dùng có thêm thời gian.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Email not found');

    const otp = await this.otpService.createOtp(`reset:${dto.email}`, 600);
    await this.mailService.sendOtp(dto.email, otp, 'Đặt lại mật khẩu');

    return { message: 'OTP sent to your email' };
  }

  /**
   * Bước 2 quên mật khẩu: xác minh OTP rồi cập nhật mật khẩu mới.
   * Sau khi đổi mật khẩu, revoke toàn bộ refresh token để buộc đăng nhập lại trên mọi thiết bị.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await this.otpService.verifyOtp(`reset:${dto.email}`, dto.otp);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
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
      { sub: user.id, email: user.email, role: user.role, jti },
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
