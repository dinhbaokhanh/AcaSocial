import { EntityManager } from 'typeorm';
import { Room } from './room.entity';
export async function enqueueRoomNotification(
  m: EntityManager,
  room: Room,
  schedule: { id: string; version: number; close_at: Date | null },
  eventType: string,
  actor: string,
) {
  // Recipient snapshot and delivery checkpoint persist together with the domain change.
  // Generic notification text deliberately omits private room metadata.
  await m.query(
    `INSERT INTO room_notification_deliveries(schedule_id,schedule_version,event_type,recipient_id,room_id,payload)
      SELECT $1::uuid,$2::int,$3::text,c.user_id,$4::uuid,jsonb_build_object('roomId',$4::uuid::text,'scheduleId',$1::uuid::text,'scheduleVersion',$2::int,'actorId',$5::text,'closeAt',$6::text)
      FROM (SELECT user_id FROM room_memberships WHERE room_id=$4 AND status='active' AND (expires_at IS NULL OR expires_at>now())
        UNION SELECT author_id FROM discussions WHERE room_id=$4 AND deleted_at IS NULL AND author_id IS NOT NULL
        UNION SELECT created_by FROM rooms WHERE id=$4) c
      WHERE $7::text='public' OR EXISTS(SELECT 1 FROM room_memberships x WHERE x.room_id=$4 AND x.user_id=c.user_id AND x.status='active' AND (x.expires_at IS NULL OR x.expires_at>now()))
      ON CONFLICT DO NOTHING`,
    [
      schedule.id,
      schedule.version,
      eventType,
      room.id,
      actor,
      schedule.close_at,
      room.visibility,
    ],
  );
}
