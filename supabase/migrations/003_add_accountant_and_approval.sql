-- ====================================================================
-- Quesless Campus — Migration 003: Accountant Role & Staff Approval
-- Institution: Malla Reddy Engineering College for Women (MRECW)
-- ====================================================================

-- 1. Modify Profiles Table Role & Approval Status
-- Allow 'accountant' role in addition to 'student', 'staff', 'admin'
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('student', 'staff', 'accountant', 'admin'));

-- Add approval_status column to govern privileged role onboarding
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('approved', 'pending', 'rejected'));

-- Set default approval_status for existing non-student accounts or future privileged accounts
COMMENT ON COLUMN public.profiles.approval_status IS 
    'Students are approved by default. Staff and Accountants must be approved by an administrator before accessing privileged portals.';

-- 2. Update handle_new_user Trigger to Respect Intended Roles Safely
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
    
    -- Ensure role is valid
    IF v_requested_role NOT IN ('student', 'staff', 'accountant', 'admin') THEN
        v_requested_role := 'student';
    END IF;

    -- Students are immediately approved; Staff & Accountants start as pending; Admin cannot be self-requested
    IF v_requested_role = 'admin' THEN
        v_requested_role := 'staff';
        v_approval_status := 'pending';
    ELSIF v_requested_role IN ('staff', 'accountant') THEN
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

-- 3. Accountant-Specific Least-Privilege RLS Policies

-- Accountants can view payments and financial transactions
DROP POLICY IF EXISTS "payments_accountant_select" ON public.payments;
CREATE POLICY "payments_accountant_select" ON public.payments
    FOR SELECT
    USING (public.get_current_role() IN ('accountant', 'admin'));

-- Accountants can view orders (read-only) for invoice reconciliation
DROP POLICY IF EXISTS "orders_accountant_select" ON public.orders;
CREATE POLICY "orders_accountant_select" ON public.orders
    FOR SELECT
    USING (public.get_current_role() = 'accountant');

-- Accountants can view order items (read-only) for itemized sales reports
DROP POLICY IF EXISTS "order_items_accountant_select" ON public.order_items;
CREATE POLICY "order_items_accountant_select" ON public.order_items
    FOR SELECT
    USING (public.get_current_role() = 'accountant');

-- Pending staff/accountants cannot access privileged operations
CREATE OR REPLACE FUNCTION public.is_approved_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('staff', 'accountant', 'admin') 
        AND approval_status = 'approved' 
        AND is_active = true
    );
$$;
