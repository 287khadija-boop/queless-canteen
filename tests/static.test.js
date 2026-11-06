import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

test('Frontend Static Shell Serving Tests', async (t) => {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test('GET / serves index.html with 200 OK and MRECW branding', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('Quesless Campus'));
    assert.ok(text.includes('Malla Reddy Engineering College for Women'));
    assert.ok(text.includes('MRECW Canteen Digital Pre-Order System'));
  });

  await t.test('GET /login.html serves login shell with 200 OK', async () => {
    const res = await fetch(`${baseUrl}/login.html`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('Welcome Back'));
    assert.ok(text.includes('College Email Address'));
  });

  await t.test('GET /register.html serves registration shell with 200 OK', async () => {
    const res = await fetch(`${baseUrl}/register.html`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('Create Student Account'));
    assert.ok(text.includes('Hall Ticket / Roll Number'));
  });

  await t.test('GET /css/base.css serves CSS with 200 OK', async () => {
    const res = await fetch(`${baseUrl}/css/base.css`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('--color-primary: #059669;'));
  });
});
