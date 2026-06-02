import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * OtpService quản lý vòng đời của mã OTP (One-Time Password) 6 chữ số.
 * OTP được lưu trong Redis với TTL (thời gian sống) — tự hết hạn mà không cần cron job.
 *
 * Key convention trong Redis: "otp:<mục_đích>:<định_danh>"
 * Ví dụ:
 *   otp:register:user@email.com      — OTP xác thực đăng ký
 *   otp:reset:user@email.com         — OTP đặt lại mật khẩu
 *   otp:change-email:<userId>:<email> — OTP xác thực đổi email
 */
@Injectable()
export class OtpService {
  private redis: Redis;

  constructor(private config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT'),
    });
  }

  // Sinh số nguyên ngẫu nhiên 6 chữ số trong khoảng [100000, 999999]
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Tạo OTP mới và lưu vào Redis với TTL cho trước.
   * Nếu key đã tồn tại (gửi lại OTP), ghi đè lên giá trị cũ.
   * @param key     Định danh duy nhất cho mục đích OTP (vd: "register:user@email.com")
   * @param ttlSeconds  Thời gian hiệu lực tính bằng giây (mặc định 5 phút)
   * @returns       Mã OTP để gửi qua email
   */
  async createOtp(key: string, ttlSeconds = 300): Promise<string> {
    const otp = this.generateCode();
    await this.redis.set(`otp:${key}`, otp, 'EX', ttlSeconds);
    return otp;
  }

  /**
   * Xác minh OTP người dùng nhập vào.
   * Nếu đúng, xóa OTP khỏi Redis ngay lập tức — đảm bảo mỗi mã chỉ dùng được một lần.
   * @returns true nếu OTP hợp lệ và chưa hết hạn, false nếu sai hoặc đã hết hạn
   */
  async verifyOtp(key: string, otp: string): Promise<boolean> {
    const stored = await this.redis.get(`otp:${key}`);
    if (!stored || stored !== otp) return false;

    // Xóa ngay sau khi xác minh đúng — one-time use
    await this.redis.del(`otp:${key}`);
    return true;
  }
}
