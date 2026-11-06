-- ====================================================================
-- Quesless Campus — Migration 004: Multi-Shop Architecture & Shop Owner Role
-- Institution: Malla Reddy Engineering College for Women (MRECW)
-- ====================================================================

-- 1. Extend Profiles Table with 'shop_owner' role
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('student', 'staff', 'shop_owner', 'accountant', 'admin'));

-- 2. Extend Orders Table with 'rejected' status and rejection metadata
ALTER TABLE public.orders 
    DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
    ADD CONSTRAINT orders_status_check 
    CHECK (status IN (
        'pending_payment', 
        'placed', 
        'accepted', 
        'preparing', 
        'ready', 
        'collected', 
        'rejected', 
        'cancelled', 
        'payment_failed'
    ));

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Shop Assignments Table (Securely links authenticated users to shops)
CREATE TABLE IF NOT EXISTS public.shop_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_shop_assignment UNIQUE (user_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_assignments_user ON public.shop_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_assignments_shop ON public.shop_assignments(shop_id);

-- 4. Add Shop Metadata to Canteens (representing independent campus shops)
ALTER TABLE public.canteens
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
    ADD COLUMN IF NOT EXISTS shop_code TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- 5. Seed the Five Campus Shops for MRECW
INSERT INTO public.canteens (
    id,
    name,
    shop_code,
    campus_name,
    timezone,
    opening_time,
    closing_time,
    is_accepting_orders,
    max_active_orders_capacity,
    description,
    cover_image_url,
    display_order
) VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'KBR Chicken',
        'KBR',
        'Malla Reddy Engineering College for Women',
        'Asia/Kolkata',
        '09:00:00',
        '16:00:00',
        true,
        80,
        'Affordable, crispy chicken fast food, burgers, popcorn & wings designed for campus students.',
        'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80',
        1
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'Dragon Hub',
        'DRAGON',
        'Malla Reddy Engineering College for Women',
        'Asia/Kolkata',
        '09:00:00',
        '16:00:00',
        true,
        75,
        'Popular fast-food hub serving noodles, fried rice, burgers, momos, pizzas and crispy bites.',
        'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80',
        2
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'Brown Bear',
        'BROWNBEAR',
        'Malla Reddy Engineering College for Women',
        'Asia/Kolkata',
        '09:00:00',
        '16:00:00',
        true,
        60,
        'Dedicated campus bakery and cafe outlet. (Menu and pricing awaiting owner confirmation).',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
        3
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'Milkshakes',
        'SHAKES',
        'Malla Reddy Engineering College for Women',
        'Asia/Kolkata',
        '09:00:00',
        '16:00:00',
        true,
        90,
        'Refreshing thick milkshakes, cold coffees, seasonal fresh juices, smoothies and faloodas.',
        'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=80',
        4
    ),
    (
        'a0000000-0000-0000-0000-000000000005',
        'Wraps',
        'WRAPS',
        'Malla Reddy Engineering College for Women',
        'Asia/Kolkata',
        '09:00:00',
        '16:00:00',
        true,
        70,
        'Freshly rolled vegetable, paneer, egg and chicken wraps packed with authentic flavours and crunch.',
        'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&auto=format&fit=crop&q=80',
        5
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    shop_code = EXCLUDED.shop_code,
    description = EXCLUDED.description,
    cover_image_url = EXCLUDED.cover_image_url,
    display_order = EXCLUDED.display_order,
    is_accepting_orders = EXCLUDED.is_accepting_orders;

-- 6. Helper Security Functions for Row Level Security
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

-- 7. Enable RLS on shop_assignments
ALTER TABLE public.shop_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_assignments_select" ON public.shop_assignments
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        public.get_current_role() = 'admin'
    );

CREATE POLICY "shop_assignments_admin_manage" ON public.shop_assignments
    FOR ALL
    USING (public.get_current_role() = 'admin');

-- 8. Shop Owner RLS Policies for Orders and Menus
-- Shop owners can view orders belonging strictly to their assigned shop
DROP POLICY IF EXISTS "orders_shop_owner_select" ON public.orders;
CREATE POLICY "orders_shop_owner_select" ON public.orders
    FOR SELECT
    USING (
        student_id = auth.uid() OR
        public.get_current_role() IN ('staff', 'accountant', 'admin') OR
        public.is_owner_of_shop(canteen_id)
    );

-- Shop owners can update status for orders in their shop
DROP POLICY IF EXISTS "orders_shop_owner_update" ON public.orders;
CREATE POLICY "orders_shop_owner_update" ON public.orders
    FOR UPDATE
    USING (
        public.get_current_role() IN ('staff', 'admin') OR
        public.is_owner_of_shop(canteen_id) OR
        (student_id = auth.uid() AND status IN ('pending_payment', 'placed'))
    );

-- Shop owners can manage menu categories and items in their assigned shop
DROP POLICY IF EXISTS "menu_items_owner_manage" ON public.menu_items;
CREATE POLICY "menu_items_owner_manage" ON public.menu_items
    FOR ALL
    USING (
        public.get_current_role() = 'admin' OR
        public.is_owner_of_shop(canteen_id)
    );

DROP POLICY IF EXISTS "menu_categories_owner_manage" ON public.menu_categories;
CREATE POLICY "menu_categories_owner_manage" ON public.menu_categories
    FOR ALL
    USING (
        public.get_current_role() = 'admin' OR
        public.is_owner_of_shop(canteen_id)
    );
