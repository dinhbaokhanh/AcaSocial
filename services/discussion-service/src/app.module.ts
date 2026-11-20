import { ReputationJournal1792100000000 } from './events/reputation-journal.migration';
import { ReputationSnapshotsController } from './events/reputation-snapshots.controller';
import { ReputationEvents1792000000000 } from './events/reputation-events.migration';
import { RoomLifecycle1791700000000 } from './room-lifecycle.migration';
import { AiCases1791800000000 } from './moderation/ai-cases.migration';
import { RoomAdministration1791600000000 } from './room-administration.migration';
import { RoomPostPolicy1791200000000 } from './events/room-post-policy.migration';
import { MajorCourseContext1791300000000 } from './events/major-course-context.migration';
import { TagCourse1791400000000 } from './events/tag-course.migration';
import { AnonymousAlias1791500000000 } from './events/anonymous-alias.migration';
import { AnonymousAlias } from './common/anonymous-alias.entity';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from './discussions/entities/discussion.entity';
import { DiscussionMedia } from './discussions/entities/discussion-media.entity';
import { Tag } from './tags/entities/tag.entity';
import { DiscussionsModule } from './discussions/discussions.module';
import { CommentsModule } from './comments/comments.module';
import { Comment } from './comments/entities/comment.entity';
import { VotesModule } from './votes/votes.module';
import { Vote } from './votes/entities/vote.entity';
import { TagsModule } from './tags/tags.module';
import { EventsModule } from './events/events.module';
import { DiscussionOutbox1789090000000 } from './events/outbox.migration';
import { DiscussionBaseline1790200000000 } from './events/discussion-baseline.migration';
import { ContentModule } from './common/content.module';
import { CommunityFoundation1790201000000 } from './events/community-foundation.migration';
import { Room, RoomAcademicBinding, RoomMembership, RoomRule } from './rooms/room.entity';
import { RoomsModule } from './rooms/rooms.module';
import {
  Answer,
  AnswerAcceptance,
  AnswerRevision,
} from './answers/answer.entity';
import { AnswersModule } from './answers/answers.module';
import { DiscussionRevision, DiscussionTagAssignment } from './discussions/entities/discussion-revision.entity';
import { ContentReport, ModerationAuditLog, ModerationCase, ModerationReview } from './moderation/moderation.entity';
import { ModerationModule } from './moderation/moderation.module';
import { TrustGovernance1790300000000 } from './events/trust-governance.migration';

import { RemoveAcademicVerification1790800000000 } from './events/remove-academic-verification.migration';
import { SeedProvenance1790910000000 } from './events/seed-provenance.migration';

import { PostPublication1791000000000 } from './events/post-publication.migration';

@Module({
  controllers: [ReputationSnapshotsController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Kết nối PostgreSQL — discussion_db riêng biệt với identity_db
    // synchronize: true tự động tạo/cập nhật bảng theo entity — chỉ dùng khi development
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
        entities: [
          Discussion, DiscussionMedia, Tag, Comment, Vote,
          Room, RoomAcademicBinding, RoomMembership, RoomRule,
          Answer, AnswerRevision, AnswerAcceptance,
          DiscussionRevision, DiscussionTagAssignment,
          ModerationReview,
          ContentReport, ModerationCase, ModerationAuditLog,
          AnonymousAlias,
        ],
        synchronize:
          config.get<string>('NODE_ENV') !== 'production' &&
          config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        migrations: [
          DiscussionOutbox1789090000000,
          DiscussionBaseline1790200000000,
          CommunityFoundation1790201000000,
          TrustGovernance1790300000000,
          RemoveAcademicVerification1790800000000,
          SeedProvenance1790910000000,
          PostPublication1791000000000,
          RoomPostPolicy1791200000000,
          MajorCourseContext1791300000000,
          TagCourse1791400000000,
          AnonymousAlias1791500000000,
          RoomAdministration1791600000000,
          RoomLifecycle1791700000000,
          AiCases1791800000000,
          ReputationEvents1792000000000,
          ReputationJournal1792100000000,
        ],
        migrationsRun: true,
        logging: false,
      }),
    }),

    ContentModule,
    DiscussionsModule,
    CommentsModule,
    VotesModule,
    TagsModule,
    EventsModule,
    RoomsModule,
    AnswersModule,
    ModerationModule,
  ],
})
export class AppModule {}
