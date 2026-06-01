import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class OtpService {
  private redis: Redis;

  constructor(private config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT'),
    });
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createOtp(key: string, ttlSeconds = 300): Promise<string> {
    const otp = this.generateCode();
    await this.redis.set(`otp:${key}`, otp, 'EX', ttlSeconds);
    return otp;
  }

  async verifyOtp(key: string, otp: string): Promise<boolean> {
    const stored = await this.redis.get(`otp:${key}`);
    if (!stored || stored !== otp) return false;
    await this.redis.del(`otp:${key}`);
    return true;
  }
}
