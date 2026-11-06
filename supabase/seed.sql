-- ====================================================================
-- Quesless Campus — Seed Data
-- Institution: Malla Reddy Engineering College for Women (MRECW)
-- Operating Hours: 09:00 AM – 04:00 PM (Asia/Kolkata)
-- Currency: Indian Rupees (INR, stored as integer paise)
-- ====================================================================

-- 1. Insert Canteen Record
INSERT INTO public.canteens (
    id,
    name,
    campus_name,
    timezone,
    opening_time,
    closing_time,
    is_accepting_orders,
    max_active_orders_capacity
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'MRECW Main Canteen',
    'Malla Reddy Engineering College for Women',
    'Asia/Kolkata',
    '09:00:00',
    '16:00:00',
    true,
    75
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_accepting_orders = EXCLUDED.is_accepting_orders;

-- 2. Insert Menu Categories
INSERT INTO public.menu_categories (id, canteen_id, name, display_order, is_active) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'South Indian Breakfast', 1, true),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Lunch & Meals', 2, true),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Quick Bites & Snacks', 3, true),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Beverages & Juices', 4, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Authentic Campus Food Items (Prices in Paise: 4500 paise = ₹45.00)
INSERT INTO public.menu_items (
    id, canteen_id, category_id, name, description, price_paise, image_url, is_vegetarian, stock_quantity, is_available, preparation_minutes
) VALUES
    -- Breakfast
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
     'Masala Dosa', 'Crispy golden crepe filled with spiced potato masala, served with coconut chutney and hot sambar.', 4500, 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80', true, 50, true, 8),

    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
     'Idli Sambar (2 pcs)', 'Steamed fluffy rice cakes served with aromatic vegetable sambar and peanut chutney.', 3500, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80', true, 60, true, 4),

    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
     'Medu Vada (2 pcs)', 'Crispy deep-fried lentil fritters with crushed black pepper and fresh curry leaves.', 4000, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80', true, 40, true, 5),

    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
     'Poori Bhaji (3 pcs)', 'Puffy golden whole wheat pooris served with lightly spiced potato gravy and green chilies.', 5000, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80', true, 35, true, 7),

    -- Lunch & Meals
    ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
     'Hyderabadi Veg Dum Biryani', 'Fragrant basmati rice layered with garden vegetables, saffron and mint, served with mixed raita and salan.', 9000, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', true, 50, true, 10),

    ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
     'Veg Fried Rice with Manchurian', 'Wok-tossed vegetable fried rice served with crispy vegetable Manchurian balls in rich gravy.', 8500, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80', true, 45, true, 10),

    ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
     'Paneer Butter Masala with 2 Parathas', 'Soft cottage cheese cubes simmered in a creamy tomato-cashew sauce with layered flaky parathas.', 11000, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80', true, 30, true, 12),

    ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
     'South Indian Curd Rice', 'Tempered cooling yogurt rice with mustard seeds, curry leaves, ginger and tangy mango pickle.', 4000, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80', true, 40, true, 3),

    -- Quick Bites & Snacks
    ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
     'Crispy Samosa (2 pcs)', 'Spiced potato and green peas pastry pockets fried crisp, served with mint coriander chutney.', 2500, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80', true, 70, true, 3),

    ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
     'Paneer Grilled Sandwich', 'Three-layer butter toasted bread stuffed with spiced paneer, bell peppers and melted cheese.', 6000, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80', true, 40, true, 7),

    ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
     'Veg Cheese Burger', 'Golden vegetable patty topped with melted cheese, lettuce, tomatoes and special campus sauce.', 7000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80', true, 30, true, 8),

    ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
     'Peri-Peri French Fries', 'Crispy potato fries dusted with zesty peri-peri seasoning, served with creamy mayonnaise.', 5000, 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&q=80', true, 40, true, 6),

    -- Beverages
    ('c0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
     'South Indian Filter Coffee', 'Traditional decoction filter coffee brewed with fresh chicory and frothy full-cream milk.', 2000, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80', true, 90, true, 3),

    ('c0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
     'Fresh Ginger Masala Chai', 'Hot boiled Assam tea leaves infused with crushed ginger, cardamom and cloves.', 1500, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80', true, 100, true, 3),

    ('c0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
     'Sweet Lime (Mosambi) Juice', 'Freshly pressed cold sweet lime juice with a pinch of black salt and mint.', 4000, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80', true, 30, true, 5),

    ('c0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
     'Cold Chocolate Milkshake', 'Chilled chocolate blended shake topped with cocoa dust and chocolate drizzle.', 5000, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80', true, 35, true, 4)
ON CONFLICT (id) DO UPDATE SET
    price_paise = EXCLUDED.price_paise,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = EXCLUDED.is_available;
