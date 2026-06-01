import {
  BadRequestException,
  ConflictException,
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

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
    private otpService: OtpService,
  ) {
    this.redis = new Redis({
      host: config.get<string>('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT'),
    });
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      email: dto.email,
      passwordHash,
      isVerified: false,
    });
    await this.userRepo.save(user);

    const otp = await this.otpService.createOtp(`register:${dto.email}`, 300);
    await this.mailService.sendOtp(dto.email, otp, 'Xác thực đăng ký tài khoản');

    return { message: 'Registration successful. Please verify your email with OTP.' };
  }

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

  async resendOtp(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Account already verified');

    const otp = await this.otpService.createOtp(`register:${email}`, 300);
    await this.mailService.sendOtp(email, otp, 'Xác thực đăng ký tài khoản');

    return { message: 'OTP resent successfully' };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isVerified) throw new UnauthorizedException('Account not verified');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');

    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    return this.generateTokens(stored.user);
  }

  async logout(userId: string, jti: string): Promise<{ message: string }> {
    await this.refreshTokenRepo.update({ userId, revoked: false }, { revoked: true });

    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES_IN');
    const ttl = this.parseTtl(accessExpires);
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Email not found');

    const otp = await this.otpService.createOtp(`reset:${dto.email}`, 600);
    await this.mailService.sendOtp(dto.email, otp, 'Đặt lại mật khẩu');

    return { message: 'OTP sent to your email' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await this.otpService.verifyOtp(`reset:${dto.email}`, dto.otp);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);

    await this.refreshTokenRepo.update({ userId: user.id }, { revoked: true });

    return { message: 'Password reset successfully. Please login again.' };
  }

  private async generateTokens(user: User) {
    const jti = randomUUID();
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, jti },
      { expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') as StringValue },
    );

    const refreshTokenRaw = randomUUID();
    const tokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({ tokenHash, expiresAt, userId: user.id }),
    );

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  private async findValidRefreshToken(raw: string, tokens: RefreshToken[]) {
    for (const token of tokens) {
      const match = await bcrypt.compare(raw, token.tokenHash);
      if (match) return token;
    }
    return null;
  }

  private parseTtl(expires: string): number {
    const unit = expires.slice(-1);
    const value = parseInt(expires.slice(0, -1));
    if (unit === 'm') return value * 60;
    if (unit === 'h') return value * 3600;
    if (unit === 'd') return value * 86400;
    return 900;
  }
}
