import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { shopStore } from '../data/shop-store.js';
import { AppError } from '../middleware/error-handler.js';

export const adminRouter = Router();

adminRouter.use('/admin', authenticate, authorize('admin'));

/**
 * GET /api/v1/admin/shops
 * View all shops and their operational status
 */
adminRouter.get('/admin/shops', async (req, res, next) => {
  try {
    const shops = await shopStore.getShops();
    res.status(200).json({
      success: true,
      data: shops,
      message: 'All campus shops retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/shops/:id
 * Toggle shop order acceptance or update capacity
 */
const updateShopSchema = z.object({
  is_accepting_orders: z.boolean().optional(),
  max_active_orders_capacity: z.coerce.number().int().min(10).optional(),
});

adminRouter.patch('/admin/shops/:id', async (req, res, next) => {
  try {
    const parseResult = updateShopSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR'));
    }

    const updated = await shopStore.updateShop(req.params.id, parseResult.data);
    if (!updated) {
      return next(new AppError('Shop not found', 404, 'SHOP_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: `Shop '${updated.name}' settings updated.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/analytics
 * Platform-wide cross-shop analytics
 */
adminRouter.get('/admin/analytics', async (req, res, next) => {
  try {
    const shops = await shopStore.getShops();
    const shopMetrics = [];
    let totalPlatformRevenue = 0;
    let totalPlatformOrders = 0;

    for (const shop of shops) {
      const analytics = await shopStore.getShopAnalytics(shop.id);
      shopMetrics.push({
        shop_id: shop.id,
        shop_name: shop.name,
        orders_count: analytics.total_orders_count,
        sales_inr: analytics.verified_sales_inr,
      });
      totalPlatformRevenue += analytics.verified_sales_paise;
      totalPlatformOrders += analytics.total_orders_count;
    }

    res.status(200).json({
      success: true,
      data: {
        total_platform_orders: totalPlatformOrders,
        total_platform_revenue_inr: (totalPlatformRevenue / 100).toFixed(2),
        shops: shopMetrics,
      },
      message: 'Cross-shop platform analytics retrieved',
    });
  } catch (err) {
    next(err);
  }
});
