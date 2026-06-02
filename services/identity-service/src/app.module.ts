import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { OtpModule } from './otp/otp.module';
import { RefreshToken } from './users/refresh-token.entity';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

/**
 * AppModule là module gốc của toàn bộ ứng dụng.
 * NestJS đọc file này đầu tiên khi khởi động để biết cần load những gì.
 */
@Module({
  imports: [
    // ConfigModule.forRoot() đọc file .env và inject vào toàn bộ ứng dụng qua ConfigService.
    // isGlobal: true giúp không cần import lại ở từng module con.
    ConfigModule.forRoot({ isGlobal: true }),

    // Kết nối PostgreSQL, cấu hình được đọc từ biến môi trường thông qua ConfigService.
    // synchronize: true tự động tạo/cập nhật bảng theo entity — chỉ dùng khi development,
    // production nên dùng migration thay thế.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [User, RefreshToken],
        synchronize: true,
        logging: false,
      }),
    }),

    AuthModule,   // Đăng ký, đăng nhập, OTP, JWT
    UsersModule,  // Quản lý thông tin cá nhân người dùng
    MailModule,   // Gửi email (OTP, thông báo)
    OtpModule,    // Tạo và xác minh mã OTP qua Redis
  ],
})
export class AppModule {}
