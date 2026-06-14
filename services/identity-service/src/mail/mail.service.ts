import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * MailService chịu trách nhiệm gửi email qua SMTP (mặc định Gmail).
 * Hiện tại dùng cho: gửi OTP đăng ký, đặt lại mật khẩu, đổi email.
 */
@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('MAIL_HOST'),   // smtp.gmail.com
      port: config.get<number>('MAIL_PORT'),   // 587 (TLS)
      secure: false, // false = STARTTLS trên port 587, true = SSL trên port 465
      auth: {
        user: config.get<string>('MAIL_USER'),
        pass: config.get<string>('MAIL_PASS'), // Gmail App Password, không phải mật khẩu thường
      },
    });
  }

  /**
   * @param to      Địa chỉ email nhận
   * @param otp     Mã OTP 6 chữ số
   * @param subject 
   */
  async sendOtp(to: string, otp: string, subject: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM'),
      to,
      subject,
      html: `<p>Mã OTP của bạn là: <strong>${otp}</strong>. Mã có hiệu lực trong 5 phút.</p>`,
    });
  }
}
