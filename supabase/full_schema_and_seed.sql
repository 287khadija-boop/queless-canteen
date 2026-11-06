-- ====================================================================
-- Quesless Campus — Complete Consolidated Schema & 5-Shop Seed Script
-- Institution: Malla Reddy Engineering College for Women (MRECW)
-- Project: nvqevxsxoxmswgwxpaio.supabase.co
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    college_identifier TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'shop_owner', 'accountant', 'admin')),
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected')),
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Canteens / Shops Table
CREATE TABLE IF NOT EXISTS public.canteens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    shop_code TEXT UNIQUE,
    campus_name TEXT NOT NULL DEFAULT 'Malla Reddy Engineering College for Women',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    opening_time TIME NOT NULL DEFAULT '09:00:00',
    closing_time TIME NOT NULL DEFAULT '16:00:00',
    is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
    max_active_orders_capacity INT NOT NULL DEFAULT 80 CHECK (max_active_orders_capacity > 0),
    description TEXT,
    cover_image_url TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Shop Assignments Table (Links users to shops)
CREATE TABLE IF NOT EXISTS public.shop_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_shop_assignment UNIQUE (user_id, shop_id)
);

-- 5. Menu Categories Table
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Menu Items Table
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    price_paise INT NOT NULL CHECK (price_paise > 0),
    image_url TEXT,
    is_vegetarian BOOLEAN NOT NULL DEFAULT true,
    stock_quantity INT NOT NULL DEFAULT 50 CHECK (stock_quantity >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    preparation_minutes INT NOT NULL DEFAULT 10 CHECK (preparation_minutes > 0),
    is_draft BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Daily Atomic Token Counters
CREATE TABLE IF NOT EXISTS public.daily_token_counters (
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    token_date DATE NOT NULL,
    last_token INT NOT NULL DEFAULT 0,
    PRIMARY KEY (canteen_id, token_date)
);

-- 8. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE RESTRICT,
    token_number INT NOT NULL,
    token_date DATE NOT NULL DEFAULT CURRENT_DATE,
    order_type TEXT NOT NULL DEFAULT 'asap' CHECK (order_type IN ('asap', 'scheduled')),
    scheduled_pickup_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'placed' CHECK (
        status IN ('pending_payment', 'placed', 'accepted', 'preparing', 'ready', 'collected', 'rejected', 'cancelled', 'payment_failed')
    ),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('counter', 'online')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    subtotal_paise INT NOT NULL CHECK (subtotal_paise >= 0),
    fees_paise INT NOT NULL DEFAULT 0 CHECK (fees_paise >= 0),
    total_paise INT NOT NULL CHECK (total_paise >= 0),
    special_instructions TEXT,
    accepted_at TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_token_per_day_canteen UNIQUE (canteen_id, token_date, token_number)
);

-- 9. Order Items Table (Snapshot item name and unit price at time of purchase)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    item_name_snapshot TEXT NOT NULL,
    unit_price_paise INT NOT NULL CHECK (unit_price_paise > 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total_paise INT NOT NULL CHECK (line_total_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_student_created ON public.orders(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_canteen_status ON public.orders(canteen_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders(canteen_id, token_date, token_number);
CREATE INDEX IF NOT EXISTS idx_menu_items_canteen ON public.menu_items(canteen_id, is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_assignments_user ON public.shop_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_assignments_shop ON public.shop_assignments(shop_id);

-- 11. Helper Security Functions
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_owner_of_shop(p_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.shop_assignments
        WHERE user_id = auth.uid()
        AND shop_id = p_shop_id
    ) OR public.get_current_role() = 'admin';
$$;

-- 12. Atomic Daily Token Function
CREATE OR REPLACE FUNCTION public.generate_daily_token(p_canteen_id UUID, p_token_date DATE)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token INT;
BEGIN
    INSERT INTO public.daily_token_counters (canteen_id, token_date, last_token)
    VALUES (p_canteen_id, p_token_date, 1)
    ON CONFLICT (canteen_id, token_date)
    DO UPDATE SET last_token = public.daily_token_counters.last_token + 1
    RETURNING last_token INTO v_token;

    RETURN v_token;
END;
$$;

-- 13. Auto-Create Profile on Supabase Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_requested_role TEXT;
    v_approval_status TEXT;
BEGIN
    v_requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    
    IF v_requested_role NOT IN ('student', 'staff', 'shop_owner', 'accountant', 'admin') THEN
        v_requested_role := 'student';
    END IF;

    -- Students approved instantly; Staff, Shop Owners & Accountants require admin approval
    IF v_requested_role = 'admin' THEN
        v_requested_role := 'staff';
        v_approval_status := 'pending';
    ELSIF v_requested_role IN ('staff', 'shop_owner', 'accountant') THEN
        v_approval_status := 'pending';
    ELSE
        v_approval_status := 'approved';
    END IF;

    INSERT INTO public.profiles (
        id,
        full_name,
        college_identifier,
        role,
        approval_status,
        is_active
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Campus User'),
        NEW.raw_user_meta_data->>'college_identifier',
        v_requested_role,
        v_approval_status,
        true
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_token_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies
-- Profiles: Users see themselves; Staff, Owner & Admin see all for verification
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.get_current_role() IN ('staff', 'shop_owner', 'accountant', 'admin'));

DROP POLICY IF EXISTS "profiles_update_self_policy" ON public.profiles;
CREATE POLICY "profiles_update_self_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Canteens: Public read
DROP POLICY IF EXISTS "canteens_select_public" ON public.canteens;
CREATE POLICY "canteens_select_public" ON public.canteens FOR SELECT USING (true);

DROP POLICY IF EXISTS "canteens_admin_modify" ON public.canteens;
CREATE POLICY "canteens_admin_modify" ON public.canteens FOR ALL USING (public.get_current_role() = 'admin');

-- Menu Categories & Items: Public read for active
DROP POLICY IF EXISTS "menu_categories_select_public" ON public.menu_categories;
CREATE POLICY "menu_categories_select_public" ON public.menu_categories
    FOR SELECT USING (is_active = true OR public.get_current_role() IN ('staff', 'shop_owner', 'admin'));

DROP POLICY IF EXISTS "menu_categories_owner_manage" ON public.menu_categories;
CREATE POLICY "menu_categories_owner_manage" ON public.menu_categories
    FOR ALL USING (public.get_current_role() = 'admin' OR public.is_owner_of_shop(canteen_id));

DROP POLICY IF EXISTS "menu_items_select_public" ON public.menu_items;
CREATE POLICY "menu_items_select_public" ON public.menu_items
    FOR SELECT USING (is_available = true OR public.get_current_role() IN ('staff', 'shop_owner', 'admin'));

DROP POLICY IF EXISTS "menu_items_owner_manage" ON public.menu_items;
CREATE POLICY "menu_items_owner_manage" ON public.menu_items
    FOR ALL USING (public.get_current_role() = 'admin' OR public.is_owner_of_shop(canteen_id));

-- Orders: Students see their own; Shop Owners see strictly their shop's orders; Admin sees all
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT USING (
        student_id = auth.uid() OR
        public.get_current_role() IN ('staff', 'accountant', 'admin') OR
        public.is_owner_of_shop(canteen_id)
    );

DROP POLICY IF EXISTS "orders_insert_student" ON public.orders;
CREATE POLICY "orders_insert_student" ON public.orders
    FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE USING (
        public.get_current_role() IN ('staff', 'admin') OR
        public.is_owner_of_shop(canteen_id) OR
        (student_id = auth.uid() AND status IN ('pending_payment', 'placed'))
    );

-- Order Items
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
CREATE POLICY "order_items_select_policy" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.student_id = auth.uid() OR public.get_current_role() IN ('staff', 'accountant', 'admin') OR public.is_owner_of_shop(orders.canteen_id))
        )
    );

DROP POLICY IF EXISTS "order_items_insert_student" ON public.order_items;
CREATE POLICY "order_items_insert_student" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND orders.student_id = auth.uid()
        )
    );

-- 16. Seed 5 Campus Shops
INSERT INTO public.canteens (id, name, shop_code, campus_name, timezone, opening_time, closing_time, is_accepting_orders, max_active_orders_capacity, description, cover_image_url, display_order) VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'KBR Chicken', 'KBR', 'Malla Reddy Engineering College for Women', 'Asia/Kolkata', '09:00:00', '16:00:00', true, 80, 'Affordable, crispy chicken fast food, burgers, popcorn & wings designed for campus students.', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80', 1),
    ('a0000000-0000-0000-0000-000000000002', 'Dragon Hub', 'DRAGON', 'Malla Reddy Engineering College for Women', 'Asia/Kolkata', '09:00:00', '16:00:00', true, 75, 'Popular fast-food hub serving noodles, fried rice, burgers, momos, pizzas and crispy bites.', 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80', 2),
    ('a0000000-0000-0000-0000-000000000003', 'Brown Bear', 'BROWNBEAR', 'Malla Reddy Engineering College for Women', 'Asia/Kolkata', '09:00:00', '16:00:00', true, 60, 'Dedicated campus bakery and cafe outlet. (Menu and pricing awaiting owner confirmation).', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80', 3),
    ('a0000000-0000-0000-0000-000000000004', 'Milkshakes', 'SHAKES', 'Malla Reddy Engineering College for Women', 'Asia/Kolkata', '09:00:00', '16:00:00', true, 90, 'Refreshing thick milkshakes, cold coffees, seasonal fresh juices, smoothies and faloodas.', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=80', 4),
    ('a0000000-0000-0000-0000-000000000005', 'Wraps', 'WRAPS', 'Malla Reddy Engineering College for Women', 'Asia/Kolkata', '09:00:00', '16:00:00', true, 70, 'Freshly rolled vegetable, paneer, egg and chicken wraps packed with authentic flavours and crunch.', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&auto=format&fit=crop&q=80', 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    shop_code = EXCLUDED.shop_code,
    description = EXCLUDED.description,
    cover_image_url = EXCLUDED.cover_image_url,
    display_order = EXCLUDED.display_order;

-- 17. Seed Categories
INSERT INTO public.menu_categories (id, canteen_id, name, display_order, is_active) VALUES
    ('b1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Crispy Fried Chicken', 1, true),
    ('b1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Chicken Burgers & Wraps', 2, true),
    ('b1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Popcorn, Strips & Wings', 3, true),
    ('b1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Fries, Dips & Drinks', 4, true),

    ('b2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Wok Noodles & Rice', 1, true),
    ('b2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Burgers & Sandwiches', 2, true),
    ('b2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Momos & Starters', 3, true),

    ('b3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Bakery & Pastries (Draft)', 1, true),
    ('b3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Hot Beverages & Bakes (Draft)', 2, true),

    ('b4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Thick Milkshakes', 1, true),
    ('b4000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Cold Coffee & Smoothies', 2, true),
    ('b4000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'Fresh Fruit Juices', 3, true),

    ('b5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'Vegetarian & Paneer Wraps', 1, true),
    ('b5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'Egg & Chicken Wraps', 2, true),
    ('b5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Sides & Drinks', 3, true)
ON CONFLICT (id) DO NOTHING;

-- 18. Seed Menu Items
INSERT INTO public.menu_items (id, canteen_id, category_id, name, description, price_paise, image_url, is_vegetarian, stock_quantity, is_available, preparation_minutes, is_draft) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'KBR Crispy Fried Drumstick (2 pcs)', 'Golden crunchy fried chicken drumsticks marinated in campus secret spices.', 9900, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80', false, 40, true, 8, false),
    ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'KBR Hot & Crispy 4-Piece Box', 'Four pieces of spiced fried chicken served with garlic dip and zesty seasoning.', 18900, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80', false, 30, true, 10, false),
    ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'KBR Crunchy Chicken Burger', 'Crispy chicken fillet with fresh lettuce and pepper mayonnaise in toasted sesame buns.', 8500, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', false, 45, true, 7, false),
    ('c1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'KBR Crispy Chicken Wrap', 'Tender fried chicken strips, shredded lettuce, and creamy ranch rolled in warm tortilla.', 7900, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80', false, 35, true, 6, false),
    ('c1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'KBR Chicken Popcorn (Regular)', 'Bite-sized seasoned chicken popcorn fried crisp and tossed in peri-peri dust.', 6900, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80', false, 50, true, 5, false),

    ('c2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'Schezwan Veg Hakka Noodles', 'Wok-tossed noodles with shredded cabbage, bell peppers, carrots, and spicy Schezwan sauce.', 7500, 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80', true, 40, true, 8, false),
    ('c2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'Egg & Chicken Fried Rice', 'Fragrant rice tossed with scrambled egg, tender chicken pieces, spring onions, and soya.', 9000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80', false, 35, true, 9, false),
    ('c2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'Dragon Veg Cheese Burger', 'Golden spiced veg patty, melted cheese slice, tangy mayo, and crisp lettuce.', 6500, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80', true, 40, true, 6, false),

    ('c3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000001', 'Brown Bear Chocolate Brownie (Draft)', '[Unconfirmed draft item - awaiting shop owner confirmation]. Rich chocolate brownie with walnut bits.', 6000, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80', true, 20, true, 2, true),
    ('c3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000001', 'Fresh Veg Puff (Draft)', '[Unconfirmed draft item - awaiting shop owner confirmation]. Flaky puff pastry with spiced vegetable filling.', 3000, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80', true, 30, true, 2, true),

    ('c4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000001', 'Belgium Dark Chocolate Shake', 'Rich creamy shake blended with dark chocolate ganache, topped with chocolate curls.', 7500, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80', true, 40, true, 4, false),
    ('c4000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000001', 'Oreo Crunch Thickshake', 'Crushed chocolate Oreo cookies blended with dairy vanilla ice cream and whipped top.', 7000, 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80', true, 35, true, 4, false),

    ('c5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000001', 'Paneer Tikka Roll / Wrap', 'Char-grilled cottage cheese cubes tossed with sliced onions, capsicum, and mint chutney in paratha.', 8000, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80', true, 40, true, 6, false),
    ('c5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000002', 'Double Egg Kathi Roll', 'Two fluffy beaten eggs cooked with paratha, stuffed with spiced sautéed onions and tangy lime juice.', 6000, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80', false, 45, true, 5, false)
ON CONFLICT (id) DO UPDATE SET price_paise = EXCLUDED.price_paise;
