import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from './media/media.entity';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Kết nối PostgreSQL — cùng DB instance với identity-service,
    // nhưng tách schema bảng (media_assets) để dễ migrate độc lập.
    // synchronize: true chỉ dùng khi development, production dùng migration.
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
        entities: [MediaAsset],
        synchronize: true,
        logging: false,
      }),
    }),

    MediaModule,
  ],
})
export class AppModule {}
