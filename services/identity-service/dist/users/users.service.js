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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = require("bcrypt");
const cloudinary_1 = require("cloudinary");
const ioredis_1 = require("ioredis");
const typeorm_2 = require("typeorm");
const mail_service_1 = require("../mail/mail.service");
const otp_service_1 = require("../otp/otp.service");
const refresh_token_entity_1 = require("./refresh-token.entity");
const user_entity_1 = require("./user.entity");
let UsersService = class UsersService {
    constructor(userRepo, refreshTokenRepo, config, mailService, otpService) {
        this.userRepo = userRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.config = config;
        this.mailService = mailService;
        this.otpService = otpService;
        this.redis = new ioredis_1.default({
            host: config.get('REDIS_HOST'),
            port: config.get('REDIS_PORT'),
        });
        cloudinary_1.v2.config({
            cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
            api_key: config.get('CLOUDINARY_API_KEY'),
            api_secret: config.get('CLOUDINARY_API_SECRET'),
        });
    }
    getProfile(user) {
        const { passwordHash, ...profile } = user;
        return profile;
    }
    async updateProfile(user, dto) {
        user.fullName = dto.fullName;
        if (dto.dateOfBirth)
            user.dateOfBirth = new Date(dto.dateOfBirth);
        return this.userRepo.save(user);
    }
    async uploadAvatar(user, file) {
        const result = await new Promise((resolve, reject) => {
            cloudinary_1.v2.uploader
                .upload_stream({ folder: 'avatars', resource_type: 'image' }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            })
                .end(file.buffer);
        });
        user.avatarUrl = result.secure_url;
        await this.userRepo.save(user);
        return { avatarUrl: result.secure_url };
    }
    async changePassword(user, dto, jti) {
        const match = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!match)
            throw new common_1.BadRequestException('Current password is incorrect');
        if (dto.newPassword !== dto.confirmPassword) {
            throw new common_1.BadRequestException('New password and confirmation do not match');
        }
        user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
        await this.userRepo.save(user);
        await this.refreshTokenRepo.update({ userId: user.id }, { revoked: true });
        const ttl = this.parseTtl(this.config.get('JWT_ACCESS_EXPIRES_IN'));
        await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
        return { message: 'Password changed successfully. Please login again.' };
    }
    async requestChangeEmail(user, dto) {
        const existing = await this.userRepo.findOne({ where: { email: dto.newEmail } });
        if (existing)
            throw new common_1.ConflictException('Email already in use');
        const otp = await this.otpService.createOtp(`change-email:${user.id}:${dto.newEmail}`, 300);
        await this.mailService.sendOtp(dto.newEmail, otp, 'Xác thực thay đổi email');
        return { message: 'OTP sent to new email address' };
    }
    async confirmChangeEmail(user, dto) {
        const existing = await this.userRepo.findOne({ where: { email: dto.newEmail } });
        if (existing)
            throw new common_1.ConflictException('Email already in use');
        const valid = await this.otpService.verifyOtp(`change-email:${user.id}:${dto.newEmail}`, dto.otp);
        if (!valid)
            throw new common_1.BadRequestException('Invalid or expired OTP');
        user.email = dto.newEmail;
        await this.userRepo.save(user);
        return { message: 'Email updated successfully' };
    }
    async updatePrivacy(user, dto) {
        user.privacy = dto.privacy;
        await this.userRepo.save(user);
        return { message: 'Privacy settings updated' };
    }
    async deleteAccount(user, dto, jti) {
        const match = await bcrypt.compare(dto.password, user.passwordHash);
        if (!match)
            throw new common_1.UnauthorizedException('Incorrect password');
        await this.refreshTokenRepo.update({ userId: user.id }, { revoked: true });
        const ttl = this.parseTtl(this.config.get('JWT_ACCESS_EXPIRES_IN'));
        await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
        await this.userRepo.softDelete(user.id);
        return { message: 'Account deleted successfully' };
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
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        mail_service_1.MailService,
        otp_service_1.OtpService])
], UsersService);
//# sourceMappingURL=users.service.js.map