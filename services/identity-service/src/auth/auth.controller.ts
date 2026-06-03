import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IsEmail } from 'class-validator';

// DTO nội bộ dùng riêng cho endpoint resend-otp, không cần tạo file riêng
class ResendOtpDto {
  @IsEmail()
  email: string;
}

/**
 * AuthController xử lý toàn bộ luồng xác thực người dùng.
 * Tất cả route đều có prefix /auth (khai báo trong @Controller).
 *
 * Các endpoint không cần JWT: register, verify-otp, resend-otp, login, refresh, forgot-password, reset-password
 * Endpoint cần JWT: logout (phải biết jti của token để blacklist)
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Bước 1 của đăng ký: tạo tài khoản chưa xác thực và gửi OTP về email
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Bước 2 của đăng ký: xác minh OTP để kích hoạt tài khoản
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyRegisterOtp(dto);
  }

  // Gửi lại OTP nếu người dùng không nhận được hoặc OTP đã hết hạn
  @Post('resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email);
  }

  // Đăng nhập bằng email + password, trả về accessToken và refreshToken
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Cấp lại accessToken mới khi hết hạn, dùng refreshToken còn hiệu lực
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  // Đăng xuất: blacklist jti của access token hiện tại và revoke toàn bộ refresh token
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Request() req) {
    return this.authService.logout(req.user.id, req.user.jti);
  }

  // Bước 1 quên mật khẩu: gửi OTP xác minh danh tính về email
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // Bước 2 quên mật khẩu: xác minh OTP rồi đặt mật khẩu mới
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
