import { ForbiddenException } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { Discussion } from '../discussions/entities/discussion.entity';
import { PostStatus } from '../discussions/enums/post-status.enum';
import { PostType } from '../discussions/enums/post-type.enum';
import { AnswerAcceptance } from './answer.entity';
import { AnswersService } from './answers.service';

function fixture(acceptedAnswerId: string | null = null) {
  const question = {
    id: 'question', authorId: 'owner', postType: PostType.QUESTION,
    status: acceptedAnswerId ? PostStatus.SOLVED : PostStatus.OPEN,
    contentVersion: 1, acceptedAnswerId, acceptedCommentId: null,
    moderationStatus: 'approved', visibility: 'visible',
  };
  const answer = {
    id: 'answer', discussionId: question.id, authorId: 'contributor',
    content: 'Original answer content', contentVersion: 1,
    visibility: 'visible', moderationStatus: 'approved', aiRecommendedAction: null,
  };
  const manager = {
    findOne: jest.fn(async (entity: unknown) => entity === Discussion ? question : answer),
    findOneBy: jest.fn(async () => answer),
    create: jest.fn((_entity: unknown, value: unknown) => value),
    save: jest.fn(async (value: unknown) => value),
    update: jest.fn(async () => ({})),
  };
  const db = {
    transaction: async (action: (m: typeof manager) => Promise<unknown>) => action(manager),
    getRepository: () => ({ findOneBy: async () => answer }),
  };
  const service = new AnswersService(
    db as unknown as DataSource,
    {} as never,
    { event: jest.fn() } as never,
    {} as never,
    {} as never,
  );
  return { service, manager, question, answer };
}

const acceptance = { answerId: 'answer', expectedQuestionVersion: 1, expectedAnswerVersion: 1 };

describe('Answer acceptance without academic verification', () => {
  it('accepts answers without approval, ignoring old moderation and AI fields', async () => {
    const { service, answer, manager } = fixture();
    answer.moderationStatus = 'pending';
    (answer as unknown as { aiRecommendedAction: string }).aiRecommendedAction = 'allow';
    await service.accept('question', acceptance, { id: 'owner', role: 'student' });
    expect(manager.save).toHaveBeenCalled();
  });
  it.each(['teacher', 'student', 'moderator'])('does not let an unrelated %s accept an answer', async (role) => {
    const { service, manager } = fixture();
    await expect(service.accept('question', acceptance, { id: 'other', role }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it.each([{ id: 'owner', role: 'teacher' }, { id: 'admin', role: 'admin' }])(
    'retains acceptance for $role with the proper authority', async (user) => {
      const { service, question, manager } = fixture();
      await service.accept('question', acceptance, user);
      expect(question.acceptedAnswerId).toBe('answer');
      expect(question.status).toBe(PostStatus.SOLVED);
      expect(manager.create).toHaveBeenCalledWith(AnswerAcceptance, expect.objectContaining({
        questionVersion: 1, answerVersion: 1, acceptedBy: user.id,
      }));
    },
  );

  it('does not let teacher status revoke another question acceptance', async () => {
    const { service, manager } = fixture('answer');
    await expect(service.removeAcceptance('question', { id: 'other', role: 'teacher' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('preserves the accepted answer when another answer changes', async () => {
    const { service, question, manager } = fixture('different-answer');
    await service.update('answer', {
      content: 'Changed answer content', expectedVersion: 1, revisionType: 'semantic',
    }, { id: 'contributor', role: 'teacher' });
    expect(question.acceptedAnswerId).toBe('different-answer');
    expect(question.status).toBe(PostStatus.SOLVED);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('revokes only the active acceptance when its answer changes', async () => {
    const { service, question, manager } = fixture('answer');
    await service.update('answer', {
      content: 'Changed answer content', expectedVersion: 1, revisionType: 'semantic',
    }, { id: 'contributor', role: 'teacher' });
    expect(question.acceptedAnswerId).toBeNull();
    expect(question.status).toBe(PostStatus.OPEN);
    expect(manager.update).toHaveBeenCalledWith(AnswerAcceptance,
      { discussionId: 'question', revokedAt: IsNull() },
      expect.objectContaining({ revokeReason: 'answer_edited' }));
  });
});
