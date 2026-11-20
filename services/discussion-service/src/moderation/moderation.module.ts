import { RoomsModule } from '../rooms/rooms.module';
import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [RoomsModule],
  controllers: [ModerationController, CasesController],
  providers: [ModerationService, CasesService],
})
export class ModerationModule {}
