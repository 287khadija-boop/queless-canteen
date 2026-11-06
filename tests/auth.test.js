import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { authorize } from '../src/middleware/authorize.js';

test('Authentication System & Endpoints Test Suite', async (t) => {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  // 1. Unauthenticated Me Route
  await t.test('GET /api/v1/me rejects request without token with 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me`);
    assert.equal(res.status, 401);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  // 2. Invalid Token
  await t.test('GET /api/v1/me rejects invalid bearer token with 401 INVALID_SESSION', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me`, {
      headers: {
        Authorization: 'Bearer invalid.bogus.jwt',
      },
    });
    assert.equal(res.status, 401);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_SESSION');
  });

  // 3. Registration Validation
  await t.test('POST /api/v1/auth/register validates required fields and formats', async () => {
    // Missing fields
    const res1 = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad' }),
    });
    assert.equal(res1.status, 400);
    const body1 = await res1.json();
    assert.equal(body1.success, false);
    assert.equal(body1.error.code, 'VALIDATION_ERROR');

    // Short password
    const res2 = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Student',
        college_identifier: '21RH1A0501',
        email: 'student@mrecw.ac.in',
        password: '123',
      }),
    });
    assert.equal(res2.status, 400);
    const body2 = await res2.json();
    assert.equal(body2.success, false);
    assert.ok(body2.error.message.includes('Password must be at least 6 characters'));
  });

  // 4. Login with Invalid Credentials
  await t.test('POST /api/v1/auth/login rejects wrong password with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@mrecw.ac.in',
        password: 'WrongPassword999!',
        portal: 'student',
      }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_CREDENTIALS');
  });

  // 5. Successful Student Login (Demo/Campus Mode)
  let studentToken = null;
  await t.test('POST /api/v1/auth/login succeeds for valid Student credentials', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@mrecw.ac.in',
        password: 'Student123!',
        portal: 'student',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.session.access_token);
    assert.equal(body.data.profile.role, 'student');
    assert.equal(body.data.profile.college_identifier, '21RH1A0501');

    studentToken = body.data.session.access_token;
  });

  // 6. Role-Portal Mismatch Protection
  await t.test('POST /api/v1/auth/login blocks Student trying to access Admin portal', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@mrecw.ac.in',
        password: 'Student123!',
        portal: 'admin',
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'ROLE_PORTAL_MISMATCH');
  });

  // 7. Successful Staff Login
  await t.test('POST /api/v1/auth/login succeeds for Staff Kitchen portal', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@mrecw.ac.in',
        password: 'Staff123!',
        portal: 'staff',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.profile.role, 'staff');
  });

  // 8. Successful Admin Login
  await t.test('POST /api/v1/auth/login succeeds for Admin Console portal', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@mrecw.ac.in',
        password: 'Admin123!',
        portal: 'admin',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.profile.role, 'admin');
  });

  // 9. Profile Retrieval with Authenticated Session
  await t.test('GET /api/v1/me returns verified profile with valid Bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.email, 'student@mrecw.ac.in');
    assert.equal(body.data.role, 'student');
  });

  // 10. Profile Update
  await t.test('PATCH /api/v1/me updates permitted fields with valid Bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ full_name: 'Khadija Updated' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.full_name, 'Khadija Updated');
  });

  // 11. Logout
  await t.test('POST /api/v1/auth/logout clears session and returns 200', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  // 12. Role Authorization Middleware check
  await t.test('authorize() middleware permits matching role and blocks mismatched role', async () => {
    const adminOnly = authorize('admin');

    let capturedError = null;
    const mockReqStudent = { user: { role: 'student' } };
    adminOnly(mockReqStudent, {}, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError);
    assert.equal(capturedError.statusCode, 403);
    assert.equal(capturedError.code, 'FORBIDDEN');

    let passed = false;
    const mockReqAdmin = { user: { role: 'admin' } };
    adminOnly(mockReqAdmin, {}, (err) => {
      if (!err) passed = true;
    });
    assert.equal(passed, true);
  });
});
