import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiscussionBaseline1790200000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      DO $$ BEGIN
        CREATE TYPE discussions_post_type_enum AS ENUM ('question', 'discussion');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE discussions_status_enum AS ENUM ('open', 'solved', 'closed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE votes_target_type_enum AS ENUM ('discussion', 'comment', 'answer');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE votes_vote_type_enum AS ENUM ('upvote', 'downvote');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS discussions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(300) NOT NULL,
        content text NOT NULL,
        post_type discussions_post_type_enum NOT NULL,
        status discussions_status_enum NOT NULL DEFAULT 'open',
        author_id uuid NOT NULL,
        is_anonymous boolean NOT NULL DEFAULT false,
        upvote_count integer NOT NULL DEFAULT 0,
        downvote_count integer NOT NULL DEFAULT 0,
        comment_count integer NOT NULL DEFAULT 0,
        view_count integer NOT NULL DEFAULT 0,
        accepted_comment_id uuid,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp
      );

      CREATE TABLE IF NOT EXISTS comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        discussion_id uuid NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        author_id uuid NOT NULL,
        content text NOT NULL,
        parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
        is_anonymous boolean NOT NULL DEFAULT false,
        upvote_count integer NOT NULL DEFAULT 0,
        downvote_count integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp
      );

      CREATE TABLE IF NOT EXISTS votes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        target_type votes_target_type_enum NOT NULL,
        target_id uuid NOT NULL,
        vote_type votes_vote_type_enum NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        UNIQUE (user_id, target_type, target_id)
      );

      CREATE TABLE IF NOT EXISTS tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL UNIQUE,
        slug varchar(120) NOT NULL UNIQUE,
        description text,
        usage_count integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS discussion_tags (
        discussion_id uuid NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (discussion_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS discussion_media (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        discussion_id uuid NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        media_id uuid NOT NULL,
        sort_order integer NOT NULL DEFAULT 0
      );
    `);
  }

  async down(): Promise<void> {
    throw new Error('The baseline also covers existing Discussion tables');
  }
}
