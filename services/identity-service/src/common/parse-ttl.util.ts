/**
 * Chuyển đổi chuỗi thời hạn JWT (vd: "15m", "2h", "7d") thành số giây.
 * Dùng để đặt TTL khi lưu key vào Redis (blacklist token, OTP, v.v.)
 * Mặc định 900 giây (15 phút) nếu không parse được.
 */
export function parseTtl(expires: string): number {
  if (!expires) return 900;
  const unit = expires.slice(-1);
  const value = parseInt(expires.slice(0, -1), 10);
  if (isNaN(value)) return 900;
  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  if (unit === 'h') return value * 3600;
  if (unit === 'd') return value * 86400;
  return 900;
}
