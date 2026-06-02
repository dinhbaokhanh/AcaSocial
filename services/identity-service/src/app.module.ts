import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './common/redis.module';
import { RefreshToken } from './users/refresh-token.entity';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
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

    // Global module — cung cấp REDIS_CLIENT cho toàn bộ ứng dụng, không cần import lại
    RedisModule,

    AuthModule,   // Đăng ký, đăng nhập, OTP, JWT
    UsersModule,  // Quản lý thông tin cá nhân người dùng
  ],
})
export class AppModule {}
