import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { shopStore } from '../data/shop-store.js';
import { AppError } from '../middleware/error-handler.js';

export const orderRouter = Router();

// Validation Schemas
const createOrderItemSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item ID is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(20),
});

const createOrderSchema = z.object({
  shopId: z.string().min(1, 'Shop ID is required'),
  items: z.array(createOrderItemSchema).min(1, 'Cart cannot be empty'),
  orderType: z.enum(['asap', 'scheduled']).default('asap'),
  scheduledPickupAt: z.string().datetime().optional().nullable(),
  paymentMethod: z.enum(['counter', 'online']).default('counter'),
  specialInstructions: z.string().max(250).optional().nullable(),
});

/**
 * POST /api/v1/orders
 * Create a new pre-order (Authenticated students)
 */
orderRouter.post('/orders', authenticate, async (req, res, next) => {
  try {
    const parseResult = createOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR', parseResult.error.format()));
    }

    const { shopId, items, orderType, scheduledPickupAt, paymentMethod, specialInstructions } = parseResult.data;

    const order = await shopStore.createOrder({
      studentId: req.user.id,
      studentName: req.user.full_name || 'Student',
      collegeIdentifier: req.user.college_identifier || 'STUDENT',
      shopId,
      items,
      orderType,
      scheduledPickupAt,
      paymentMethod,
      specialInstructions,
    });

    res.status(201).json({
      success: true,
      data: order,
      message: `Pre-order confirmed! Your digital token is #${order.token_number}`,
    });
  } catch (err) {
    next(new AppError(err.message, 400, 'ORDER_CREATION_FAILED'));
  }
});

/**
 * GET /api/v1/orders/my
 * Get authenticated student's active and previous orders
 */
orderRouter.get('/orders/my', authenticate, async (req, res, next) => {
  try {
    const orders = await shopStore.getOrdersByStudent(req.user.id);
    res.status(200).json({
      success: true,
      data: orders,
      message: 'Orders retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/orders/:id
 * Retrieve order details (Students only access their own; Staff/Owner/Admin access shop-scoped)
 */
orderRouter.get('/orders/:id', authenticate, async (req, res, next) => {
  try {
    const order = await shopStore.getOrderById(req.params.id);
    if (!order) {
      return next(new AppError('Order not found', 404, 'ORDER_NOT_FOUND'));
    }

    // Role check: Students only see their own
    if (req.user.role === 'student' && order.student_id !== req.user.id) {
      return next(new AppError('Access denied. You cannot view another student\'s order.', 403, 'FORBIDDEN'));
    }

    // Shop owner only sees their shop
    if (req.user.role === 'shop_owner' && req.user.assigned_shop_id && order.canteen_id !== req.user.assigned_shop_id) {
      return next(new AppError('Access denied. You cannot view orders for another shop.', 403, 'FORBIDDEN'));
    }

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/orders/:id/cancel
 * Student cancels unstarted order
 */
orderRouter.post('/orders/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const reason = req.body.reason || 'Cancelled by student';
    const order = await shopStore.cancelOrder(req.user.id, req.params.id, reason);

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order cancelled successfully. Any reserved stock has been returned.',
    });
  } catch (err) {
    next(new AppError(err.message, 400, 'CANCELLATION_FAILED'));
  }
});
