import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

test('System Health & Scaffolding Tests', async (t) => {
  // Start server on an ephemeral port for testing
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test('GET /health returns 200 OK and healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, 'healthy');
    assert.equal(body.institution, 'Malla Reddy Engineering College for Women');
    assert.ok(body.timestamp);
    assert.ok(body.operating_hours.includes('09:00 - 16:00'));
  });

  await t.test('GET /api/v1 returns 200 OK and API meta', async () => {
    const res = await fetch(`${baseUrl}/api/v1`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.version, 'v1');
    assert.equal(body.data.service, 'Quesless Campus API');
  });

  await t.test('GET /api/v1/invalid-route returns 404 with structured error', async () => {
    const res = await fetch(`${baseUrl}/api/v1/invalid-route`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'ROUTE_NOT_FOUND');
    assert.ok(body.error.message.includes('Endpoint GET /api/v1/invalid-route not found'));
  });
});
