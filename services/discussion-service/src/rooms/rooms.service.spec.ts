import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AcademicReferenceService } from '../common/academic-reference.service';
import { OutboxService } from '../events/outbox.service';
import { PostingPolicy, Room, RoomAcademicBinding, RoomMembership, RoomStatus, RoomVisibility } from './room.entity';
import { RoomsService } from './rooms.service';

function setup(overrides: Partial<Room> = {}) {
  const room = {
    id: 'room-1', status: RoomStatus.ACTIVE, visibility: RoomVisibility.PUBLIC,
    membershipPolicy: 'open', postingPolicy: PostingPolicy.MEMBERS, ...overrides,
  } as Room;
  const activeMembership = { roomId: room.id, userId: 'user-1', role: 'member', status: 'active' };
  const insertBuilder = { insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(), orIgnore: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
  const roomRepo = { findOneBy: jest.fn().mockResolvedValue(room) };
  const membershipRepo = {
    findOneBy: jest.fn().mockResolvedValueOnce(null).mockResolvedValue(activeMembership),
    createQueryBuilder: jest.fn().mockReturnValue(insertBuilder),
  };
  const bindingRepo = { findOneBy: jest.fn().mockResolvedValue(null) };
  const db = {
    getRepository: jest.fn((entity: unknown) => entity === Room
      ? roomRepo
      : entity === RoomMembership ? membershipRepo : bindingRepo),
  } as unknown as DataSource;
  const service = new RoomsService(db, {} as AcademicReferenceService, {} as OutboxService);
  return { service, insertBuilder, membershipRepo };
}

describe('RoomsService.assertCanPost', () => {
  it('joins a public open room before allowing its first post', async () => {
    const { service, insertBuilder } = setup();
    const result = await service.assertCanPost('room-1', { id: 'user-1', role: 'student' });

    expect(result.room.id).toBe('room-1');
    expect(insertBuilder.values).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 'room-1', userId: 'user-1', role: 'member', status: 'active',
    }));
  });

  it('does not auto-join an approval room', async () => {
    const { service, insertBuilder } = setup({ membershipPolicy: 'approval' });

    await expect(service.assertCanPost('room-1', { id: 'user-1', role: 'student' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(insertBuilder.insert).not.toHaveBeenCalled();
  });
});
