import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
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
export declare class AuthService {
    private userRepo;
    private refreshTokenRepo;
    private jwtService;
    private config;
    private mailService;
    private otpService;
    private redis;
    constructor(userRepo: Repository<User>, refreshTokenRepo: Repository<RefreshToken>, jwtService: JwtService, config: ConfigService, mailService: MailService, otpService: OtpService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    verifyRegisterOtp(dto: VerifyOtpDto): Promise<{
        message: string;
    }>;
    resendOtp(email: string): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refreshToken(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, jti: string): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    private generateTokens;
    private findValidRefreshToken;
    private parseTtl;
}
