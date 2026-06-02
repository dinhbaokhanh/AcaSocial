import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis.provider';

/**
 * JwtStrategy là nơi Passport xác minh JWT mỗi khi có request đến endpoint được bảo vệ.
 *
 * Luồng hoạt động:
 * 1. JwtAuthGuard kích hoạt strategy này
 * 2. Passport tự extract token từ header "Authorization: Bearer <token>"
 * 3. Passport verify chữ ký JWT bằng JWT_SECRET
 * 4. Nếu hợp lệ, gọi hàm validate() với payload đã giải mã
 * 5. Kết quả trả về từ validate() được gắn vào req.user cho controller dùng
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  /**
   * Được gọi sau khi Passport xác minh chữ ký JWT thành công.
   * Kiểm tra thêm 2 điều trước khi chấp nhận request:
   * 1. jti (JWT ID) chưa bị revoke trong Redis blacklist
   * 2. User vẫn còn tồn tại trong DB (tránh trường hợp user bị xóa nhưng token vẫn còn hạn)
   */
  async validate(req: any, payload: { sub: string; jti: string; email: string }) {
    // Kiểm tra token có nằm trong blacklist không (user đã logout hoặc đổi mật khẩu)
    const isBlacklisted = await this.redis.get(`blacklist:${payload.jti}`);
    if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    // Gắn jti vào user object để AuthService dùng khi logout (cần biết jti để blacklist)
    return { ...user, jti: payload.jti };
  }
}
