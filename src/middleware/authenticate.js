import { createScopedClient } from '../config/supabase.js';
import { AppError } from './error-handler.js';

export const DEMO_TOKENS = {
  'demo-student-token': {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'student@mrecw.ac.in',
    role: 'student',
    full_name: 'Khadija (Student Demo)',
    college_identifier: '21RH1A0501',
    phone: '9876543210',
    is_active: true,
  },
  'demo-staff-token': {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'staff@mrecw.ac.in',
    role: 'staff',
    full_name: 'MRECW Kitchen Staff',
    college_identifier: 'STAFF-01',
    phone: '9876543211',
    is_active: true,
  },
  'demo-admin-token': {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'admin@mrecw.ac.in',
    role: 'admin',
    approval_status: 'approved',
    full_name: 'MRECW Canteen Admin',
    college_identifier: 'ADMIN-01',
    phone: '9876543212',
    is_active: true,
  },
  'demo-accountant-token': {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'accountant@mrecw.ac.in',
    role: 'accountant',
    approval_status: 'approved',
    full_name: 'MRECW Accounts Officer',
    college_identifier: 'ACCT-01',
    phone: '9876543213',
    is_active: true,
  },
  'demo-owner-token': {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'owner@mrecw.ac.in',
    role: 'shop_owner',
    approval_status: 'approved',
    full_name: 'KBR Chicken Manager',
    college_identifier: 'OWNER-KBR',
    phone: '9876543214',
    assigned_shop_id: 'a0000000-0000-0000-0000-000000000001',
    assigned_shop_name: 'KBR Chicken',
    is_active: true,
  },
  'demo-kbr-token': {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'kbr.owner@mrecw.ac.in',
    role: 'shop_owner',
    approval_status: 'approved',
    full_name: 'KBR Chicken Manager',
    college_identifier: 'OWNER-KBR',
    phone: '9876543214',
    assigned_shop_id: 'a0000000-0000-0000-0000-000000000001',
    assigned_shop_name: 'KBR Chicken',
    is_active: true,
  },
  'demo-dragon-token': {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'dragon.owner@mrecw.ac.in',
    role: 'shop_owner',
    approval_status: 'approved',
    full_name: 'Dragon Hub Manager',
    college_identifier: 'OWNER-DH',
    phone: '9876543215',
    assigned_shop_id: 'a0000000-0000-0000-0000-000000000002',
    assigned_shop_name: 'Dragon Hub',
    is_active: true,
  },
  'demo-brownbear-token': {
    id: '00000000-0000-0000-0000-000000000007',
    email: 'brownbear.owner@mrecw.ac.in',
    role: 'shop_owner',
    approval_status: 'approved',
    full_name: 'Brown Bear Manager',
    college_identifier: 'OWNER-BB',
    phone: '9876543216',
    assigned_shop_id: 'a0000000-0000-0000-0000-000000000003',
    assigned_shop_name: 'Brown Bear',
    is_active: true,
  },
  'demo-milkshakes-token': {
    id: '00000000-0000-0000-0000-000000000008',
    email: 'milkshakes.owner@mrecw.ac.in',
    role: 'shop_owner',
    approval_status: 'approved',
    full_name: 'Milkshakes Manager',
    college_identifier: 'OWNER-MS',
    phone: '9876543217',
    assigned_shop_id: 'a0000000-0000-0000-0000-000000000004',
    assigned_shop_name: 'Milkshakes',
    is_active: true,
  },
  'demo-wraps-token': {
    id: '00000000-0000-0000-0000-000000000009',
    email: 'wraps.owner@mrecw.ac.in',
    role: 'shop_owner',
    approval_status: 'approved',
    full_name: 'Wraps Manager',
    college_identifier: 'OWNER-WR',
    phone: '9876543218',
    assigned_shop_id: 'a0000000-0000-0000-0000-000000000005',
    assigned_shop_name: 'Wraps',
    is_active: true,
  },
};

/**
 * Authentication Middleware
 * Extracts and verifies Supabase JWT token or active demo session token from Authorization header or cookie
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.sb_access_token) {
      token = req.cookies.sb_access_token;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please sign in.', 401, 'UNAUTHORIZED'));
    }

    // Check for campus demo session tokens (enables evaluation even during external email rate limits)
    if (DEMO_TOKENS[token]) {
      const demoUser = DEMO_TOKENS[token];
      req.user = {
        ...demoUser,
        token,
      };
      return next();
    }

    // Verify token with Supabase Auth
    const userClient = createScopedClient(token);
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);

    if (authError || !user) {
      return next(new AppError('Invalid or expired authentication session. Please sign in again.', 401, 'INVALID_SESSION'));
    }

    // Retrieve user profile to determine trusted role
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id, full_name, college_identifier, role, approval_status, is_active, phone')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // In case trigger hasn't fired or profile needs fallback, default to student
      req.user = {
        id: user.id,
        email: user.email,
        role: 'student',
        approval_status: 'approved',
        full_name: user.user_metadata?.full_name || 'Student User',
        college_identifier: user.user_metadata?.college_identifier || null,
        phone: user.user_metadata?.phone || null,
        is_active: true,
        token,
      };
      return next();
    }

    if (!profile.is_active) {
      return next(new AppError('Your account has been deactivated. Please contact canteen admin.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    if (profile.role !== 'student' && profile.approval_status === 'pending') {
      return next(new AppError('Your account request is pending administrative approval.', 403, 'ACCOUNT_PENDING_APPROVAL'));
    }

    if (profile.approval_status === 'rejected') {
      return next(new AppError('Your account request was not approved. Please contact canteen admin.', 403, 'ACCOUNT_REJECTED'));
    }

    let assignedShop = null;
    if (profile.role === 'shop_owner') {
      try {
        const { data: assignment } = await userClient
          .from('shop_assignments')
          .select('shop_id, canteens(name)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (assignment) {
          assignedShop = {
            id: assignment.shop_id,
            name: assignment.canteens?.name || 'Assigned Shop',
          };
        }
      } catch (err) {
        // Table might not exist yet before migration
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      approval_status: profile.approval_status || 'approved',
      full_name: profile.full_name,
      college_identifier: profile.college_identifier,
      phone: profile.phone,
      is_active: profile.is_active,
      assigned_shop_id: assignedShop?.id || null,
      assigned_shop_name: assignedShop?.name || null,
      token,
    };

    next();
  } catch (err) {
    next(err);
  }
}
