import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { DEMO_TOKENS } from '../src/middleware/authenticate.js';

test('Multi-Shop, Owner Dashboard & Student Ordering Test Suite', async (t) => {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  const studentToken = 'demo-student-token';
  const kbrOwnerToken = 'demo-kbr-token';
  const dragonOwnerToken = 'demo-dragon-token';
  const adminToken = 'demo-admin-token';
  const accountantToken = 'demo-accountant-token';

  let kbrShopId = null;
  let dragonShopId = null;
  let kbrItem1 = null;
  let dragonItem1 = null;
  let createdOrderId = null;

  // 1. GET /api/v1/shops
  await t.test('GET /api/v1/shops returns 5 independent campus shops', async () => {
    const res = await fetch(`${baseUrl}/api/v1/shops`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 5);

    const shopNames = body.data.map((s) => s.name);
    assert.ok(shopNames.includes('KBR Chicken'));
    assert.ok(shopNames.includes('Dragon Hub'));
    assert.ok(shopNames.includes('Brown Bear'));
    assert.ok(shopNames.includes('Milkshakes'));
    assert.ok(shopNames.includes('Wraps'));

    const kbr = body.data.find((s) => s.name === 'KBR Chicken');
    const dragon = body.data.find((s) => s.name === 'Dragon Hub');
    kbrShopId = kbr.id;
    dragonShopId = dragon.id;
  });

  // 2. GET /api/v1/shops/:id/menu
  await t.test('GET /api/v1/shops/:id/menu returns categories and menu items', async () => {
    const res = await fetch(`${baseUrl}/api/v1/shops/${kbrShopId}/menu`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.shop.name, 'KBR Chicken');
    assert.ok(body.data.categories.length > 0);
    assert.ok(body.data.items.length > 0);

    kbrItem1 = body.data.items[0];
    assert.ok(kbrItem1.price_paise > 0);

    // Get Dragon Hub item for cross-shop cart test
    const dRes = await fetch(`${baseUrl}/api/v1/shops/${dragonShopId}/menu`);
    const dBody = await dRes.json();
    dragonItem1 = dBody.data.items[0];
  });

  // 3. Student Pre-Order Placement with Single-Shop Rule
  await t.test('POST /api/v1/orders places order and allocates atomic token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        shopId: kbrShopId,
        items: [{ menuItemId: kbrItem1.id, quantity: 2 }],
        paymentMethod: 'counter',
        specialInstructions: 'Extra crispy please',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.token_number > 0);
    assert.equal(body.data.status, 'placed');
    assert.equal(body.data.canteen_id, kbrShopId);
    assert.equal(body.data.total_paise, kbrItem1.price_paise * 2);

    createdOrderId = body.data.id;
  });

  // 4. Cart Cross-Shop Rejection Check
  await t.test('POST /api/v1/orders rejects mixed-shop cart', async () => {
    const res = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        shopId: kbrShopId,
        items: [
          { menuItemId: kbrItem1.id, quantity: 1 },
          { menuItemId: dragonItem1.id, quantity: 1 }, // Belongs to Dragon Hub!
        ],
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.message.includes('does not belong to'));
  });

  // 5. Shop Owner Order Acceptance
  await t.test('POST /api/v1/owner/orders/:id/accept allows KBR owner to accept order', async () => {
    const res = await fetch(`${baseUrl}/api/v1/owner/orders/${createdOrderId}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kbrOwnerToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'accepted');
  });

  // 6. Shop Owner Isolation: Dragon Hub Owner CANNOT modify KBR order
  await t.test('Dragon Hub owner cannot advance or reject KBR order', async () => {
    const res = await fetch(`${baseUrl}/api/v1/owner/orders/${createdOrderId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dragonOwnerToken}`,
      },
      body: JSON.stringify({ status: 'preparing' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.message.includes('Unauthorized: Order does not belong to your shop'));
  });

  // 7. Advance Status Pipeline: accepted -> preparing -> ready -> collected
  await t.test('Shop owner can advance status through cooking and ready states', async () => {
    // 7a. To preparing
    const res1 = await fetch(`${baseUrl}/api/v1/owner/orders/${createdOrderId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kbrOwnerToken}`,
      },
      body: JSON.stringify({ status: 'preparing' }),
    });
    assert.equal(res1.status, 200);
    const b1 = await res1.json();
    assert.equal(b1.data.status, 'preparing');

    // 7b. To ready
    const res2 = await fetch(`${baseUrl}/api/v1/owner/orders/${createdOrderId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kbrOwnerToken}`,
      },
      body: JSON.stringify({ status: 'ready' }),
    });
    assert.equal(res2.status, 200);
    const b2 = await res2.json();
    assert.equal(b2.data.status, 'ready');

    // 7c. To collected
    const res3 = await fetch(`${baseUrl}/api/v1/owner/orders/${createdOrderId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kbrOwnerToken}`,
      },
      body: JSON.stringify({ status: 'collected' }),
    });
    assert.equal(res3.status, 200);
    const b3 = await res3.json();
    assert.equal(b3.data.status, 'collected');
    assert.equal(b3.data.payment_status, 'paid'); // Counter payment marked paid upon collection
  });

  // 8. Order Rejection with Mandatory Reason
  await t.test('Shop owner can reject placed order with required reason', async () => {
    // Create new order to reject
    const oRes = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        shopId: kbrShopId,
        items: [{ menuItemId: kbrItem1.id, quantity: 1 }],
      }),
    });
    const oJson = await oRes.json();
    const orderToRejectId = oJson.data.id;

    // Reject without reason fails
    const badReject = await fetch(`${baseUrl}/api/v1/owner/orders/${orderToRejectId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kbrOwnerToken}`,
      },
      body: JSON.stringify({ reason: '' }),
    });
    assert.equal(badReject.status, 400);

    // Reject with reason succeeds
    const goodReject = await fetch(`${baseUrl}/api/v1/owner/orders/${orderToRejectId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kbrOwnerToken}`,
      },
      body: JSON.stringify({ reason: 'Kitchen capacity reached during lunch rush' }),
    });
    assert.equal(goodReject.status, 200);
    const rejectBody = await goodReject.json();
    assert.equal(rejectBody.data.status, 'rejected');
    assert.equal(rejectBody.data.rejection_reason, 'Kitchen capacity reached during lunch rush');
  });

  // 9. Shop Owner Menu Management
  await t.test('Shop owner can toggle availability and update price', async () => {
    const patchRes = await fetch(`${baseUrl}/api/v1/owner/menu/${kbrItem1.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kbrOwnerToken}`,
      },
      body: JSON.stringify({
        is_available: false,
        price_paise: 10500,
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.equal(patchBody.data.is_available, false);
    assert.equal(patchBody.data.price_paise, 10500);

    // Revert for consistency
    await fetch(`${baseUrl}/api/v1/owner/menu/${kbrItem1.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kbrOwnerToken}`,
      },
      body: JSON.stringify({ is_available: true }),
    });
  });

  // 10. Admin Analytics Endpoint
  await t.test('GET /api/v1/admin/analytics returns platform overview', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/analytics`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.shops.length === 5);
  });

  // 11. Accountant Financial Reconciliation Endpoint
  await t.test('GET /api/v1/finance/reconciliation returns reconciled cash and online totals', async () => {
    const res = await fetch(`${baseUrl}/api/v1/finance/reconciliation`, {
      headers: {
        Authorization: `Bearer ${accountantToken}`,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.shop_breakdowns.length === 5);
  });
});
