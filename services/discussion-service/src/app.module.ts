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
import { ContentModule } from './common/content.module';

@Module({
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
        entities: [Discussion, DiscussionMedia, Tag, Comment, Vote],
        synchronize:
          config.get<string>('NODE_ENV') !== 'production' &&
          config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        migrations: [DiscussionOutbox1789090000000],
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
  ],
})
export class AppModule {}
