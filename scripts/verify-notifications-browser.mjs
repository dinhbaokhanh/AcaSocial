// Requires Node 22+, the local stack, frontend, and a dedicated Chrome profile with --remote-debugging-port=9222.

import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("tmp/notification-e2e", { recursive: true });
const api = process.env.E2E_API_URL || "http://localhost:8080";
const frontend = process.env.E2E_FRONTEND_URL || "http://localhost:3000";
const debugging = process.env.E2E_CHROME_URL || "http://127.0.0.1:9222";
const userA = process.env.E2E_USER_A || "trungkien99";
const userB = process.env.E2E_USER_B || "lananh2k2";
const password = process.env.E2E_PASSWORD || "Password123!";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
for (const old of await fetch(debugging + "/json/list").then((r) => r.json()))
  if (old.type === "page" && old.url.startsWith(frontend))
    await fetch(debugging + "/json/close/" + old.id);
console.log("Waiting for local gateway rate-limit window");
await pause(61000);
const tab = await fetch(debugging + "/json/new?about:blank", {
  method: "PUT",
}).then((r) => r.json());
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const streams = [];
const errors = [];
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
  } else if (
    m.method === "Network.responseReceived" &&
    m.params.response.url.includes("/notifications/stream")
  )
    streams.push(m.params.response.status);
  else if (m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails.text);
};
const cdp = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await cdp("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
async function until(expression, label) {
  for (let i = 0; i < 120; i++) {
    if (await evaluate(expression)) return;
    await pause(500);
  }
  throw new Error(
    "Timed out: " + label + " " + (await evaluate("document.body.innerText")),
  );
}
async function request(path, token, method = "GET", body) {
  const r = await fetch(api + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(r.ok, path + " " + r.status + " " + (!r.ok ? await r.text() : ""));
  return r.status === 204 ? null : r.json();
}
const login = (identifier) =>
  request("/api/auth/login", null, "POST", { identifier, password });
const tokenB = (await login(userB)).accessToken;
await cdp("Page.enable");
await cdp("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, options = {}) => {
      if (!String(input).includes('/notifications/stream')) return originalFetch(input, options);
      const connection = new AbortController();
      options.signal?.addEventListener('abort', () => connection.abort(), { once: true });
      if (options.signal?.aborted) connection.abort();
      window.interruptNotificationStream = () => connection.abort();
      return originalFetch(input, { ...options, signal: connection.signal });
    };
  `,
});
await cdp("Runtime.enable");
await cdp("Network.enable");
await cdp("Page.navigate", { url: frontend + "/login" });
await until('!!document.querySelector("#login-identifier")', "login form");
await evaluate("localStorage.clear()");
await cdp("Page.reload");
await until('!!document.querySelector("#login-identifier")', "fresh login");
await pause(1500);
for (const [id, value] of [
  ["login-identifier", userA],
  ["login-password", password],
]) {
  await evaluate("document.getElementById(" + JSON.stringify(id) + ").focus()");
  await cdp("Input.insertText", { text: value });
}
await until(
  '!document.querySelector("button[type=submit]").disabled',
  "login enabled",
);
await evaluate('document.querySelector("button[type=submit]").click()');
await until(
  '!!document.querySelector("button[aria-label=Notifications]") && !location.pathname.includes("login")',
  "logged in without reload",
);
const tokenA = await evaluate('localStorage.getItem("sn_access_token")');
for (let i = 0; i < 30 && !streams.includes(200); i++) await pause(500);
assert.ok(streams.includes(200), "browser authenticated SSE");
const before = await request("/api/notifications?limit=30", tokenA);
const tags = await request("/api/tags");
const discussion = await request("/api/discussions", tokenA, "POST", {
  title: "Notification E2E " + Date.now(),
  content: "End-to-end notification verification",
  postType: "discussion",
  tagIds: [tags.data[0].id],
});
await evaluate(
  'document.querySelector("button[aria-label=Notifications]").click()',
);
const titleA = "Bài viết mới được tạo";
const titleB = "Có bình luận mới trên bài viết của bạn";
const countExpr = (title) =>
  '[...document.querySelectorAll("aside strong")].filter(e=>e.textContent===' +
  JSON.stringify(title) +
  ").length";
const expected =
  before.filter((n) => n.type === "discussion.created").length + 1;
await until(
  countExpr(titleA) + " >= " + expected,
  "discussion notification rendered live",
);
const commentBefore = await evaluate(countExpr(titleB));
const comment = await request(
  "/api/discussions/" + discussion.id + "/comments",
  tokenB,
  "POST",
  { content: "Comment from another account" },
);
await until(
  countExpr(titleB) + " === " + (commentBefore + 1),
  "comment notification rendered live",
);
const notifications = await request("/api/notifications?limit=30", tokenA);
const commentNotification = notifications.find(
  (n) => n.data.commentId === comment.id,
);
assert.ok(commentNotification);
assert.ok(commentNotification.data.actorName, 'public comment actor name resolved');
assert.ok(commentNotification.body.includes(discussion.title), 'notification contains discussion title');
assert.ok(commentNotification.body.includes('Comment from another account'), 'notification contains comment preview');
assert.equal(
  (await request("/api/notifications?limit=30", tokenB)).some(
    (n) => n.id === commentNotification.id,
  ),
  false,
);
await evaluate(
  '[...document.querySelectorAll("aside strong")].find(e=>e.textContent===' +
    JSON.stringify(titleB) +
    ').closest("button").click()',
);
await until('location.pathname === ' + JSON.stringify('/posts/' + discussion.id), 'notification opens the discussion');
for (let i = 0; i < 30; i++) {
  if (
    (await request("/api/notifications?limit=30", tokenA)).find(
      (n) => n.id === commentNotification.id,
    )?.readAt
  )
    break;
  await pause(200);
}
assert.ok(
  (await request("/api/notifications?limit=30", tokenA)).find(
    (n) => n.id === commentNotification.id,
  ).readAt,
  "read persisted",
);
await cdp("Page.reload");
await until(
  '!!document.querySelector("button[aria-label=Notifications]")',
  "reload",
);
await pause(1000);
await evaluate(
  'document.querySelector("button[aria-label=Notifications]").click()',
);
await until(
  countExpr(titleB) + " === " + (commentBefore + 1),
  "initial notifications restored",
);
await request(
  "/api/discussions/" + discussion.id + "/comments",
  tokenA,
  "POST",
  { content: "Own comment should not notify" },
);
await pause(1000);
assert.equal(
  (await request("/api/notifications?limit=30", tokenA)).filter(
    (n) => n.data.discussionId === discussion.id,
  ).length,
  2,
);
console.log(
  "PASS browser login, discussion SSE, comment SSE, recipient isolation, persisted read, initial reload, self-comment suppression",
);
// Keep the same stream past the gateway's former 30 second deadline.
const streamCount = streams.length;
await pause(35000);
assert.equal(streams.length, streamCount, "stream reconnected unexpectedly");
await request(
  "/api/discussions/" + discussion.id + "/comments",
  tokenB,
  "POST",
  { content: "Comment after 35 seconds" },
);
await until(
  countExpr(titleB) + " === " + (commentBefore + 2),
  "long lived SSE",
);
const visibleCount = await evaluate(countExpr(titleB));
const connectionsBeforeOffline = streams.filter((status) => status === 200).length;
await cdp("Network.emulateNetworkConditions", {
  offline: true,
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
});
// Explicitly terminate the existing response: Chrome offline emulation alone
// can leave an already established streaming connection alive.
await evaluate("window.interruptNotificationStream()");
await pause(4000);
await request(
  "/api/discussions/" + discussion.id + "/comments",
  tokenB,
  "POST",
  { content: "Comment while recipient is disconnected" },
);
await cdp("Network.emulateNetworkConditions", {
  offline: false,
  latency: 0,
  downloadThroughput: -1,
  uploadThroughput: -1,
});
await until(
  countExpr(titleB) + " === " + (visibleCount + 1),
  "reconnect catches missed notification",
);
console.log("PASS reconnect catches missed notification without duplicates");
for (let attempt = 0; attempt < 30; attempt++) {
  if (streams.filter((status) => status === 200).length > connectionsBeforeOffline) break;
  await pause(200);
}
assert.ok(
  streams.filter((status) => status === 200).length > connectionsBeforeOffline,
  "frontend did not establish a new SSE connection",
);
const anonymousPreview = 'Anonymous comment ' + Date.now();
const anonymousComment = await request(
  '/api/discussions/' + discussion.id + '/comments', tokenB, 'POST',
  { content: anonymousPreview, isAnonymous: true },
);
await until(
  'document.querySelector("aside")?.innerText.includes(' + JSON.stringify(anonymousPreview) + ')',
  'anonymous comment rendered live',
);
const anonymousNotification = (await request('/api/notifications?limit=30', tokenA))
  .find((n) => n.data.commentId === anonymousComment.id);
assert.ok(anonymousNotification);
assert.equal(anonymousNotification.actorId, null);
assert.equal(anonymousNotification.data.actorId, null);
assert.equal(anonymousNotification.data.actorName, undefined);
assert.equal(anonymousNotification.data.senderId, undefined);
assert.ok(anonymousNotification.body.startsWith('Người dùng ẩn danh'));
console.log('PASS anonymous notification hides actor identity');
const screenshot = await cdp("Page.captureScreenshot", { format: "png" });
writeFileSync(
  "tmp/notification-e2e/frontend.png",
  Buffer.from(screenshot.data, "base64"),
);
writeFileSync(
  "tmp/notification-e2e/result.json",
  JSON.stringify(
    {
      discussionId: discussion.id,
      commentId: comment.id,
      notificationId: commentNotification.id,
      streams,
      errors,
      passed: true,
    },
    null,
    2,
  ),
);
console.log(
  "PASS SSE after 35 seconds; evidence: tmp/notification-e2e/result.json and frontend.png",
);
await request("/api/discussions/" + discussion.id, tokenA, "DELETE");
await fetch(debugging + "/json/close/" + tab.id);
ws.close();
