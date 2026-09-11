import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryService } from './cloudinary.service';
import { MediaAsset } from './media.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { InternalMediaController } from './internal-media.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaAsset]),
    ConfigModule, // CloudinaryService cần ConfigService để đọc credentials
  ],
  controllers: [MediaController, InternalMediaController],
  providers: [MediaService, CloudinaryService],
})
export class MediaModule {}
