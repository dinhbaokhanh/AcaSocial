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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let OtpService = class OtpService {
    constructor(config) {
        this.config = config;
        this.redis = new ioredis_1.default({
            host: config.get('REDIS_HOST'),
            port: config.get('REDIS_PORT'),
        });
    }
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async createOtp(key, ttlSeconds = 300) {
        const otp = this.generateCode();
        await this.redis.set(`otp:${key}`, otp, 'EX', ttlSeconds);
        return otp;
    }
    async verifyOtp(key, otp) {
        const stored = await this.redis.get(`otp:${key}`);
        if (!stored || stored !== otp)
            return false;
        await this.redis.del(`otp:${key}`);
        return true;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OtpService);
//# sourceMappingURL=otp.service.js.map