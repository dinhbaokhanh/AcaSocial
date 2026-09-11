import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Vote } from '../votes/entities/vote.entity';
import { TargetType } from '../votes/enums/target-type.enum';
import { GatewayUser } from './decorators/current-user.decorator';
import { canManage } from './content-policy';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class ContentPresenter {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}
  async many<
    T extends {
      id: string;
      authorId: string;
      isAnonymous: boolean;
      deletedAt?: Date;
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
          `${this.config.get('IDENTITY_SERVICE_URL', 'http://localhost:8081')}/internal/users/display`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Token': this.config.get('INTERNAL_SERVICE_TOKEN', ''),
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
    return items.map((item) => ({
      ...item,
      authorId: item.isAnonymous || item.deletedAt ? null : item.authorId,
      author:
        item.isAnonymous || item.deletedAt
          ? undefined
          : profiles.find((p) => p.id === item.authorId),
      isMine: !!user.id && item.authorId === user.id,
      canManage: !item.deletedAt && canManage(item.authorId, user),
      canVote: !!user.id && item.authorId !== user.id && !item.deletedAt,
      myVote: votes.find((v) => v.targetId === item.id)?.voteType ?? null,
      ...(item.deletedAt
        ? { content: '[Bình luận đã xóa]', isAnonymous: true }
        : {}),
    }));
  }
}
