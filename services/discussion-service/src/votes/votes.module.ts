import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vote } from './entities/vote.entity';
import { Discussion } from '../discussions/entities/discussion.entity';
import { Comment } from '../comments/entities/comment.entity';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';
import { RoomsModule } from '../rooms/rooms.module';
import { Answer } from '../answers/answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vote, Discussion, Comment, Answer]), RoomsModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
