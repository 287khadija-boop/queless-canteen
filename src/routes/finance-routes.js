import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { shopStore } from '../data/shop-store.js';

export const financeRouter = Router();

financeRouter.use('/finance', authenticate, authorize('accountant', 'admin'));

/**
 * GET /api/v1/finance/reconciliation
 * Least-privilege financial reconciliation report
 */
financeRouter.get('/finance/reconciliation', async (req, res, next) => {
  try {
    const shops = await shopStore.getShops();
    let totalRevenuePaise = 0;
    let counterCashPaise = 0;
    let onlineRevenuePaise = 0;
    const shopBreakdowns = [];

    for (const shop of shops) {
      const orders = await shopStore.getOrdersByShop(shop.id);
      const paidOrders = orders.filter((o) => o.payment_status === 'paid' || o.status === 'collected');

      let shopCash = 0;
      let shopOnline = 0;

      for (const order of paidOrders) {
        if (order.payment_method === 'online') {
          shopOnline += order.total_paise;
        } else {
          shopCash += order.total_paise;
        }
      }

      totalRevenuePaise += (shopCash + shopOnline);
      counterCashPaise += shopCash;
      onlineRevenuePaise += shopOnline;

      shopBreakdowns.push({
        shop_id: shop.id,
        shop_name: shop.name,
        orders_paid_count: paidOrders.length,
        cash_collections_inr: (shopCash / 100).toFixed(2),
        online_collections_inr: (shopOnline / 100).toFixed(2),
        total_inr: ((shopCash + shopOnline) / 100).toFixed(2),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        total_collections_inr: (totalRevenuePaise / 100).toFixed(2),
        counter_cash_inr: (counterCashPaise / 100).toFixed(2),
        online_revenue_inr: (onlineRevenuePaise / 100).toFixed(2),
        shop_breakdowns: shopBreakdowns,
      },
      message: 'Financial reconciliation report generated',
    });
  } catch (err) {
    next(err);
  }
});
