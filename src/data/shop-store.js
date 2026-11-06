import { INITIAL_SHOPS, INITIAL_CATEGORIES, INITIAL_MENU_ITEMS } from './mock-data.js';
import { supabaseAdmin, isPlaceholderKey } from '../config/supabase.js';

class ShopStore {
  constructor() {
    this.shops = [...INITIAL_SHOPS];
    this.categories = [...INITIAL_CATEGORIES];
    this.menuItems = [...INITIAL_MENU_ITEMS];
    this.orders = [];
    this.dailyTokens = new Map(); // key: `${shopId}:${dateStr}` -> lastToken

    // Seed an initial demo order so dashboard has realistic preview
    const today = new Date().toISOString().split('T')[0];
    this.dailyTokens.set(`a0000000-0000-0000-0000-000000000001:${today}`, 42);
  }

  // --- SHOP OPERATIONS ---
  async getShops() {
    // In test mode, placeholder keys, or when offline, serve immediately from memory store
    if (process.env.NODE_ENV === 'test' || isPlaceholderKey) {
      return this.shops;
    }

    try {
      // If Supabase is reachable, try fetching from database
      const { data, error } = await supabaseAdmin
        .from('canteens')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      // Fall through to memory store
    }
    return this.shops;
  }

  async getShopById(shopId) {
    const shops = await this.getShops();
    return shops.find((s) => s.id === shopId) || null;
  }

  async updateShop(shopId, updates) {
    const shop = this.shops.find((s) => s.id === shopId);
    if (!shop) return null;
    Object.assign(shop, updates);
    return shop;
  }

  // --- MENU & CATEGORY OPERATIONS ---
  async getCategories(shopId) {
    if (process.env.NODE_ENV === 'test' || isPlaceholderKey) {
      return this.categories.filter((c) => c.canteen_id === shopId && c.is_active);
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('menu_categories')
        .select('*')
        .eq('canteen_id', shopId)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      // Memory fallback
    }
    return this.categories.filter((c) => c.canteen_id === shopId && c.is_active);
  }

  async getMenuItems(shopId) {
    if (process.env.NODE_ENV === 'test' || isPlaceholderKey) {
      return this.menuItems.filter((item) => item.canteen_id === shopId);
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('menu_items')
        .select('*')
        .eq('canteen_id', shopId);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      // Memory fallback
    }
    return this.menuItems.filter((item) => item.canteen_id === shopId);
  }

  async getMenuItemById(itemId) {
    return this.menuItems.find((m) => m.id === itemId) || null;
  }

  async updateMenuItem(shopId, itemId, updates) {
    const item = this.menuItems.find((m) => m.id === itemId && m.canteen_id === shopId);
    if (!item) return null;

    if (updates.price_paise !== undefined) item.price_paise = Number(updates.price_paise);
    if (updates.is_available !== undefined) item.is_available = Boolean(updates.is_available);
    if (updates.stock_quantity !== undefined) item.stock_quantity = Number(updates.stock_quantity);
    if (updates.name !== undefined) item.name = updates.name.trim();
    if (updates.description !== undefined) item.description = updates.description.trim();
    if (updates.image_url !== undefined) item.image_url = updates.image_url.trim();

    return item;
  }

  async addMenuItem(shopId, itemData) {
    const newItem = {
      id: `c-gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      canteen_id: shopId,
      category_id: itemData.category_id,
      name: itemData.name.trim(),
      description: itemData.description?.trim() || '',
      price_paise: Number(itemData.price_paise),
      image_url: itemData.image_url?.trim() || '',
      is_vegetarian: Boolean(itemData.is_vegetarian),
      stock_quantity: Number(itemData.stock_quantity || 50),
      is_available: true,
      preparation_minutes: Number(itemData.preparation_minutes || 8),
      is_draft: Boolean(itemData.is_draft),
    };

    this.menuItems.push(newItem);
    return newItem;
  }

  // --- ATOMIC TOKEN GENERATOR ---
  getNextToken(shopId, dateStr = new Date().toISOString().split('T')[0]) {
    const key = `${shopId}:${dateStr}`;
    const current = this.dailyTokens.get(key) || 0;
    const nextToken = current + 1;
    this.dailyTokens.set(key, nextToken);
    return nextToken;
  }

  // --- ORDER MANAGEMENT ---
  async createOrder({
    studentId,
    studentName,
    collegeIdentifier,
    shopId,
    items, // array of { menuItemId, quantity }
    orderType = 'asap',
    scheduledPickupAt = null,
    paymentMethod = 'counter',
    specialInstructions = '',
  }) {
    const shop = await this.getShopById(shopId);
    if (!shop) throw new Error('Selected shop does not exist');
    if (!shop.is_accepting_orders) throw new Error(`${shop.name} is temporarily not accepting pre-orders.`);

    // Server-side authoritative price and stock validation
    let subtotalPaise = 0;
    const orderItemsSnapshots = [];

    for (const line of items) {
      const product = await this.getMenuItemById(line.menuItemId);
      if (!product) throw new Error(`Menu item not found (${line.menuItemId})`);
      if (product.canteen_id !== shopId) {
        throw new Error(`Item '${product.name}' does not belong to ${shop.name}. Multi-shop carts are not permitted.`);
      }
      if (!product.is_available) {
        throw new Error(`Item '${product.name}' is currently unavailable.`);
      }

      const qty = Math.max(1, parseInt(line.quantity, 10));
      const lineTotal = product.price_paise * qty;
      subtotalPaise += lineTotal;

      orderItemsSnapshots.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        menu_item_id: product.id,
        item_name_snapshot: product.name,
        unit_price_paise: product.price_paise,
        quantity: qty,
        line_total_paise: lineTotal,
      });

      // Deduct stock if tracked
      if (product.stock_quantity >= qty) {
        product.stock_quantity -= qty;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const tokenNumber = this.getNextToken(shopId, todayStr);
    const shopCode = shop.shop_code || 'ORD';
    const orderNumber = `${shopCode}-${todayStr.replace(/-/g, '')}-${String(tokenNumber).padStart(3, '0')}`;

    const newOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      order_number: orderNumber,
      student_id: studentId,
      student_name: studentName,
      college_identifier: collegeIdentifier,
      canteen_id: shopId,
      shop_name: shop.name,
      token_number: tokenNumber,
      token_date: todayStr,
      order_type: orderType,
      scheduled_pickup_at: scheduledPickupAt,
      status: 'placed', // initial state awaiting shop decision
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'online' ? 'paid' : 'unpaid',
      subtotal_paise: subtotalPaise,
      fees_paise: 0,
      total_paise: subtotalPaise,
      special_instructions: specialInstructions?.trim() || null,
      items: orderItemsSnapshots,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      accepted_at: null,
      preparing_at: null,
      ready_at: null,
      collected_at: null,
      rejected_at: null,
      rejection_reason: null,
      cancelled_at: null,
      cancellation_reason: null,
    };

    this.orders.unshift(newOrder);
    return newOrder;
  }

  async getOrdersByShop(shopId, status = null) {
    let list = this.orders.filter((o) => o.canteen_id === shopId);
    if (status) {
      list = list.filter((o) => o.status === status);
    }
    return list;
  }

  async getOrdersByStudent(studentId) {
    return this.orders.filter((o) => o.student_id === studentId);
  }

  async getOrderById(orderId) {
    return this.orders.find((o) => o.id === orderId) || null;
  }

  // --- TRANSITION WORKFLOWS ---
  async acceptOrder(shopId, orderId) {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.canteen_id !== shopId) throw new Error('Unauthorized: Order does not belong to your shop');
    if (order.status !== 'placed') {
      throw new Error(`Cannot accept order with status '${order.status}'. Only placed orders can be accepted.`);
    }

    order.status = 'accepted';
    order.accepted_at = new Date().toISOString();
    order.updated_at = new Date().toISOString();
    return order;
  }

  async rejectOrder(shopId, orderId, reason, actorId) {
    if (!reason || reason.trim().length < 3) {
      throw new Error('A valid rejection reason must be specified (minimum 3 characters).');
    }

    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.canteen_id !== shopId) throw new Error('Unauthorized: Order does not belong to your shop');
    if (!['placed', 'accepted'].includes(order.status)) {
      throw new Error(`Cannot reject order with status '${order.status}'.`);
    }

    order.status = 'rejected';
    order.rejected_at = new Date().toISOString();
    order.rejection_reason = reason.trim();
    order.rejected_by = actorId;
    order.updated_at = new Date().toISOString();

    // Restock items
    for (const itemSnapshot of order.items) {
      const product = await this.getMenuItemById(itemSnapshot.menu_item_id);
      if (product) {
        product.stock_quantity += itemSnapshot.quantity;
      }
    }

    return order;
  }

  async advanceOrderStatus(shopId, orderId, nextStatus) {
    const validTransitions = {
      accepted: ['preparing'],
      preparing: ['ready'],
      ready: ['collected'],
    };

    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.canteen_id !== shopId) throw new Error('Unauthorized: Order does not belong to your shop');

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(nextStatus)) {
      throw new Error(`Invalid status transition from '${order.status}' to '${nextStatus}'.`);
    }

    order.status = nextStatus;
    const now = new Date().toISOString();
    order.updated_at = now;

    if (nextStatus === 'preparing') order.preparing_at = now;
    if (nextStatus === 'ready') order.ready_at = now;
    if (nextStatus === 'collected') {
      order.collected_at = now;
      if (order.payment_method === 'counter') {
        order.payment_status = 'paid'; // Marked paid upon physical handover
      }
    }

    return order;
  }

  async cancelOrder(studentId, orderId, reason) {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.student_id !== studentId) throw new Error('Unauthorized: You can only cancel your own orders');
    if (!['placed', 'pending_payment'].includes(order.status)) {
      throw new Error(`Cannot cancel order. The kitchen has already started processing (${order.status}).`);
    }

    order.status = 'cancelled';
    order.cancelled_at = new Date().toISOString();
    order.cancellation_reason = reason || 'Cancelled by student';
    order.updated_at = new Date().toISOString();

    // Restock items
    for (const itemSnapshot of order.items) {
      const product = await this.getMenuItemById(itemSnapshot.menu_item_id);
      if (product) {
        product.stock_quantity += itemSnapshot.quantity;
      }
    }

    return order;
  }

  // --- ANALYTICS FOR SHOP OWNER ---
  async getShopAnalytics(shopId) {
    const shopOrders = this.orders.filter((o) => o.canteen_id === shopId);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = shopOrders.filter((o) => o.created_at.startsWith(todayStr));

    const pendingDecisions = shopOrders.filter((o) => o.status === 'placed').length;
    const preparingCount = shopOrders.filter((o) => o.status === 'preparing').length;
    const readyCount = shopOrders.filter((o) => o.status === 'ready').length;
    const completedCount = shopOrders.filter((o) => o.status === 'collected').length;
    const rejectedCount = shopOrders.filter((o) => o.status === 'rejected').length;

    // Verified sales total (orders collected or paid online)
    const verifiedSalesPaise = shopOrders
      .filter((o) => o.payment_status === 'paid' || o.status === 'collected')
      .reduce((sum, o) => sum + o.total_paise, 0);

    // Item popularity calculation
    const itemSalesMap = new Map();
    for (const o of shopOrders) {
      if (o.status !== 'rejected' && o.status !== 'cancelled') {
        for (const item of o.items) {
          const current = itemSalesMap.get(item.item_name_snapshot) || 0;
          itemSalesMap.set(item.item_name_snapshot, current + item.quantity);
        }
      }
    }

    const popularItems = Array.from(itemSalesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      today_orders_count: todayOrders.length,
      total_orders_count: shopOrders.length,
      pending_decisions_count: pendingDecisions,
      preparing_count: preparingCount,
      ready_count: readyCount,
      completed_count: completedCount,
      rejected_count: rejectedCount,
      verified_sales_paise: verifiedSalesPaise,
      verified_sales_inr: (verifiedSalesPaise / 100).toFixed(2),
      popular_items: popularItems,
    };
  }
}

export const shopStore = new ShopStore();
