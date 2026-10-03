import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { authenticated, lockPost, requireManager, requireOpen, requireReadable, requireApproved } from '../common/content-policy';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import { Discussion } from '../discussions/entities/discussion.entity';
import { PostStatus } from '../discussions/enums/post-status.enum';
import { PostType } from '../discussions/enums/post-type.enum';
import { OutboxService } from '../events/outbox.service';
import { MentionService } from '../common/mention.service';
import { ContentPresenter } from '../common/content-presenter';
import { TargetType } from '../votes/enums/target-type.enum';
import { RoomsService } from '../rooms/rooms.service';
import {
  Answer,
  AnswerAcceptance,
  AnswerRevision,
} from './answer.entity';
import {
  AcceptAnswerDto,
  CreateAnswerDto,
  UpdateAnswerDto,
} from './answer.dto';

@Injectable()
export class AnswersService {
  constructor(
    private readonly db: DataSource,
    private readonly rooms: RoomsService,
    private readonly outbox: OutboxService,
    private readonly mentions: MentionService,
    private readonly presenter: ContentPresenter,
  ) {}

  async create(discussionId: string, dto: CreateAnswerDto, user: GatewayUser) {
    const authorId = authenticated(user);
    const id = await this.db.transaction(async (manager) => {
      const question = await lockPost(manager, discussionId);
      requireOpen(question);
      requireApproved(question);
      if (question.postType !== PostType.QUESTION)
        throw new BadRequestException('Only questions accept answers');
      if (question.roomId) await this.rooms.assertCanPost(question.roomId, user);
      const answer = await manager.save(Answer, manager.create(Answer, {
        discussionId,
        moderationStatus: 'approved', visibility: 'visible',
        authorId,
        content: dto.content,
        isAnonymous: dto.isAnonymous ?? false,
      }));
      await manager.save(AnswerRevision, manager.create(AnswerRevision, {
        answerId: answer.id,
        contentVersion: 1,
        content: answer.content,
        revisionType: 'semantic',
        editedBy: authorId,
      }));
      question.answerCount += 1;
      if (question.status === PostStatus.OPEN) question.status = PostStatus.OPEN;
      await manager.save(question);
      if (question.authorId !== authorId) await this.outbox.event(manager, 'answer.created', {
        recipientId: question.authorId, actorId: answer.isAnonymous ? null : authorId,
        answerId: answer.id, discussionId, discussionTitle: question.title,
      });
      await this.mentions.emit(manager, answer.content, authorId, {
        entityType: 'answer', entityId: answer.id, discussionId, discussionTitle: question.title,
      });
      return answer.id;
    });
    return this.findOne(id);
  }

  async list(discussionId: string, user: GatewayUser = { id: null, role: null }) {
    const question = await this.db.getRepository(Discussion).findOneBy({ id: discussionId });
    if (!question)
      throw new NotFoundException('Question not found');
    requireReadable(question, user);
    if (question.roomId) await this.rooms.findOne(question.roomId, user);
    const qb = this.db.getRepository(Answer).createQueryBuilder('a')
      .where('a.discussionId = :discussionId', { discussionId });
    const answers = await qb.orderBy('a.createdAt', 'ASC').getMany();
    const presented = await this.presenter.many(answers, user, TargetType.ANSWER);
    const canAcceptAnswer = !!user.id && this.canAccept(question, user);
    return presented.map((answer) => ({ ...answer, canAcceptAnswer }));
  }

  async findOne(id: string) {
    const answer = await this.db.getRepository(Answer).findOneBy({ id });
    if (!answer) throw new NotFoundException('Answer not found');
    return answer;
  }

  async update(id: string, dto: UpdateAnswerDto, user: GatewayUser) {
    const actor = authenticated(user);
    await this.db.transaction(async (manager) => {
      const { answer, question } = await this.lockAnswerAndQuestion(manager, id);
      requireManager(answer.authorId, user);
      requireOpen(question);
      if (answer.contentVersion !== dto.expectedVersion)
        throw new ConflictException('Answer changed; reload');
      if (answer.content === dto.content) return;
      answer.content = dto.content;
      answer.contentVersion += 1;
      answer.moderationStatus = 'approved';
      answer.visibility = 'visible';
      await manager.save(answer);
      await manager.save(AnswerRevision, manager.create(AnswerRevision, {
        answerId: answer.id,
        contentVersion: answer.contentVersion,
        content: answer.content,
        revisionType: dto.revisionType,
        editedBy: actor,
      }));
      if (dto.revisionType === 'semantic' && question.acceptedAnswerId === answer.id) {
        await this.revokeAcceptance(manager, question, actor, 'answer_edited');
      }
    });
    return this.findOne(id);
  }

  async remove(id: string, user: GatewayUser) {
    const actor = authenticated(user);
    await this.db.transaction(async (manager) => {
      const { answer, question } = await this.lockAnswerAndQuestion(manager, id);
      requireManager(answer.authorId, user);
      requireOpen(question);
      if (question.acceptedAnswerId === answer.id)
        await this.revokeAcceptance(manager, question, actor, 'answer_deleted');
      await manager.softDelete(Answer, { id });
      question.answerCount = Math.max(0, question.answerCount - 1);
      await manager.save(question);
      await this.outbox.event(manager, 'content.deleted', {
        entityType: 'answer', entityId: id, discussionId: question.id,
      });
    });
    return { message: 'Answer deleted' };
  }

  async accept(discussionId: string, dto: AcceptAnswerDto, user: GatewayUser) {
    const actor = authenticated(user);
    await this.db.transaction(async (manager) => {
      const question = await lockPost(manager, discussionId);
      requireOpen(question);
      if (question.postType !== PostType.QUESTION)
        throw new BadRequestException('Only questions can have an accepted answer');
      if (!this.canAccept(question, user))
        throw new ForbiddenException('Only the question author or an admin can accept an answer');
      requireApproved(question);
      const answer = await manager.findOne(Answer, {
        where: { id: dto.answerId }, lock: { mode: 'pessimistic_write' },
      });
      if (!answer || answer.discussionId !== question.id)
        throw new BadRequestException('Answer does not belong to this question');
      if (answer.authorId === actor) throw new BadRequestException('You cannot accept your own answer');
      if (
        question.contentVersion !== dto.expectedQuestionVersion ||
        answer.contentVersion !== dto.expectedAnswerVersion
      ) throw new ConflictException('Question or answer changed; reload');
      await this.revokeAcceptance(manager, question, actor, 'replaced');
      await manager.save(AnswerAcceptance, manager.create(AnswerAcceptance, {
        discussionId: question.id,
        answerId: answer.id,
        questionVersion: question.contentVersion,
        answerVersion: answer.contentVersion,
        acceptedBy: actor,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
      }));
      question.acceptedAnswerId = answer.id;
      question.acceptedCommentId = null;
      question.status = PostStatus.SOLVED;
      await manager.save(question);
      await this.outbox.event(manager, 'answer.accepted', {
        discussionId: question.id, answerId: answer.id, answerVersion: answer.contentVersion,
        recipientId: answer.authorId, actorId: actor, discussionTitle: question.title,
      });
    });
    return this.findOne(dto.answerId);
  }

  async removeAcceptance(discussionId: string, user: GatewayUser) {
    const actor = authenticated(user);
    await this.db.transaction(async (manager) => {
      const question = await lockPost(manager, discussionId);
      if (!this.canAccept(question, user))
        throw new ForbiddenException('Only the question author or an admin can revoke acceptance');
      await this.revokeAcceptance(manager, question, actor, 'author_revoked');
    });
    return { message: 'Acceptance revoked' };
  }

  private canAccept(question: Discussion, user: GatewayUser) {
    return !!user.id && (question.authorId === user.id || user.role === 'admin');
  }

  private async revokeAcceptance(
    manager: EntityManager,
    question: Discussion,
    actor: string,
    reason: string,
  ) {
    if (!question.acceptedAnswerId) return;
    await manager.update(
      AnswerAcceptance,
      { discussionId: question.id, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedBy: actor, revokeReason: reason },
    );
    question.acceptedAnswerId = null;
    question.status = PostStatus.OPEN;
    await manager.save(question);
  }

  private async lockAnswerAndQuestion(manager: EntityManager, id: string) {
    const existing = await manager.findOneBy(Answer, { id });
    if (!existing) throw new NotFoundException('Answer not found');
    const question = await lockPost(manager, existing.discussionId);
    const answer = await manager.findOne(Answer, {
      where: { id }, lock: { mode: 'pessimistic_write' },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    return { answer, question };
  }
}
