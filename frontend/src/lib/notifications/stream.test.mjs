import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('./stream.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { consumeNotificationStream } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('SSE handles split UTF-8, CRLF boundaries, multiline data and heartbeats', async () => {
  const bytes = new TextEncoder().encode(': keepalive\r\n\r\ndata: {"title":\r\ndata: "Bình luận mới"}\r\n\r\nevent: heartbeat\ndata: \n\ndata: {"id":"second"}\n\n');
  const body = new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } });
  const messages = [];
  await consumeNotificationStream(body, (data) => messages.push(JSON.parse(data)));
  assert.deepEqual(messages, [{ title: 'Bình luận mới' }, { id: 'second' }]);
  assert.equal(body.locked, false);
});
