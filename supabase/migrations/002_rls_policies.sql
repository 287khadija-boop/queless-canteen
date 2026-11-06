-- ====================================================================
-- Quesless Campus — Migration 002: Row Level Security (RLS) Policies
-- Institution: Malla Reddy Engineering College for Women (MRECW)
-- ====================================================================

-- 1. Helper function to check role of current authenticated user safely
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_token_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 3. PROFILES POLICIES
-- ====================================================================
-- Users can view their own profile; Staff and Admins can view all profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id OR
        public.get_current_role() IN ('staff', 'admin')
    );

-- Users can update only their own profile, but cannot change their role
CREATE POLICY "profiles_update_self_policy" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevents privilege escalation
    );

-- Admins can update any profile (e.g. promote staff)
CREATE POLICY "profiles_admin_update_policy" ON public.profiles
    FOR UPDATE
    USING (public.get_current_role() = 'admin');

-- ====================================================================
-- 4. CANTEENS POLICIES
-- ====================================================================
-- Anyone can read canteen details
CREATE POLICY "canteens_select_public" ON public.canteens
    FOR SELECT
    USING (true);

-- Only admins can modify canteen settings
CREATE POLICY "canteens_admin_modify" ON public.canteens
    FOR ALL
    USING (public.get_current_role() = 'admin');

-- ====================================================================
-- 5. MENU CATEGORIES & ITEMS POLICIES
-- ====================================================================
-- Anyone can view active categories
CREATE POLICY "menu_categories_select_public" ON public.menu_categories
    FOR SELECT
    USING (is_active = true OR public.get_current_role() IN ('staff', 'admin'));

-- Only admins can manage categories
CREATE POLICY "menu_categories_admin_all" ON public.menu_categories
    FOR ALL
    USING (public.get_current_role() = 'admin');

-- Anyone can view available items; Staff and Admins can view all items
CREATE POLICY "menu_items_select_public" ON public.menu_items
    FOR SELECT
    USING (is_available = true OR public.get_current_role() IN ('staff', 'admin'));

-- Admins can manage menu items
CREATE POLICY "menu_items_admin_all" ON public.menu_items
    FOR ALL
    USING (public.get_current_role() = 'admin');

-- Staff can update availability & stock for kitchen management
CREATE POLICY "menu_items_staff_update" ON public.menu_items
    FOR UPDATE
    USING (public.get_current_role() IN ('staff', 'admin'))
    WITH CHECK (public.get_current_role() IN ('staff', 'admin'));

-- ====================================================================
-- 6. PICKUP SLOTS POLICIES
-- ====================================================================
-- Anyone can view open pickup slots
CREATE POLICY "pickup_slots_select_public" ON public.pickup_slots
    FOR SELECT
    USING (true);

-- Admins and Staff can manage slots
CREATE POLICY "pickup_slots_admin_manage" ON public.pickup_slots
    FOR ALL
    USING (public.get_current_role() IN ('staff', 'admin'));

-- ====================================================================
-- 7. ORDERS POLICIES
-- ====================================================================
-- Students see their own orders; Staff and Admin see all orders for management
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT
    USING (
        student_id = auth.uid() OR
        public.get_current_role() IN ('staff', 'admin')
    );

-- Authenticated students can insert orders for themselves
CREATE POLICY "orders_insert_student" ON public.orders
    FOR INSERT
    WITH CHECK (student_id = auth.uid());

-- Staff and Admins can update order status; Students can update only to cancel unstarted orders
CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE
    USING (
        public.get_current_role() IN ('staff', 'admin') OR
        (student_id = auth.uid() AND status IN ('pending_payment', 'placed'))
    );

-- ====================================================================
-- 8. ORDER ITEMS POLICIES
-- ====================================================================
CREATE POLICY "order_items_select_policy" ON public.order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.student_id = auth.uid() OR public.get_current_role() IN ('staff', 'admin'))
        )
    );

CREATE POLICY "order_items_insert_student" ON public.order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.student_id = auth.uid()
        )
    );

-- ====================================================================
-- 9. PAYMENTS POLICIES
-- ====================================================================
CREATE POLICY "payments_select_policy" ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payments.order_id
            AND (orders.student_id = auth.uid() OR public.get_current_role() IN ('staff', 'admin'))
        )
    );

-- ====================================================================
-- 10. NOTIFICATIONS POLICIES
-- ====================================================================
CREATE POLICY "notifications_select_self" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notifications_update_self" ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- ====================================================================
-- 11. INVENTORY MOVEMENTS & AUDIT LOGS POLICIES
-- ====================================================================
CREATE POLICY "inventory_movements_staff_admin" ON public.inventory_movements
    FOR SELECT
    USING (public.get_current_role() IN ('staff', 'admin'));

CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
    FOR SELECT
    USING (public.get_current_role() = 'admin');
