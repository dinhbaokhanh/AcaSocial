import { RoomsModule } from '../rooms/rooms.module';
import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [RoomsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
