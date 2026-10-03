import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from '../discussions/entities/discussion.entity';
import { RoomsModule } from '../rooms/rooms.module';
import {
  Answer,
  AnswerAcceptance,
  AnswerRevision,
} from './answer.entity';
import { AnswersController } from './answers.controller';
import { AnswersService } from './answers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Discussion, Answer, AnswerRevision, AnswerAcceptance,
    ]),
    RoomsModule,
  ],
  controllers: [AnswersController],
  providers: [AnswersService],
  exports: [AnswersService],
})
export class AnswersModule {}
