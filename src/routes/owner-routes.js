import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { shopStore } from '../data/shop-store.js';
import { AppError } from '../middleware/error-handler.js';

export const ownerRouter = Router();

// Enforce authentication & shop_owner/admin role for /owner endpoints
ownerRouter.use('/owner', authenticate, authorize('shop_owner', 'admin'));

/**
 * Helper to extract and verify the owner's assigned shop ID
 */
function getTargetShopId(req) {
  // Admins can inspect any shop by passing query param ?shopId=..., else default to first shop
  if (req.user.role === 'admin') {
    return req.query.shopId || req.body.shopId || 'a0000000-0000-0000-0000-000000000001';
  }
  // Shop owners are strictly locked to their assigned shop
  if (!req.user.assigned_shop_id) {
    throw new AppError('No shop is assigned to your shop owner account. Please contact canteen admin.', 403, 'UNASSIGNED_SHOP');
  }
  return req.user.assigned_shop_id;
}

/**
 * GET /api/v1/owner/shop
 * Get authorized shop profile & live status
 */
ownerRouter.get('/owner/shop', async (req, res, next) => {
  try {
    const shopId = getTargetShopId(req);
    const shop = await shopStore.getShopById(shopId);
    if (!shop) {
      return next(new AppError('Assigned shop not found', 404, 'SHOP_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: shop,
      message: 'Shop profile retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/owner/orders
 * Retrieve orders for the owner's shop (with optional status filter)
 */
ownerRouter.get('/owner/orders', async (req, res, next) => {
  try {
    const shopId = getTargetShopId(req);
    const status = req.query.status || null;
    const orders = await shopStore.getOrdersByShop(shopId, status);

    res.status(200).json({
      success: true,
      data: orders,
      count: orders.length,
      message: 'Shop orders retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/owner/orders/:id/accept
 * Accept an incoming pre-order
 */
ownerRouter.post('/owner/orders/:id/accept', async (req, res, next) => {
  try {
    const shopId = getTargetShopId(req);
    const order = await shopStore.acceptOrder(shopId, req.params.id);

    res.status(200).json({
      success: true,
      data: order,
      message: `Order #${order.token_number} accepted and moved to queue.`,
    });
  } catch (err) {
    next(new AppError(err.message, 400, 'ORDER_ACCEPT_FAILED'));
  }
});

/**
 * POST /api/v1/owner/orders/:id/reject
 * Reject an order with mandatory reason
 */
const rejectSchema = z.object({
  reason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters'),
});

ownerRouter.post('/owner/orders/:id/reject', async (req, res, next) => {
  try {
    const parseResult = rejectSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR'));
    }

    const shopId = getTargetShopId(req);
    const order = await shopStore.rejectOrder(shopId, req.params.id, parseResult.data.reason, req.user.id);

    res.status(200).json({
      success: true,
      data: order,
      message: `Order #${order.token_number} has been rejected. Student notified.`,
    });
  } catch (err) {
    next(new AppError(err.message, 400, 'ORDER_REJECT_FAILED'));
  }
});

/**
 * POST /api/v1/owner/orders/:id/status
 * Advance order status along pipeline: accepted -> preparing -> ready -> collected
 */
const statusTransitionSchema = z.object({
  status: z.enum(['preparing', 'ready', 'collected']),
});

ownerRouter.post('/owner/orders/:id/status', async (req, res, next) => {
  try {
    const parseResult = statusTransitionSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR'));
    }

    const shopId = getTargetShopId(req);
    const order = await shopStore.advanceOrderStatus(shopId, req.params.id, parseResult.data.status);

    res.status(200).json({
      success: true,
      data: order,
      message: `Order #${order.token_number} status updated to '${order.status}'.`,
    });
  } catch (err) {
    next(new AppError(err.message, 400, 'STATUS_UPDATE_FAILED'));
  }
});

/**
 * GET /api/v1/owner/menu
 * Get items and categories for shop owner menu management
 */
ownerRouter.get('/owner/menu', async (req, res, next) => {
  try {
    const shopId = getTargetShopId(req);
    const categories = await shopStore.getCategories(shopId);
    const items = await shopStore.getMenuItems(shopId);

    res.status(200).json({
      success: true,
      data: { categories, items },
      message: 'Menu management catalog retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/owner/menu/:id
 * Edit menu item availability, price, or stock
 */
const updateMenuItemSchema = z.object({
  price_paise: z.coerce.number().int().min(100).optional(),
  is_available: z.boolean().optional(),
  stock_quantity: z.coerce.number().int().min(0).optional(),
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  image_url: z.string().trim().url().optional(),
});

ownerRouter.patch('/owner/menu/:id', async (req, res, next) => {
  try {
    const parseResult = updateMenuItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR'));
    }

    const shopId = getTargetShopId(req);
    const updated = await shopStore.updateMenuItem(shopId, req.params.id, parseResult.data);
    if (!updated) {
      return next(new AppError('Menu item not found in your shop', 404, 'ITEM_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: `Item '${updated.name}' updated successfully`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/owner/menu
 * Add a new dish to the shop's menu
 */
const addMenuItemSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  name: z.string().trim().min(2, 'Item name must be at least 2 characters'),
  description: z.string().trim().optional(),
  price_paise: z.coerce.number().int().min(100, 'Price must be at least ₹1.00 (100 paise)'),
  image_url: z.string().trim().optional(),
  is_vegetarian: z.boolean().default(true),
  stock_quantity: z.coerce.number().int().min(0).default(50),
  preparation_minutes: z.coerce.number().int().min(1).default(8),
  is_draft: z.boolean().default(false),
});

ownerRouter.post('/owner/menu', async (req, res, next) => {
  try {
    const parseResult = addMenuItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR'));
    }

    const shopId = getTargetShopId(req);
    const item = await shopStore.addMenuItem(shopId, parseResult.data);

    res.status(201).json({
      success: true,
      data: item,
      message: `New dish '${item.name}' added to your shop's menu`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/owner/analytics
 * Retrieve scoped shop analytics (orders, revenue, popular dishes, rejections)
 */
ownerRouter.get('/owner/analytics', async (req, res, next) => {
  try {
    const shopId = getTargetShopId(req);
    const analytics = await shopStore.getShopAnalytics(shopId);

    res.status(200).json({
      success: true,
      data: analytics,
      message: 'Shop analytics computed successfully',
    });
  } catch (err) {
    next(err);
  }
});
