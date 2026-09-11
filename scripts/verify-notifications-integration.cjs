// Run inside the notification container; uses real PostgreSQL, NATS and HTTP/SSE.
// Get-Content scripts/verify-notifications-integration.cjs -Raw | docker compose exec -T notification-service node
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { DataSource } = require('typeorm');
const { ConfigService } = require('@nestjs/config');
const { connect, StringCodec } = require('nats');
const { Notification } = require('./dist/notifications/entities/notification.entity');
const { InboxEvent } = require('./dist/notifications/entities/inbox-event.entity');
const { NotificationsService } = require('./dist/notifications/notifications.service');

async function main() {
  const db = await new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, entities: [Notification, InboxEvent],
  }).initialize();
  const recipientId = randomUUID();
  const eventIds = [randomUUID(), randomUUID()];
  const repository = db.getRepository(Notification);
  const service = new NotificationsService(repository, new ConfigService(process.env));
  let nats;
  const controller = new AbortController();
  const base = `http://localhost:${process.env.PORT || 8085}/notifications`;
  const request = (path = '', user = recipientId, method = 'GET') => fetch(base + path, {
    method, headers: user ? { 'X-User-ID': user } : {}, signal: AbortSignal.timeout(5000),
  });
  try {
    const event = { eventId: eventIds[0], eventType: 'comment.created', data: {
      recipientId, actorId: 'private-actor', actorName: 'Private name', senderId: 'private-sender',
      isAnonymous: true, discussionTitle: 'Integration test', commentPreview: 'Anonymous comment',
    } };
    const results = await Promise.all(Array.from({ length: 20 }, () => service.processEvent(event)));
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await repository.countBy({ recipientId }), 1);
    assert.equal(await db.getRepository(InboxEvent).countBy({ eventId: event.eventId }), 1);
    const saved = results.find(Boolean);
    assert.equal(saved.actorId, null);
    assert.equal(saved.data.actorName, undefined);
    assert.equal(saved.data.senderId, undefined);
    console.log('PASS PostgreSQL: 20 concurrent deliveries, one inbox claim and one anonymous notification');

    assert.equal((await request('', null)).status, 401);
    assert.equal((await request('?limit=0')).status, 400);
    assert.equal((await request('/not-a-uuid/read', recipientId, 'PATCH')).status, 400);
    assert.equal((await request(`/${saved.id}/read`, randomUUID(), 'PATCH')).status, 404);
    assert.deepEqual(await (await request('', randomUUID())).json(), []);
    const reads = await Promise.all(Array.from({ length: 5 }, async () => {
      const response = await request(`/${saved.id}/read`, recipientId, 'PATCH');
      assert.equal(response.status, 200);
      return response.json();
    }));
    assert.ok(reads[0].readAt);
    assert.equal(new Set(reads.map((value) => value.readAt)).size, 1);
    console.log('PASS HTTP: authentication, validation, recipient isolation and concurrent first-read timestamp');

    const response = await fetch(base + '/stream', {
      headers: { 'X-User-ID': recipientId }, signal: controller.signal,
    });
    assert.equal(response.status, 200);
    const received = [];
    const stream = (async () => {
      let buffer = '';
      const decoder = new TextDecoder();
      try {
        for await (const chunk of response.body) {
          buffer += decoder.decode(chunk, { stream: true }).replace(/\r/g, '');
          let end;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
            if (data) received.push(JSON.parse(data));
          }
        }
      } catch (error) { if (!controller.signal.aborted) throw error; }
    })();
    nats = await connect({ servers: process.env.NATS_URL });
    const codec = StringCodec();
    const js = nats.jetstream();
    // Malformed messages must be terminated so subsequent valid events can proceed.
    await js.publish('ac.social.comment.created', codec.encode('{'));
    const payload = codec.encode(JSON.stringify({ ...event, eventId: eventIds[1] }));
    const publications = await Promise.all(Array.from({ length: 5 }, () => js.publish('ac.social.comment.created', payload)));
    const lastSequence = Math.max(...publications.map((ack) => ack.seq));
    const manager = await nats.jetstreamManager();
    let acknowledged = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const info = await manager.consumers.info(process.env.NATS_STREAM || 'ACASOCIAL_EVENTS', process.env.NATS_CONSUMER || 'notification-service');
      if (info.ack_floor.stream_seq >= lastSequence && received.some((value) => value.id)) {
        acknowledged = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(acknowledged, 'consumer/SSE did not settle within 10 seconds');
    assert.equal(await repository.countBy({ recipientId }), 2);
    assert.equal(received.length, 1, 'duplicate SSE notification');
    assert.equal(received[0].actorId, null);
    const readResponse = await request(`/${received[0].id}/read`, recipientId, 'PATCH');
    assert.equal(readResponse.status, 200);
    for (let attempt = 0; attempt < 50 && received.length < 2; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(received[1]?.id, received[0].id);
    assert.ok(received[1]?.readAt, 'read state was not broadcast over SSE');
    controller.abort();
    await stream;
    console.log('PASS JetStream + SSE: malformed event terminated, duplicate events ACKed once, read state broadcast');
  } finally {
    controller.abort();
    await nats?.drain();
    await repository.delete({ recipientId });
    await db.getRepository(InboxEvent).delete(eventIds);
    await db.destroy();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
