import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from './entities/discussion.entity';
import { DiscussionMedia } from './entities/discussion-media.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Comment } from '../comments/entities/comment.entity';
import { DiscussionsController } from './discussions.controller';
import { DiscussionsService } from './discussions.service';
import { NatsModule } from '../common/nats/nats.module';
import { InternalAttachmentsController } from './internal-attachments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Discussion, DiscussionMedia, Tag, Comment]),
    NatsModule,
  ],
  controllers: [DiscussionsController, InternalAttachmentsController],
  providers: [DiscussionsService],
  exports: [DiscussionsService], // Export để Phase 3 (Comments) có thể inject
})
export class DiscussionsModule {}
