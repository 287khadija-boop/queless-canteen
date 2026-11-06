import { Router } from 'express';
import { shopStore } from '../data/shop-store.js';
import { AppError } from '../middleware/error-handler.js';

export const shopRouter = Router();

/**
 * GET /api/v1/shops
 * List all active campus shops with metadata
 */
shopRouter.get('/shops', async (req, res, next) => {
  try {
    const shops = await shopStore.getShops();
    res.status(200).json({
      success: true,
      data: shops,
      message: 'Campus shops retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/shops/:id
 * Retrieve single shop details
 */
shopRouter.get('/shops/:id', async (req, res, next) => {
  try {
    const shop = await shopStore.getShopById(req.params.id);
    if (!shop) {
      return next(new AppError('Shop not found', 404, 'SHOP_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: shop,
      message: 'Shop retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/shops/:id/menu
 * Retrieve categories and menu items for a specific shop
 */
shopRouter.get('/shops/:id/menu', async (req, res, next) => {
  try {
    const shop = await shopStore.getShopById(req.params.id);
    if (!shop) {
      return next(new AppError('Shop not found', 404, 'SHOP_NOT_FOUND'));
    }

    const categories = await shopStore.getCategories(req.params.id);
    const menuItems = await shopStore.getMenuItems(req.params.id);

    res.status(200).json({
      success: true,
      data: {
        shop,
        categories,
        items: menuItems,
      },
      message: `Menu for ${shop.name} retrieved successfully`,
    });
  } catch (err) {
    next(err);
  }
});
