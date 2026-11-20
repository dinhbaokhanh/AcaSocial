require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../src/common/content-policy');
const { CasesService } = require('../src/moderation/cases.service');
const post = { id: 'post', contentVersion: 1, title: 'title', content: 'body', visibility: 'visible', moderationStatus: 'approved' };
policy.lockPost = async () => post;
const dto = { entityId: 'post', contentVersion: 1, reasonCode: 'spam' };
const user = { id: 'user' };
function service(query, managed = []) {
  const db = { query, transaction: fn => fn({ query }) };
  return new CasesService(db, { managedRoomIds: async () => managed }, { get: (_, fallback) => fallback });
}
test('report requires authentication', async () => {
  await assert.rejects(() => service(() => {}).report({}, dto), /Authentication/);
});
test('report rejects stale version', async () => {
  await assert.rejects(() => service(() => {}).report(user, { ...dto, contentVersion: 2 }), /Content changed/);
});
test('duplicate report does not enqueue or increment', async () => {
  let calls = 0;
  const s = service(async () => { calls++; return [{ id: 'existing' }]; });
  assert.deepEqual(await s.report(user, dto), { accepted: true });
  assert.equal(calls, 1);
});
test('new report creates case and job in transaction', async () => {
  const sql = [];
  const s = service(async (q) => {
    sql.push(q);
    if (q.includes('count(*)')) return [{ count: 0 }];
    if (q.includes('INSERT INTO moderation_cases')) return [{ id: 'case' }];
    return [];
  });
  await s.report(user, dto);
  assert.equal(sql.filter(q => q.includes('INSERT INTO ai_moderation_jobs')).length, 1);
  assert.equal(sql.filter(q => q.includes('report_count=report_count+1')).length, 1);
});
test('ordinary user cannot read moderation cases', async () => {
  await assert.rejects(() => service(() => {}).list(user, 'open'), /Room manager/);
});
test('concurrent claim loser is rejected', async () => {
  await assert.rejects(() => service(async () => [[], 0], ['room']).claim(user, 'case'), /Case unavailable/);
});
test('worker consumes UPDATE returning rows and skips obsolete content', async () => {
  const sql = [];
  const s = service(async q => {
    sql.push(q);
    if (q.includes('WITH picked')) return [[{ id: 'job', case_id: 'case', attempts: 1, content_version: 1 }], 1];
    return [];
  });
  await s.tick();
  assert.ok(sql.some(q => q.includes("state='stale'")));
});
