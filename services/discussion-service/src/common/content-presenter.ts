import { createHmac } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Vote } from '../votes/entities/vote.entity';
import { TargetType } from '../votes/enums/target-type.enum';
import { GatewayUser } from './decorators/current-user.decorator';
import { canManage } from './content-policy';
import { ConfigService } from '@nestjs/config';
import { AnonymousAlias } from './anonymous-alias.entity';

// Hậu tố nickname hiển thị 1–99; 99 người ẩn danh đầu tiên của một bài không bị trùng số.
const MAX_ANONYMOUS_NUMBER = 99;

@Injectable()
export class ContentPresenter {
  private readonly logger = new Logger(ContentPresenter.name);
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}
  async many<
    T extends {
      id: string;
      authorId: string;
      discussionId?: string;
      isAnonymous: boolean;
      deletedAt?: Date | null;
      moderationStatus?: string;
      visibility?: string;
      pendingRevision?: unknown;
      moderationNote?: string;
    },
  >(items: T[], user: GatewayUser, type: TargetType) {
    const votes =
      user.id && items.length
        ? await this.db
            .getRepository(Vote)
            .findBy({
              userId: user.id,
              targetType: type,
              targetId: In(items.map((i) => i.id)),
            })
        : [];
    const ids = [
      ...new Set(
        items
          .filter((i) => !i.isAnonymous && !i.deletedAt)
          .map((i) => i.authorId),
      ),
    ];
    let profiles: { id: string; fullName: string }[] = [];
    if (ids.length) {
      try {
        const response = await fetch(
          `${this.config.getOrThrow<string>('IDENTITY_SERVICE_URL')}/internal/users/display`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Token': this.config.getOrThrow<string>('INTERNAL_SERVICE_TOKEN'),
            },
            body: JSON.stringify({ ids }),
            signal: AbortSignal.timeout(2000),
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) profiles = data;
        }
      } catch {
        /* Profile enrichment must not prevent reading discussions. */
      }
    }
    const aliasSecret =
      this.config.get<string>('ANONYMOUS_ALIAS_SECRET') ||
      this.config.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
    // Khoá ổn định theo (người dùng, bài) để frontend đặt cùng một nickname ẩn danh
    // trong một bài mà không lộ authorId; HMAC ngăn dò ngược từ danh sách user id.
    const threadOf = (item: T) =>
      type === TargetType.DISCUSSION ? item.id : item.discussionId;
    const anonymousKey = (item: T) =>
      createHmac('sha256', aliasSecret)
        .update(`${item.authorId}:${threadOf(item)}`)
        .digest('hex')
        .slice(0, 16);
    const anonymousSeqs = await this.anonymousSeqs(
      items
        .filter((i) => i.isAnonymous && !i.deletedAt && threadOf(i))
        .map((i) => ({ discussionId: threadOf(i)!, authorId: i.authorId })),
    );
    const anonymousNumber = (item: T) => {
      const seq = anonymousSeqs.get(`${threadOf(item)}:${item.authorId}`);
      return seq === undefined ? undefined : ((seq - 1) % MAX_ANONYMOUS_NUMBER) + 1;
    };
    return items.map((item) => ({
      ...item,
      pendingRevision: item.authorId === user.id ? item.pendingRevision : undefined,
      moderationNote: item.authorId === user.id || ['admin', 'moderator'].includes(user.role ?? '') ? item.moderationNote : undefined,
      authorId: item.isAnonymous || item.deletedAt ? null : item.authorId,
      author:
        item.isAnonymous || item.deletedAt
          ? undefined
          : profiles.find((p) => p.id === item.authorId),
      anonymousKey:
        item.isAnonymous && !item.deletedAt ? anonymousKey(item) : undefined,
      anonymousNumber:
        item.isAnonymous && !item.deletedAt ? anonymousNumber(item) : undefined,
      isMine: !!user.id && item.authorId === user.id,
      canManage: !item.deletedAt && canManage(item.authorId, user),
      canVote: (type !== TargetType.DISCUSSION || (['pending', 'approved'].includes(item.moderationStatus ?? '') && item.visibility === 'visible')) && !!user.id && item.authorId !== user.id && !item.deletedAt,
      myVote: votes.find((v) => v.targetId === item.id)?.voteType ?? null,
      ...(item.deletedAt
        ? { content: '[Bình luận đã xóa]', isAnonymous: true }
        : {}),
    }));
  }

  /** Lấy (hoặc cấp mới) số thứ tự ẩn danh cho từng cặp (bài, tác giả). */
  private async anonymousSeqs(pairs: { discussionId: string; authorId: string }[]) {
    const result = new Map<string, number>();
    const unique = [...new Map(pairs.map((p) => [`${p.discussionId}:${p.authorId}`, p])).values()];
    if (!unique.length) return result;
    const repo = this.db.getRepository(AnonymousAlias);
    try {
      const collect = (rows: AnonymousAlias[]) =>
        rows.forEach((r) => result.set(`${r.discussionId}:${r.authorId}`, r.seq));
      collect(await repo.findBy(unique));
      const missing = unique.filter((p) => !result.has(`${p.discussionId}:${p.authorId}`));
      if (!missing.length) return result;
      // Khoá theo bài (thứ tự cố định để tránh deadlock) để hai request không cấp trùng seq.
      const threads = [...new Set(missing.map((p) => p.discussionId))].sort();
      await this.db.transaction(async (m) => {
        for (const thread of threads) {
          await m.query('SELECT pg_advisory_xact_lock(hashtext($1))', [thread]);
          for (const p of missing.filter((x) => x.discussionId === thread)) {
            await m.query(
              `INSERT INTO anonymous_aliases (discussion_id, author_id, seq)
               SELECT $1, $2, COALESCE(MAX(seq), 0) + 1 FROM anonymous_aliases WHERE discussion_id = $1
               ON CONFLICT (discussion_id, author_id) DO NOTHING`,
              [thread, p.authorId],
            );
          }
        }
      });
      collect(await repo.findBy(missing));
    } catch (error) {
      // Thiếu số thì frontend tự suy ra hậu tố từ anonymousKey; không chặn việc đọc bài.
      this.logger.warn(`Could not assign anonymous aliases: ${String(error)}`);
    }
    return result;
  }
}
