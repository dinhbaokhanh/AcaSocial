import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity';
import { RefreshToken } from './users/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Không cần import lại ConfigModule ở các module khác
    }),

    // Kết nối PostgreSQL qua TypeORM
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
        // Chỉ dùng synchronize: true khi dev — tắt khi production, dùng migration thay thế
        synchronize: true,
        logging: false,
      }),
    }),

    // AuthModule, UsersModule, ProfileModule, OtpModule...
  ],
})
export class AppModule {}
