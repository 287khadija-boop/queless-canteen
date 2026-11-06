-- ====================================================================
-- Quesless Campus — Migration 001: Initial Schema
-- Institution: Malla Reddy Engineering College for Women (MRECW)
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    college_identifier TEXT UNIQUE, -- e.g. Roll number / Hall ticket
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin')),
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Canteens Table
CREATE TABLE IF NOT EXISTS public.canteens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    campus_name TEXT NOT NULL DEFAULT 'Malla Reddy Engineering College for Women',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    opening_time TIME NOT NULL DEFAULT '09:00:00',
    closing_time TIME NOT NULL DEFAULT '16:00:00',
    is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
    max_active_orders_capacity INT NOT NULL DEFAULT 60 CHECK (max_active_orders_capacity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Menu Categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    price_paise INT NOT NULL CHECK (price_paise > 0), -- Stored in integer paise (1 INR = 100 paise)
    image_url TEXT,
    is_vegetarian BOOLEAN NOT NULL DEFAULT true,
    stock_quantity INT NOT NULL DEFAULT 50 CHECK (stock_quantity >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    preparation_minutes INT NOT NULL DEFAULT 10 CHECK (preparation_minutes > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Dedicated Atomic Daily Token Counters Table
CREATE TABLE IF NOT EXISTS public.daily_token_counters (
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    token_date DATE NOT NULL,
    last_token INT NOT NULL DEFAULT 0,
    PRIMARY KEY (canteen_id, token_date)
);

-- 7. Pickup Slots Table (for scheduled pickup windows)
CREATE TABLE IF NOT EXISTS public.pickup_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    capacity INT NOT NULL DEFAULT 25 CHECK (capacity > 0),
    reserved_count INT NOT NULL DEFAULT 0 CHECK (reserved_count >= 0 AND reserved_count <= capacity),
    is_open BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_slot_range CHECK (ends_at > starts_at)
);

-- 8. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE RESTRICT,
    token_number INT NOT NULL,
    token_date DATE NOT NULL DEFAULT CURRENT_DATE,
    order_type TEXT NOT NULL CHECK (order_type IN ('asap', 'scheduled')),
    scheduled_pickup_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'placed' CHECK (
        status IN ('pending_payment', 'placed', 'accepted', 'preparing', 'ready', 'collected', 'cancelled', 'payment_failed')
    ),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('counter', 'online')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    subtotal_paise INT NOT NULL CHECK (subtotal_paise >= 0),
    fees_paise INT NOT NULL DEFAULT 0 CHECK (fees_paise >= 0),
    total_paise INT NOT NULL CHECK (total_paise >= 0),
    estimated_ready_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_token_per_day_canteen UNIQUE (canteen_id, token_date, token_number)
);

-- 9. Order Items Table (Snapshotting item name and unit price at time of purchase)
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

-- 10. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('sandbox', 'counter', 'razorpay')),
    provider_payment_id TEXT,
    amount_paise INT NOT NULL CHECK (amount_paise >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'refunded')),
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Inventory Movements Table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    quantity_change INT NOT NULL, -- Negative for orders, positive for restock
    reason TEXT NOT NULL CHECK (reason IN ('order_placed', 'order_cancelled', 'restock', 'adjustment', 'wastage')),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- e.g. 'order_confirmed', 'order_ready', 'order_cancelled'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- Performance Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_orders_student_created ON public.orders(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_canteen_status ON public.orders(canteen_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders(canteen_id, token_date, token_number);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled ON public.orders(canteen_id, scheduled_pickup_at) WHERE order_type = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_menu_items_canteen ON public.menu_items(canteen_id, is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pickup_slots_range ON public.pickup_slots(canteen_id, starts_at, is_open);

-- ====================================================================
-- Database Functions
-- ====================================================================

-- Function 1: Atomic Daily Token Generator
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

-- Function 2: Auto-create Profile on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        college_identifier,
        role,
        is_active
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student User'),
        NEW.raw_user_meta_data->>'college_identifier',
        'student', -- Always default to student. Privileged roles MUST be provisioned by admin!
        true
    );
    RETURN NEW;
END;
$$;

-- Trigger to hook auth.users signup to profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
