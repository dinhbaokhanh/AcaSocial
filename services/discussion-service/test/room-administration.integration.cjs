// Run after building discussion-service, academic-service and notification-service.
// Uses a fresh PostgreSQL schema; never touches application tables.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const {
  NotificationsService,
} = require('../../notification-service/dist/notifications/notifications.service');
const {
  Notification,
} = require('../../notification-service/dist/notifications/entities/notification.entity');
const {
  InboxEvent,
} = require('../../notification-service/dist/notifications/entities/inbox-event.entity');
const { DataSource } = require('typeorm');
const { ConfigService } = require('@nestjs/config');
const { Module, ValidationPipe } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const {
  Room,
  RoomMembership,
  RoomAcademicBinding,
  RoomRule,
} = require('../dist/rooms/room.entity');
const { RoomsService } = require('../dist/rooms/rooms.service');
const {
  RoomLifecycleService,
} = require('../dist/rooms/room-lifecycle.service');
const {
  RoomsController,
  RoomAnnouncementsController,
} = require('../dist/rooms/rooms.controller');
const { OutboxService } = require('../dist/events/outbox.service');
const { lockRoomForWrite } = require('../dist/common/content-policy');
const {
  RoomAdministration1791600000000,
} = require('../dist/room-administration.migration');
const {
  RoomLifecycle1791700000000,
} = require('../dist/room-lifecycle.migration');
const {
  DiscussionOutbox1789090000000,
} = require('../dist/events/outbox.migration');
const academicEntities = require('../../academic-service/dist/entities');
const {
  AcademicService,
} = require('../../academic-service/dist/academic.service');
const {
  AcademicController,
} = require('../../academic-service/dist/academic.controller');
const {
  CourseAdministration1791600000000,
} = require('../../academic-service/dist/course-administration.migration');

test('admin CRUD and room lifecycle against PostgreSQL', async (t) => {
  const schema = `room_admin_test_${randomUUID().replaceAll('-', '')}`;
  const url = process.env.ROOM_ADMIN_TEST_DATABASE_URL;
  assert.ok(
    url,
    'Set ROOM_ADMIN_TEST_DATABASE_URL to a PostgreSQL test database URL',
  );
  const connection = new DataSource({ type: 'postgres', url });
  await connection.initialize();
  await connection.query(`CREATE SCHEMA "${schema}"`);
  // Search path lets raw domain SQL and TypeORM entities use the same isolated schema.
  const options = {
    type: 'postgres',
    uuidExtension: 'pgcrypto',
    url,
    extra: { options: `-c search_path=${schema},public` },
    synchronize: true,
  };
  const db = new DataSource({
    ...options,
    entities: [Room, RoomMembership, RoomAcademicBinding, RoomRule],
  });
  const academic = new DataSource({
    ...options,
    entities: Object.values(academicEntities).filter(
      (x) => typeof x === 'function',
    ),
  });
  const notificationDb = new DataSource({
    ...options,
    entities: [Notification, InboxEvent],
  });
  let app, academicApp;
  try {
    await db.initialize();
    await academic.initialize();
    await notificationDb.initialize();
    const qr = db.createQueryRunner();
    await new RoomAdministration1791600000000().up(qr);
    await new RoomLifecycle1791700000000().up(qr);
    await new DiscussionOutbox1789090000000().up(qr);
    await new CourseAdministration1791600000000().up(qr);
    await qr.release();
    await db.query(
      `CREATE TABLE discussions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),room_id uuid,author_id uuid,deleted_at timestamptz,visibility text DEFAULT 'visible')`,
    );
    const admin = { id: randomUUID(), role: 'admin' };
    const member = { id: randomUUID(), role: 'student' };
    const outsider = { id: randomUUID(), role: 'student' };
    const config = new ConfigService({ ROOM_CLOSURE_MIN_NOTICE_HOURS: '0' });
    const majorId = randomUUID();
    const academicReference = {
      major: async (id) => ({ id }),
      context: async (id) => ({
        majorCourseId: id,
        majorId,
        courseId: randomUUID(),
      }),
    };
    const rooms = new RoomsService(
      db,
      academicReference,
      new OutboxService(),
      config,
    );
    const lifecycle = new RoomLifecycleService(db, config, rooms);
    const catalog = new AcademicService(academic);
    class TestModule {}
    // Bind lifecycle API methods without starting background workers in this deterministic test.
    const lifecycleApi = Object.fromEntries(
      ['current', 'schedule', 'cancel', 'announcements'].map((name) => [
        name,
        lifecycle[name].bind(lifecycle),
      ]),
    );
    Module({
      controllers: [RoomsController, RoomAnnouncementsController],
      providers: [
        { provide: RoomsService, useValue: rooms },
        { provide: RoomLifecycleService, useValue: lifecycleApi },
        { provide: AcademicService, useValue: catalog },
        { provide: ConfigService, useValue: config },
        {
          provide: require('../../academic-service/node_modules/@nestjs/config')
            .ConfigService,
          useValue: config,
        },
      ],
    })(TestModule);
    app = await NestFactory.create(TestModule, {
      logger: ['error'],
      abortOnError: false,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    class AcademicTestModule {}
    const academicCommon = require('../../academic-service/node_modules/@nestjs/common');
    academicCommon.Module({
      controllers: [AcademicController],
      providers: [
        { provide: AcademicService, useValue: catalog },
        {
          provide: require('../../academic-service/node_modules/@nestjs/config')
            .ConfigService,
          useValue: config,
        },
      ],
    })(AcademicTestModule);
    academicApp =
      await require('../../academic-service/node_modules/@nestjs/core').NestFactory.create(
        AcademicTestModule,
        { logger: ['error'], abortOnError: false },
      );
    academicApp.useGlobalPipes(
      new academicCommon.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await academicApp.listen(0, '127.0.0.1');
    const academicBase = await academicApp.getUrl();
    const request = async (method, path, body, user = admin) => {
      const response = await fetch(
        (path.startsWith('/courses') ? academicBase : base) + path,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(user ? { 'X-User-ID': user.id, 'X-User-Role': user.role } : {}),
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        },
      );
      return { status: response.status, data: await response.json() };
    };
    const payload = {
      slug: 'admin-room',
      name: 'Admin room',
      roomType: 'forum',
    };
    let room;
    await t.test(
      'room metadata: role, DTO, audit, immutable slug, concurrent editors',
      async () => {
        const created = await request('POST', '/rooms', payload);
        assert.equal(created.status, 201, JSON.stringify(created.data));
        room = created.data;
        assert.equal(
          (
            await request(
              'PATCH',
              `/rooms/${room.id}`,
              { name: 'Other name', expectedVersion: 1 },
              null,
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await request(
              'PATCH',
              `/rooms/${room.id}`,
              { name: 'Other name', expectedVersion: 1 },
              member,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request('PATCH', `/rooms/${room.id}`, {
              slug: 'new-slug',
              expectedVersion: 1,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request('PATCH', `/rooms/${room.id}`, {
              name: null,
              expectedVersion: 1,
            })
          ).status,
          400,
        );
        assert.equal(
          (await request('PATCH', `/rooms/${room.id}`, { expectedVersion: 1 }))
            .status,
          400,
        );
        const edits = await Promise.all(
          ['First edit', 'Second edit'].map((name) =>
            request('PATCH', `/rooms/${room.id}`, { name, expectedVersion: 1 }),
          ),
        );
        assert.deepEqual(edits.map((x) => x.status).sort(), [200, 409]);
        room = (await request('GET', `/rooms/${room.id}`)).data;
        assert.equal(room.metadataVersion, 2);
        const [{ count }] = await db.query(
          'SELECT count(*) FROM catalog_audits WHERE entity_id=$1',
          [room.id],
        );
        assert.equal(Number(count), 2);
        assert.equal((await request('POST', '/rooms', payload)).status, 409);
      },
    );
    await t.test(
      'canonical room creation serializes duplicate contexts',
      async () => {
        const results = await Promise.all(
          ['major-one', 'major-two'].map((slug) =>
            request('POST', '/rooms', {
              slug,
              name: 'Major room',
              roomType: 'major',
              majorId,
            }),
          ),
        );
        assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
      },
    );
    await t.test(
      'course create/update: normalization, forbidden mutations and concurrency',
      async () => {
        const forbidden = await request(
          'POST',
          '/courses',
          { code: 'test', name: 'Course' },
          member,
        );
        assert.equal(forbidden.status, 403, JSON.stringify(forbidden.data));
        const created = await request('POST', '/courses', {
          code: ' test ',
          name: 'Test course',
        });
        assert.equal(created.status, 201, JSON.stringify(created.data));
        assert.equal(created.data.code, 'TEST');
        assert.equal(
          (
            await request('POST', '/courses', {
              code: 'TEST',
              name: 'Duplicate',
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request('PATCH', `/courses/${created.data.id}`, {
              code: 'NEW',
              expectedVersion: 1,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request('PATCH', `/courses/${created.data.id}`, {
              status: 'inactive',
              expectedVersion: 1,
            })
          ).status,
          400,
        );
        const edits = await Promise.all(
          ['Course one', 'Course two'].map((name) =>
            request('PATCH', `/courses/${created.data.id}`, {
              name,
              expectedVersion: 1,
            }),
          ),
        );
        assert.deepEqual(edits.map((x) => x.status).sort(), [200, 409]);
      },
    );
    await t.test(
      'schedule rules, cancellation versions and non-public announcements',
      async () => {
        config.set('ROOM_CLOSURE_MIN_NOTICE_HOURS', '168');
        assert.equal(
          (
            await request('POST', `/rooms/${room.id}/closure-schedule`, {
              closeAt: new Date(Date.now() + 10000).toISOString(),
              reason: 'Close room',
            })
          ).status,
          400,
        );
        config.set('ROOM_CLOSURE_MIN_NOTICE_HOURS', '0');
        const created = await request(
          'POST',
          `/rooms/${room.id}/closure-schedule`,
          {
            closeAt: new Date(Date.now() + 86400000).toISOString(),
            reason: 'Close room',
          },
        );
        assert.equal(created.status, 201, JSON.stringify(created.data));
        assert.equal(
          (
            await request('PATCH', `/rooms/${room.id}/status`, {
              status: 'read_only',
              expectedVersion: room.metadataVersion,
              reason: 'Close now',
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request('POST', `/rooms/${room.id}/closure-schedule/cancel`, {
              expectedVersion: 99,
              reason: 'Cancel schedule',
            })
          ).status,
          409,
        );
        const changed = await request(
          'PATCH',
          `/rooms/${room.id}/closure-schedule`,
          {
            expectedVersion: 1,
            closeAt: new Date(Date.now() + 172800000).toISOString(),
            reason: 'Change closure date',
          },
        );
        assert.equal(changed.status, 200, JSON.stringify(changed.data));
        assert.equal(changed.data.version, 2);
        assert.equal(
          (
            await request('POST', `/rooms/${room.id}/closure-schedule/cancel`, {
              expectedVersion: 2,
              reason: 'Cancel schedule',
            })
          ).status,
          201,
        );
        await lifecycle.tick();
        const [{ count: stale }] = await db.query(
          "SELECT count(*) FROM discussion_outbox WHERE event_type IN ('room.closure.scheduled','room.closure.rescheduled') AND payload->>'roomId'=$1",
          [room.id],
        );
        assert.equal(
          Number(stale),
          0,
          'Do not dispatch outdated schedule versions',
        );
        const privateRoom = (
          await request('POST', '/rooms', {
            ...payload,
            slug: 'private-room',
            visibility: 'private',
          })
        ).data;
        await db
          .getRepository(RoomMembership)
          .save({
            roomId: privateRoom.id,
            userId: member.id,
            role: 'member',
            status: 'active',
            expiresAt: null,
          });
        await request('POST', `/rooms/${privateRoom.id}/closure-schedule`, {
          closeAt: new Date(Date.now() + 86400000).toISOString(),
          reason: 'Private closure',
        });
        const memberView = await request(
          'GET',
          '/room-announcements',
          undefined,
          member,
        );
        assert.ok(memberView.data.some((x) => x.room_id === privateRoom.id));
        await db
          .getRepository(RoomMembership)
          .update(
            { roomId: privateRoom.id, userId: member.id },
            { status: 'left' },
          );
        await lifecycle.tick();
        const [{ count: revoked }] = await db.query(
          "SELECT count(*) FROM discussion_outbox WHERE payload->>'roomId'=$1 AND payload->>'recipientId'=$2",
          [privateRoom.id, member.id],
        );
        assert.equal(
          Number(revoked),
          0,
          'Recheck recipient permissions before dispatch',
        );
        const visible = await request(
          'GET',
          '/room-announcements',
          undefined,
          outsider,
        );
        assert.ok(!visible.data.some((x) => x.room_id === privateRoom.id));
        assert.equal(
          (
            await request(
              'GET',
              `/rooms/${privateRoom.id}/closure-schedule`,
              undefined,
              outsider,
            )
          ).status,
          404,
        );
      },
    );
    await t.test(
      'rollback keeps metadata unchanged if audit cannot be written',
      async () => {
        const before = await rooms.findOne(room.id, admin);
        await db.query(
          `ALTER TABLE catalog_audits ADD CONSTRAINT reject_test_audit CHECK (action <> 'room.updated' OR after->>'name' <> 'Reject audit')`,
        );
        await assert.rejects(
          rooms.update(
            room.id,
            { name: 'Reject audit', expectedVersion: before.metadataVersion },
            admin,
          ),
        );
        assert.equal(
          (await rooms.findOne(room.id, admin)).metadataVersion,
          before.metadataVersion,
        );
        assert.equal((await rooms.findOne(room.id, admin)).name, before.name);
        await db.query(
          'ALTER TABLE catalog_audits DROP CONSTRAINT reject_test_audit',
        );
      },
    );
    await t.test(
      'deadline blocks writes before worker; concurrent worker retry has one effect',
      async () => {
        const scheduled = await request(
          'POST',
          `/rooms/${room.id}/closure-schedule`,
          {
            closeAt: new Date(Date.now() + 86400000).toISOString(),
            reason: 'Close for archive',
          },
        );
        assert.equal(scheduled.status, 201);
        await db.query(
          `UPDATE room_lifecycle_schedules SET close_at=clock_timestamp()-interval '1 second' WHERE id=$1`,
          [scheduled.data.id],
        );
        await db.query(
          `UPDATE rooms SET closure_at=clock_timestamp()-interval '1 second' WHERE id=$1`,
          [room.id],
        );
        await assert.rejects(
          db.transaction((m) => lockRoomForWrite(m, room.id)),
          /Room is not accepting/,
        );
        await Promise.all([lifecycle.tick(), lifecycle.tick()]);
        await lifecycle.tick();
        const after = await rooms.findOne(room.id, admin);
        assert.equal(after.status, 'read_only');
        const [{ count }] = await db.query(
          "SELECT count(*) FROM catalog_audits WHERE entity_id=$1 AND action='room.closed'",
          [room.id],
        );
        assert.equal(Number(count), 1);
        const [{ count: deliveries }] = await db.query(
          "SELECT count(*) FROM discussion_outbox WHERE event_type='room.closed' AND payload->>'roomId'=$1",
          [room.id],
        );
        assert.equal(Number(deliveries), 1);
        assert.equal(
          (
            await request(
              'PATCH',
              `/rooms/${room.id}/status`,
              {
                status: 'active',
                expectedVersion: after.metadataVersion,
                reason: 'Reopen for new term',
              },
              member,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request('PATCH', `/rooms/${room.id}/status`, {
              status: 'archived',
              expectedVersion: after.metadataVersion,
              reason: 'Archive term',
            })
          ).status,
          200,
        );
        const archived = await rooms.findOne(room.id, admin);
        assert.equal(
          (
            await request('PATCH', `/rooms/${room.id}/status`, {
              status: 'active',
              expectedVersion: archived.metadataVersion,
              reason: 'Reopen for new term',
            })
          ).status,
          200,
        );
        await db.transaction((m) => lockRoomForWrite(m, room.id));
      },
    );
    await t.test(
      'notification redelivery persists one inbox entry and hides private room text',
      async () => {
        const consumer = new NotificationsService(
          notificationDb.getRepository(Notification),
          config,
        );
        const [event] = await db.query(
          "SELECT * FROM discussion_outbox WHERE event_type='room.closed' AND payload->>'roomId'=$1",
          [room.id],
        );
        assert.ok(event);
        const envelope = {
          eventId: event.id,
          eventType: event.event_type,
          data: event.payload,
        };
        const delivered = await Promise.all([
          consumer.processEvent(envelope),
          consumer.processEvent(envelope),
        ]);
        assert.equal(delivered.filter(Boolean).length, 1);
        const saved = await notificationDb.getRepository(Notification).find();
        assert.equal(saved.length, 1);
        assert.ok(saved[0].body.includes('chỉ đọc'));
        assert.equal(saved[0].data.roomId, room.id);
        assert.ok(!saved[0].body.includes(room.name));
      },
    );
  } finally {
    if (app) await app.close();
    if (academicApp) await academicApp.close();
    if (academic.isInitialized) await academic.destroy();
    if (notificationDb.isInitialized) await notificationDb.destroy();
    if (db.isInitialized) await db.destroy();
    await connection.query(`DROP SCHEMA "${schema}" CASCADE`);
    await connection.destroy();
  }
});

test('gateway exposes authenticated room management routes with admin RBAC', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const { endpoints } = JSON.parse(
    readFileSync(resolve(__dirname, '../../../gateway/gateway.json'), 'utf8'),
  );
  for (const [endpoint, method] of [
    ['/api/rooms/{id}', 'PATCH'],
    ['/api/rooms/{id}/closure-schedule', 'POST'],
    ['/api/rooms/{id}/closure-schedule', 'PATCH'],
    ['/api/rooms/{id}/closure-schedule/cancel', 'POST'],
  ]) {
    const matching = endpoints.filter(
      (x) => x.endpoint === endpoint && x.method === method,
    );
    assert.equal(matching.length, 1);
    assert.equal(matching[0].auth_required, true);
    assert.deepEqual(matching[0].required_roles, ['admin']);
    assert.equal(matching[0].backend[0].url_pattern, endpoint.slice(4));
  }
  assert.ok(
    !endpoints.some(
      (x) =>
        x.method === 'DELETE' &&
        ['/api/rooms/{id}', '/api/courses/{id}'].includes(x.endpoint),
    ),
  );
});
