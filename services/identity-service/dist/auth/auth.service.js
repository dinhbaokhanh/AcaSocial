"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const ioredis_1 = require("ioredis");
const typeorm_2 = require("typeorm");
const mail_service_1 = require("../mail/mail.service");
const otp_service_1 = require("../otp/otp.service");
const refresh_token_entity_1 = require("../users/refresh-token.entity");
const user_entity_1 = require("../users/user.entity");
let AuthService = class AuthService {
    constructor(userRepo, refreshTokenRepo, jwtService, config, mailService, otpService) {
        this.userRepo = userRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.jwtService = jwtService;
        this.config = config;
        this.mailService = mailService;
        this.otpService = otpService;
        this.redis = new ioredis_1.default({
            host: config.get('REDIS_HOST'),
            port: config.get('REDIS_PORT'),
        });
    }
    async register(dto) {
        const existing = await this.userRepo.findOne({
            where: { email: dto.email },
            withDeleted: true,
        });
        if (existing)
            throw new common_1.ConflictException('Email already registered');
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
    async verifyRegisterOtp(dto) {
        const user = await this.userRepo.findOne({ where: { email: dto.email } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.isVerified)
            throw new common_1.BadRequestException('Account already verified');
        const valid = await this.otpService.verifyOtp(`register:${dto.email}`, dto.otp);
        if (!valid)
            throw new common_1.BadRequestException('Invalid or expired OTP');
        user.isVerified = true;
        await this.userRepo.save(user);
        return { message: 'Account verified successfully' };
    }
    async resendOtp(email) {
        const user = await this.userRepo.findOne({ where: { email } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.isVerified)
            throw new common_1.BadRequestException('Account already verified');
        const otp = await this.otpService.createOtp(`register:${email}`, 300);
        await this.mailService.sendOtp(email, otp, 'Xác thực đăng ký tài khoản');
        return { message: 'OTP resent successfully' };
    }
    async login(dto) {
        const user = await this.userRepo.findOne({ where: { email: dto.email } });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!user.isVerified)
            throw new common_1.UnauthorizedException('Account not verified');
        const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatch)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return this.generateTokens(user);
    }
    async refreshToken(dto) {
        const tokenHash = (0, crypto_1.createHash)('sha256').update(dto.refreshToken).digest('hex');
        const stored = await this.refreshTokenRepo.findOne({
            where: { tokenHash },
            relations: ['user'],
        });
        if (!stored || stored.revoked || stored.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        stored.revoked = true;
        await this.refreshTokenRepo.save(stored);
        return this.generateTokens(stored.user);
    }
    async logout(userId, jti) {
        await this.refreshTokenRepo.update({ userId, revoked: false }, { revoked: true });
        const accessExpires = this.config.get('JWT_ACCESS_EXPIRES_IN');
        const ttl = this.parseTtl(accessExpires);
        await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
        return { message: 'Logged out successfully' };
    }
    async forgotPassword(dto) {
        const user = await this.userRepo.findOne({ where: { email: dto.email } });
        if (!user)
            throw new common_1.NotFoundException('Email not found');
        const otp = await this.otpService.createOtp(`reset:${dto.email}`, 600);
        await this.mailService.sendOtp(dto.email, otp, 'Đặt lại mật khẩu');
        return { message: 'OTP sent to your email' };
    }
    async resetPassword(dto) {
        const user = await this.userRepo.findOne({ where: { email: dto.email } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const valid = await this.otpService.verifyOtp(`reset:${dto.email}`, dto.otp);
        if (!valid)
            throw new common_1.BadRequestException('Invalid or expired OTP');
        user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
        await this.userRepo.save(user);
        await this.refreshTokenRepo.update({ userId: user.id }, { revoked: true });
        return { message: 'Password reset successfully. Please login again.' };
    }
    async generateTokens(user) {
        const jti = (0, crypto_1.randomUUID)();
        const accessToken = this.jwtService.sign({ sub: user.id, email: user.email, jti }, { expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') });
        const refreshTokenRaw = (0, crypto_1.randomUUID)();
        const tokenHash = (0, crypto_1.createHash)('sha256').update(refreshTokenRaw).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.refreshTokenRepo.save(this.refreshTokenRepo.create({ tokenHash, expiresAt, userId: user.id }));
        return { accessToken, refreshToken: refreshTokenRaw };
    }
    async findValidRefreshToken(raw, tokens) {
        for (const token of tokens) {
            const match = await bcrypt.compare(raw, token.tokenHash);
            if (match)
                return token;
        }
        return null;
    }
    parseTtl(expires) {
        const unit = expires.slice(-1);
        const value = parseInt(expires.slice(0, -1));
        if (unit === 'm')
            return value * 60;
        if (unit === 'h')
            return value * 3600;
        if (unit === 'd')
            return value * 86400;
        return 900;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService,
        otp_service_1.OtpService])
], AuthService);
//# sourceMappingURL=auth.service.js.map