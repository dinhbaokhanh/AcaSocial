import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis.provider';

/**
 * OtpService quản lý vòng đời của mã OTP (One-Time Password) 6 chữ số.
 * OTP được lưu trong Redis với TTL (thời gian sống) — tự hết hạn mà không cần cron job.
 *
 * Bảo vệ chống brute-force:
 * - Sau MAX_ATTEMPTS lần sai, key bị khóa thêm LOCKOUT_SECONDS giây.
 * - Trong thời gian khóa, mọi lần thử đều bị từ chối với 429.
 * - Lock key tự xóa sau khi hết TTL — không cần cleanup thủ công.
 *
 * Key convention trong Redis:
 *   otp:<key>          — giá trị OTP
 *   otp_fail:<key>     — số lần sai liên tiếp
 *   otp_lock:<key>     — khóa brute-force (tồn tại = đang bị khóa)
 */
@Injectable()
export class OtpService {
  private static readonly MAX_ATTEMPTS = 5;       // Số lần sai tối đa trước khi khóa
  private static readonly LOCKOUT_SECONDS = 300;  // Thời gian khóa: 5 phút

  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  // randomInt() dùng CSPRNG của OS — không thể dự đoán như Math.random()
  private generateCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  /**
   * Tạo OTP mới, reset fail counter, và lưu vào Redis với TTL cho trước.
   * Ghi đè OTP cũ nếu đã tồn tại (trường hợp gửi lại).
   */
  async createOtp(key: string, ttlSeconds = 300): Promise<string> {
    const otp = this.generateCode();

    // MULTI/EXEC: ba lệnh chạy như một khối, không lệnh nào của client khác chen vào giữa
    await this.redis
      .multi()
      .set(`otp:${key}`, otp, 'EX', ttlSeconds)
      .del(`otp_fail:${key}`) // reset fail counter khi OTP mới được tạo
      .del(`otp_lock:${key}`) // xóa lock cũ nếu có
      .exec();

    return otp;
  }

  /**
   * Kiểm tra lock → so OTP → đếm lần sai → khóa, tất cả trong một script Lua.
   * Redis chạy script nguyên tử nên nhiều request song song không thể cùng đọc
   * OTP trước khi bộ đếm tăng (vượt giới hạn MAX_ATTEMPTS).
   *
   * Trả về {mã, ttl}: 1 = đúng, 0 = sai hoặc hết hạn, -1 = đang bị khóa (kèm TTL),
   * -2 = vừa đạt giới hạn và bị khóa.
   */
  private static readonly VERIFY_SCRIPT = `
    if redis.call('EXISTS', KEYS[3]) == 1 then
      return {-1, redis.call('TTL', KEYS[3])}
    end
    local stored = redis.call('GET', KEYS[1])
    if not stored then return {0, 0} end
    if stored == ARGV[1] then
      redis.call('DEL', KEYS[1], KEYS[2])
      return {1, 0}
    end
    local fails = redis.call('INCR', KEYS[2])
    redis.call('EXPIRE', KEYS[2], ARGV[3])
    if fails >= tonumber(ARGV[2]) then
      redis.call('SET', KEYS[3], '1', 'EX', ARGV[3])
      redis.call('DEL', KEYS[1], KEYS[2])
      return {-2, 0}
    end
    return {0, 0}
  `;

  /**
   * Xác minh OTP người dùng nhập vào với bảo vệ brute-force.
   * OTP đúng bị xóa ngay (one-time use); sai MAX_ATTEMPTS lần thì khóa và hủy OTP.
   *
   * @throws HttpException 429 khi bị lockout
   * @returns true nếu OTP đúng, false nếu sai hoặc hết hạn
   */
  async verifyOtp(key: string, otp: string): Promise<boolean> {
    const [code, ttl] = (await this.redis.eval(
      OtpService.VERIFY_SCRIPT,
      3,
      `otp:${key}`,
      `otp_fail:${key}`,
      `otp_lock:${key}`,
      otp,
      OtpService.MAX_ATTEMPTS,
      OtpService.LOCKOUT_SECONDS,
    )) as [number, number];

    if (code === -1) {
      throw new HttpException(
        `Quá nhiều lần thử sai. Vui lòng thử lại sau ${ttl} giây.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (code === -2) {
      throw new HttpException(
        `Quá nhiều lần thử sai. Vui lòng yêu cầu mã OTP mới sau ${OtpService.LOCKOUT_SECONDS / 60} phút.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return code === 1;
  }
}
