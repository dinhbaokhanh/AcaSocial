import { ConfigService } from '@nestjs/config';
export declare class OtpService {
    private config;
    private redis;
    constructor(config: ConfigService);
    private generateCode;
    createOtp(key: string, ttlSeconds?: number): Promise<string>;
    verifyOtp(key: string, otp: string): Promise<boolean>;
}
