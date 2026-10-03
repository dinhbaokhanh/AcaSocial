import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ModerationReview } from '../ai/ai.entity';
import { ModerationService } from './moderation.service';
import { requireReadable } from '../common/content-policy';

function fixture() {
  const post = { id: 'post', authorId: 'owner', title: 'Question', content: 'Draft',
    contentVersion: 2, moderationStatus: 'pending', visibility: 'held',
    acceptedAnswerId: null, acceptedCommentId: null, status: 'open' };
  const repo = { findOneBy: jest.fn(async () => post), findOne: jest.fn(async () => post), save: jest.fn(), find: jest.fn(async () => []) };
  const manager = { getRepository: () => repo, findOne: jest.fn(async () => post),
    save: jest.fn(), create: jest.fn((_entity, value) => value), update: jest.fn() };
  const db = { getRepository: () => repo, transaction: jest.fn(async action => action(manager)) };
  const service = new ModerationService(db as unknown as DataSource);
  return { service, post, repo, manager, db };
}
const dto = { decision: 'allow' as const, expectedVersion: 2, expectedContent: 'Draft' };

describe('Manual admin approval', () => {
  it.each(['answer', 'comment'])('rejects approval requests for %s', async type => {
    const { service, db } = fixture();
    await expect(service.review(type as 'discussion', 'post', dto, { id: 'admin', role: 'admin' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each(['teacher', 'student'])('rejects review and queue access for %s', async role => {
    const { service, db } = fixture();
    await expect(service.queue({ id: 'user', role })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.review('discussion', 'post', dto, { id: 'user', role })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each(['admin', 'moderator'])('lets %s approve manually without AI', async role => {
    const { service, post, manager } = fixture();
    await service.review('discussion', 'post', dto, { id: 'admin', role });
    expect(post.moderationStatus).toBe('approved');
    expect(post.visibility).toBe('visible');
    expect(manager.create).toHaveBeenCalledWith(ModerationReview, expect.objectContaining({
      reviewerId: 'admin', decision: 'allow', relatedAiRunId: null,
    }));
  });
  it.each([{ expectedVersion: 1 }, { expectedContent: 'Old text' }])('rejects a stale decision: %j', async stale => {
    const { service, manager } = fixture();
    await expect(service.review('discussion', 'post', { ...dto, ...stale }, { id: 'admin', role: 'admin' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('allows the author, admin and moderator to read pending content', () => {
    const { post } = fixture();
    expect(() => requireReadable(post, { id: 'visitor', role: 'student' })).toThrow();
    expect(() => requireReadable(post, { id: 'reviewer', role: 'moderator' })).not.toThrow();
    expect(() => requireReadable(post, { id: null, role: null })).toThrow();
    expect(() => requireReadable(post, { id: 'owner', role: 'student' })).not.toThrow();
    expect(() => requireReadable(post, { id: 'admin', role: 'admin' })).not.toThrow();
  });
});
