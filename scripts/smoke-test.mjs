import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = (process.env.BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

async function request(method, path, body) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text === '' ? undefined : JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed };
}

async function waitForApi(attempts = 40) {
  let lastStatus;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await request('GET', '/health');
      if (response.status === 200) {
        return;
      }
      lastStatus = response.status;
    } catch {
      // The API may still be starting.
    }
    await delay(500);
  }

  throw new Error(
    `API health check did not return 200 at ${baseUrl} (last status: ${lastStatus ?? 'no response'}). ` +
      'Start it with `npm run dev` and check the terminal for errors.',
  );
}

function expect(result, status, label) {
  assert.equal(
    result.status,
    status,
    `${label}: expected ${status}, got ${result.status}: ${JSON.stringify(result.body)}`,
  );
  assert.equal(result.body?.success, true, `${label}: ${JSON.stringify(result.body)}`);
}

async function main() {
  await waitForApi();

  const health = await request('GET', '/health');
  expect(health, 200, 'health');

  const created = await request('POST', '/chat/create', {
    userAId: 'user_alice',
    userBId: 'user_bob',
  });
  assert.ok(
    created.status === 200 || created.status === 201,
    `create chat: expected 200/201, got ${created.status}: ${JSON.stringify(created.body)}`,
  );
  assert.equal(created.body.success, true);
  assert.match(created.body.data.chatId, /^[0-9a-f-]{36}$/);
  const chatId = created.body.data.chatId;
  console.info(`✓ health and create chat (${chatId})`);

  const text = `smoke test ${new Date().toISOString()}`;
  const sent = await request('POST', `/chat/${chatId}/message/send`, {
    senderId: 'user_alice',
    text,
  });
  expect(sent, 201, 'send message');
  const messageId = sent.body.data.id;
  console.info('✓ send message');

  const listed = await request('GET', `/chat/${chatId.toUpperCase()}/messages?limit=10`);
  expect(listed, 200, 'list messages with uppercase chat id');
  assert.ok(
    listed.body.data.some((message) => message.id === messageId),
    'list messages: sent message was not returned',
  );
  console.info('✓ list messages and uppercase UUID normalization');

  const firstRead = await request('POST', `/chat/${chatId}/message/${messageId}/read`, {
    userId: 'user_bob',
  });
  expect(firstRead, 200, 'mark read');
  assert.equal(typeof firstRead.body.data.readAt, 'string');

  const secondRead = await request('POST', `/chat/${chatId}/message/${messageId}/read`, {
    userId: 'user_bob',
  });
  expect(secondRead, 200, 'mark read again');
  assert.equal(secondRead.body.data.readAt, firstRead.body.data.readAt);
  console.info('✓ read receipt is idempotent');

  const lastSeen = await request('POST', `/chat/${chatId}/lastseen`, {
    userId: 'user_bob',
    messageId,
  });
  expect(lastSeen, 200, 'last seen');
  assert.equal(lastSeen.body.data.lastSeenMessageId, messageId);
  console.info('✓ last seen');

  const chats = await request('GET', '/user/user_alice/chats');
  expect(chats, 200, 'list user chats');
  assert.ok(
    chats.body.data.some((chat) => chat.chatId === chatId),
    'list user chats: created chat was not returned',
  );
  console.info('✓ list user chats');

  console.info(`\nSmoke test passed against ${baseUrl}`);
}

try {
  await main();
} catch (error) {
  console.error(`\nSmoke test failed against ${baseUrl}`);
  console.error(error instanceof Error ? error.message : error);
  console.error(
    'Check that PostgreSQL is seeded, the Firestore emulator is running, and the API is started with `npm run dev`.',
  );
  process.exitCode = 1;
}
