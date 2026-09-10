// Run inside notification-service after creating a discussion and a comment:
// Get-Content scripts/verify-notification-redelivery.cjs -Raw | docker compose exec -T notification-service node
const assert = require("node:assert/strict");
const { connect, StringCodec } = require("nats");
const { Pool } = require("pg");

async function main() {
  const connection = await connect({ servers: process.env.NATS_URL });
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const manager = await connection.jetstreamManager();
    const stream = process.env.NATS_STREAM || "ACASOCIAL_EVENTS";
    for (const type of ["discussion.created", "comment.created"]) {
      const subject = `ac.social.${type}`;
      const stored = await manager.streams.getMessage(stream, {
        last_by_subj: subject,
      });
      const event = JSON.parse(StringCodec().decode(stored.data));
      assert.equal(event.eventType, type);
      assert.ok(event.eventId && event.data.recipientId);
      await connection.jetstream().publish(subject, stored.data);
      const last = await connection.jetstream().publish(subject, stored.data);
      let settled = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        const consumer = await manager.consumers.info(
          stream,
          process.env.NATS_CONSUMER || "notification-service",
        );
        if (consumer.ack_floor.stream_seq >= last.seq) {
          settled = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      assert.ok(settled, "consumer did not acknowledge the duplicate events");
      const result = await pool.query(
        "SELECT count(*)::int AS count FROM notifications WHERE type = $1 AND data = $2::jsonb",
        [type, JSON.stringify(event.data)],
      );
      assert.equal(
        result.rows[0].count,
        1,
        "redelivery created duplicate notifications",
      );
      console.log(
        `PASS ${subject}: persisted in JetStream, delivered three times, one notification`,
      );
    }
  } finally {
    await pool.end();
    await connection.drain();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
