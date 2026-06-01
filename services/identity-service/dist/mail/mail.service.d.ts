import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private config;
    private transporter;
    constructor(config: ConfigService);
    sendOtp(to: string, otp: string, subject: string): Promise<void>;
}
