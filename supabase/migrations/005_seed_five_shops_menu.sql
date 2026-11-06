-- ====================================================================
-- Quesless Campus — Migration 005: Seed 5 Campus Shop Menus
-- Institution: Malla Reddy Engineering College for Women (MRECW)
-- ====================================================================

-- 1. KBR CHICKEN (Shop ID: a0000000-0000-0000-0000-000000000001)
-- Categories:
INSERT INTO public.menu_categories (id, canteen_id, name, display_order, is_active) VALUES
    ('b1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Crispy Fried Chicken', 1, true),
    ('b1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Chicken Burgers & Wraps', 2, true),
    ('b1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Popcorn, Strips & Wings', 3, true),
    ('b1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'Fries, Dips & Drinks', 4, true)
ON CONFLICT (id) DO NOTHING;

-- KBR Chicken Dishes (Draft college-friendly pricing):
INSERT INTO public.menu_items (id, canteen_id, category_id, name, description, price_paise, image_url, is_vegetarian, stock_quantity, is_available, preparation_minutes) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
     'KBR Crispy Fried Drumstick (2 pcs)', 'Golden crunchy fried chicken drumsticks marinated in campus secret spices.', 9900,
     'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80', false, 40, true, 8),
    ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
     'KBR Hot & Crispy 4-Piece Box', 'Four pieces of spiced fried chicken served with garlic dip and zesty seasoning.', 18900,
     'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80', false, 30, true, 10),
    ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
     'KBR Crunchy Chicken Burger', 'Crispy chicken fillet with fresh lettuce and pepper mayonnaise in toasted sesame buns.', 8500,
     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', false, 45, true, 7),
    ('c1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
     'KBR Crispy Chicken Wrap', 'Tender fried chicken tenders, shredded lettuce, and creamy ranch rolled in warm tortilla.', 7900,
     'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80', false, 35, true, 6),
    ('c1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003',
     'KBR Chicken Popcorn (Regular)', 'Bite-sized seasoned chicken popcorn fried crisp and tossed in peri-peri dust.', 6900,
     'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80', false, 50, true, 5),
    ('c1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003',
     'Spicy BBQ Chicken Wings (4 pcs)', 'Crisp chicken wings glazed with smoky tangy college barbecue sauce.', 9500,
     'https://images.unsplash.com/photo-1527477378408-1bc0df81e053?w=600&auto=format&fit=crop&q=80', false, 30, true, 8),
    ('c1000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004',
     'Salted Crinkle Fries', 'Classic crispy golden potato fries dusted with light sea salt.', 4500,
     'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80', true, 60, true, 4)
ON CONFLICT (id) DO UPDATE SET price_paise = EXCLUDED.price_paise;


-- 2. DRAGON HUB (Shop ID: a0000000-0000-0000-0000-000000000002)
INSERT INTO public.menu_categories (id, canteen_id, name, display_order, is_active) VALUES
    ('b2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Wok Noodles & Rice', 1, true),
    ('b2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Burgers & Sandwiches', 2, true),
    ('b2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Momos & Starters', 3, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, canteen_id, category_id, name, description, price_paise, image_url, is_vegetarian, stock_quantity, is_available, preparation_minutes) VALUES
    ('c2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001',
     'Schezwan Veg Hakka Noodles', 'Wok-tossed noodles with shredded cabbage, bell peppers, carrots, and spicy Schezwan sauce.', 7500,
     'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80', true, 40, true, 8),
    ('c2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001',
     'Egg & Chicken Fried Rice', 'Fragrant rice tossed with scrambled egg, tender chicken pieces, spring onions, and soya.', 9000,
     'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80', false, 35, true, 9),
    ('c2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002',
     'Dragon Veg Cheese Burger', 'Golden spiced veg patty, melted cheese slice, tangy mayo, and crisp lettuce.', 6500,
     'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80', true, 40, true, 6),
    ('c2000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000003',
     'Steamed Veg Momos (6 pcs)', 'Delicate dumplings stuffed with minced vegetables, ginger, and garlic with spicy red dip.', 6000,
     'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=600&auto=format&fit=crop&q=80', true, 30, true, 7),
    ('c2000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000003',
     'Crispy Veg Spring Rolls (4 pcs)', 'Golden crisp rolls filled with seasoned noodles and veggies, served with sweet chilli dip.', 5500,
     'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true, 35, true, 6)
ON CONFLICT (id) DO UPDATE SET price_paise = EXCLUDED.price_paise;


-- 3. BROWN BEAR (Shop ID: a0000000-0000-0000-0000-000000000003)
-- Clear unconfirmed draft status explicitly indicated
INSERT INTO public.menu_categories (id, canteen_id, name, display_order, is_active) VALUES
    ('b3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Bakery & Pastries (Draft)', 1, true),
    ('b3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Hot Beverages & Bakes (Draft)', 2, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, canteen_id, category_id, name, description, price_paise, image_url, is_vegetarian, stock_quantity, is_available, preparation_minutes) VALUES
    ('c3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000001',
     'Brown Bear Chocolate Brownie (Draft)', '[Unconfirmed draft item - awaiting shop owner confirmation]. Rich chocolate brownie with walnut bits.', 6000,
     'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80', true, 20, true, 2),
    ('c3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000001',
     'Fresh Veg Puff (Draft)', '[Unconfirmed draft item - awaiting shop owner confirmation]. Flaky puff pastry with spiced vegetable filling.', 3000,
     'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80', true, 30, true, 2),
    ('c3000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000002',
     'Hot Cappuccino (Draft)', '[Unconfirmed draft item - awaiting shop owner confirmation]. Freshly brewed espresso topped with steamed milk froth.', 4500,
     'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80', true, 40, true, 3)
ON CONFLICT (id) DO UPDATE SET price_paise = EXCLUDED.price_paise;


-- 4. MILKSHAKES (Shop ID: a0000000-0000-0000-0000-000000000004)
INSERT INTO public.menu_categories (id, canteen_id, name, display_order, is_active) VALUES
    ('b4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Thick Milkshakes', 1, true),
    ('b4000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Cold Coffee & Smoothies', 2, true),
    ('b4000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'Fresh Fruit Juices', 3, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, canteen_id, category_id, name, description, price_paise, image_url, is_vegetarian, stock_quantity, is_available, preparation_minutes) VALUES
    ('c4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000001',
     'Belgium Dark Chocolate Shake', 'Rich creamy shake blended with dark chocolate ganache, topped with chocolate curls.', 7500,
     'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80', true, 40, true, 4),
    ('c4000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001',
     'Oreo Crunch Thickshake', 'Crushed chocolate Oreo cookies blended with dairy vanilla ice cream and whipped top.', 7000,
     'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80', true, 35, true, 4),
    ('c4000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001',
     'Fresh Strawberry Shake', 'Farm fresh strawberries pureed with chilled milk and a scoop of strawberry gelato.', 6500,
     'https://images.unsplash.com/photo-1553787499-6f9133860278?w=600&auto=format&fit=crop&q=80', true, 30, true, 4),
    ('c4000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000002',
     'Classic Cold Coffee with Ice Cream', 'Frothy blended iced coffee topped with a creamy scoop of vanilla ice cream.', 6000,
     'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80', true, 50, true, 3),
    ('c4000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000003',
     'Chilled Watermelon Mint Juice', 'Hydrating freshly extracted watermelon juice infused with crushed mint leaves and black salt.', 4500,
     'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&auto=format&fit=crop&q=80', true, 30, true, 3)
ON CONFLICT (id) DO UPDATE SET price_paise = EXCLUDED.price_paise;


-- 5. WRAPS (Shop ID: a0000000-0000-0000-0000-000000000005)
INSERT INTO public.menu_categories (id, canteen_id, name, display_order, is_active) VALUES
    ('b5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'Vegetarian & Paneer Wraps', 1, true),
    ('b5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'Egg & Chicken Wraps', 2, true),
    ('b5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Sides & Drinks', 3, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, canteen_id, category_id, name, description, price_paise, image_url, is_vegetarian, stock_quantity, is_available, preparation_minutes) VALUES
    ('c5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000001',
     'Paneer Tikka Roll / Wrap', 'Char-grilled cottage cheese cubes tossed with sliced onions, capsicum, and mint chutney in paratha.', 8000,
     'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80', true, 40, true, 6),
    ('c5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000001',
     'Crunchy Veggie Falafel Wrap', 'Crispy chickpea falafel balls, cucumbers, tomatoes, and garlic tahini dressing wrapped snug.', 7000,
     'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80', true, 35, true, 5),
    ('c5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000002',
     'Double Egg Kathi Roll', 'Two fluffy beaten eggs cooked with paratha, stuffed with spiced sautéed onions and tangy lime juice.', 6000,
     'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80', false, 45, true, 5),
    ('c5000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000002',
     'Chicken Shawarma Wrap', 'Spiced roasted shredded chicken with pickled beets, lettuce, and garlic toum sauce in pita.', 9500,
     'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop&q=80', false, 40, true, 7),
    ('c5000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000003',
     'Sweet Lime Mint Cooler', 'Cold freshly squeezed sweet lime juice with crushed ice and mint.', 3500,
     'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80', true, 30, true, 3)
ON CONFLICT (id) DO UPDATE SET price_paise = EXCLUDED.price_paise;
