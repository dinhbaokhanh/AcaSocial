# Notification flow

Discussion service publishes JSON envelopes `{ eventId, eventType, data }` to
JetStream stream `ACASOCIAL_EVENTS`, on subjects `ac.social.discussion.created`
and `ac.social.comment.created`.

- `discussion.created`: the author receives confirmation of their new post.
- `comment.created`: the post author receives a notification when someone else
  comments. A comment on one's own post does not generate a notification.

The notification consumer claims `eventId` in `inbox_events` and inserts the
notification in one PostgreSQL transaction. Repeated deliveries create no
additional notification. Only after commit does the shared notification service
emit to SSE subscribers belonging to the recipient.

The frontend loads the most recent 30 notifications after login/session restore.
It connects to `/api/notifications/stream` using `fetch` with a Bearer header,
then loads the list again to cover the connection gap. SSE and REST records are
merged by notification ID. On disconnection it retries after three seconds and
reloads the list. Changing users resets the provider and aborts the old stream.
Mark-read actions persist through `PATCH /api/notifications/{id}/read`.

Gateway response wrappers support flushing; the SSE route clears the normal
30-second write deadline after authentication. Other routes retain that deadline.
The notification service emits a heartbeat every 15 seconds.

## Run locally

1. Copy `frontend/.env.example` to `frontend/.env.local` if the latter is absent.
2. Run `docker compose up -d --build` at the repository root. Discussion service
   uses `NATS_URL=nats://nats:4222` and waits for healthy NATS.
3. Run `npm run dev` in `frontend`, then open `http://localhost:3000`.
4. Log in as one user, open Notifications, and create a discussion with a valid
   tag. Its creation notification should appear without reloading.
5. Use a separate browser profile to comment as another user. The post author
   should receive the comment notification; the commenter should not.
6. Mark the notification read and reload. Both the record and read state should
   remain. Disconnect/reconnect the recipient browser and check that missed
   notifications load without duplicates.

The existing gateway rate limiter counts requests by IP across routes; login
has a lower threshold than ordinary requests. When running repeated local tests,
allow its one-minute window to expire between runs.

## Regression checks

- `cd gateway && go test ./...`
- `cd frontend && node --test src/lib/notifications/stream.test.mjs`
- `cd frontend && npx tsc --noEmit`
- `npm run build` in each of the two services.

For the real-browser regression, start Chrome with a dedicated test profile and
`--headless=new --remote-debugging-port=9222`, then run
`node scripts/verify-notifications-browser.mjs` from the repository root (Node
22+). It uses the existing seed accounts `trungkien99` and `lananh2k2`; override
`E2E_USER_A`, `E2E_USER_B`, and `E2E_PASSWORD` for other test accounts. The script
waits for the gateway rate-limit window, verifies live notifications, reload,
read persistence, recipient isolation, self-comments, a stream beyond 30 seconds,
and reconnection. It soft-deletes its discussion on success and writes evidence
to `tmp/notification-e2e/`. Use only a dedicated browser profile: the script
closes frontend tabs on that debugging endpoint and clears its local session.

Afterward, run the following PowerShell command to verify actual JetStream
redelivery and PostgreSQL deduplication for both event types:

```powershell
Get-Content scripts/verify-notification-redelivery.cjs -Raw | docker compose exec -T notification-service node
```

Publishing remains best-effort after database writes, matching the existing
discussion flow. A failed publish is logged; there is no transactional outbox to
recover events lost between the database commit and NATS. SSE fan-out is local
to the single notification-service instance used by this Compose stack.
