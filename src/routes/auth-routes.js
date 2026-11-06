import { Router } from 'express';
import { z } from 'zod';
import { authenticate, DEMO_TOKENS } from '../middleware/authenticate.js';
import { createScopedClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error-handler.js';

export const authRouter = Router();

// Validation Schemas
const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  college_identifier: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'staff', 'accountant']).default('student'),
}).superRefine((data, ctx) => {
  if (data.role === 'student' && (!data.college_identifier || data.college_identifier.trim().length < 4)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Hall Ticket / Roll Number (minimum 4 characters) is required for student registration',
      path: ['college_identifier'],
    });
  }
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  portal: z.enum(['student', 'staff', 'shop_owner', 'accountant', 'admin']).optional(),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
});

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  phone: z.string().trim().regex(/^[0-9+\- ]{10,15}$/, 'Phone number must be between 10-15 digits').optional().nullable(),
});

// Demo accounts for guaranteed testing and offline verification
const DEMO_ACCOUNTS = {
  'student@mrecw.ac.in': {
    password: 'Student123!',
    token: 'demo-student-token',
    profile: DEMO_TOKENS['demo-student-token'],
  },
  'staff@mrecw.ac.in': {
    password: 'Staff123!',
    token: 'demo-staff-token',
    profile: DEMO_TOKENS['demo-staff-token'],
  },
  'admin@mrecw.ac.in': {
    password: 'Admin123!',
    token: 'demo-admin-token',
    profile: DEMO_TOKENS['demo-admin-token'],
  },
  'accountant@mrecw.ac.in': {
    password: 'Accountant123!',
    token: 'demo-accountant-token',
    profile: DEMO_TOKENS['demo-accountant-token'],
  },
  'owner@mrecw.ac.in': {
    password: 'Owner123!',
    token: 'demo-owner-token',
    profile: DEMO_TOKENS['demo-owner-token'],
  },
  'kbr.owner@mrecw.ac.in': {
    password: 'Owner123!',
    token: 'demo-kbr-token',
    profile: DEMO_TOKENS['demo-kbr-token'],
  },
  'dragon.owner@mrecw.ac.in': {
    password: 'Owner123!',
    token: 'demo-dragon-token',
    profile: DEMO_TOKENS['demo-dragon-token'],
  },
  'brownbear.owner@mrecw.ac.in': {
    password: 'Owner123!',
    token: 'demo-brownbear-token',
    profile: DEMO_TOKENS['demo-brownbear-token'],
  },
  'milkshakes.owner@mrecw.ac.in': {
    password: 'Owner123!',
    token: 'demo-milkshakes-token',
    profile: DEMO_TOKENS['demo-milkshakes-token'],
  },
  'wraps.owner@mrecw.ac.in': {
    password: 'Owner123!',
    token: 'demo-wraps-token',
    profile: DEMO_TOKENS['demo-wraps-token'],
  },
};

/**
 * POST /api/v1/auth/register
 * User Registration endpoint (supports Student, Staff, and Accountant)
 */
authRouter.post('/auth/register', async (req, res, next) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR', parseResult.error.format()));
    }

    const { full_name, college_identifier, email, password, role } = parseResult.data;
    const initialApproval = role === 'student' ? 'approved' : 'pending';

    // Call Supabase Auth endpoint
    const signupUrl = `${env.SUPABASE_URL}/auth/v1/signup`;
    let response;
    let data;

    try {
      response = await fetch(signupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          data: {
            full_name,
            college_identifier: college_identifier || null,
            role,
            approval_status: initialApproval,
          },
        }),
      });
      data = await response.json();
    } catch (networkErr) {
      return next(new AppError('Unable to connect to authentication service. Please check your network.', 503, 'NETWORK_ERROR'));
    }

    if (!response.ok) {
      if (data.error_code === 'over_email_send_rate_limit' || response.status === 429) {
        return next(
          new AppError(
            'Supabase free email rate limit exceeded. To resolve this, disable "Confirm email" in Supabase Dashboard (Authentication -> Providers -> Email) so signups work instantly without sending emails, or use the demo accounts.',
            429,
            'EMAIL_RATE_LIMIT_EXCEEDED'
          )
        );
      }

      if (data.error_code === 'email_address_invalid') {
        return next(
          new AppError(
            'Supabase could not verify this email address. Please ensure it is typed correctly or check Supabase email provider settings.',
            400,
            'INVALID_EMAIL_DOMAIN'
          )
        );
      }

      const msg = data.msg || data.message || data.error_description || 'Registration failed';
      return next(new AppError(msg, response.status || 400, 'AUTH_ERROR'));
    }

    // Check if session was granted immediately (auto-confirm enabled)
    const hasSession = !!data.access_token;
    if (hasSession && role === 'student') {
      res.cookie('sb_access_token', data.access_token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: (data.expires_in || 3600) * 1000,
      });
    }

    let successMessage = 'Account created successfully!';
    if (role !== 'student') {
      successMessage = 'Staff / Accountant registration submitted! Your account is pending administrative approval before access is granted.';
    } else if (!hasSession) {
      successMessage = 'Student registration submitted! If email confirmation is enabled, check your inbox before logging in.';
    } else {
      successMessage = 'Account registered and signed in successfully!';
    }

    res.status(201).json({
      success: true,
      data: {
        user: data.user || data,
        session: (hasSession && role === 'student')
          ? {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_in: data.expires_in,
            }
          : null,
        email_confirmation_required: !hasSession,
        role,
        approval_status: initialApproval,
      },
      message: successMessage,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/login
 * User Login endpoint (supports Student, Staff, Accountant, and Admin)
 */
authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR', parseResult.error.format()));
    }

    const { email, password, portal } = parseResult.data;

    // 1. Check for Pre-configured Campus Demo Accounts
    if (DEMO_ACCOUNTS[email]) {
      const demo = DEMO_ACCOUNTS[email];
      if (demo.password !== password) {
        return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
      }

      // Check if user selected a portal that conflicts with account role
      if (portal && portal !== demo.profile.role) {
        return next(
          new AppError(
            `Access denied. This account has role '${demo.profile.role}', but you selected the '${portal}' portal.`,
            403,
            'ROLE_PORTAL_MISMATCH'
          )
        );
      }

      if (demo.profile.approval_status === 'pending') {
        return next(
          new AppError(
            'Your account request is pending administrative approval.',
            403,
            'ACCOUNT_PENDING_APPROVAL'
          )
        );
      }

      res.cookie('sb_access_token', demo.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600 * 1000,
      });

      return res.status(200).json({
        success: true,
        data: {
          session: {
            access_token: demo.token,
            expires_in: 7 * 24 * 3600,
            user: { id: demo.profile.id, email: demo.profile.email },
          },
          profile: demo.profile,
        },
        message: 'Sign in successful (Campus Demo Mode)',
      });
    }

    // 2. Call Supabase Auth endpoint
    const loginUrl = `${env.SUPABASE_URL}/auth/v1/token?grant_type=password`;
    let response;
    let data;

    try {
      response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });
      data = await response.json();
    } catch (networkErr) {
      return next(new AppError('Unable to connect to authentication server. Please check your network connection.', 503, 'NETWORK_ERROR'));
    }

    if (!response.ok) {
      if (data.error_description === 'Email not confirmed') {
        return next(
          new AppError(
            'Your email address has not been confirmed yet. Please verify your email via the confirmation link, or turn OFF "Confirm email" in Supabase Dashboard (Authentication -> Providers -> Email).',
            403,
            'EMAIL_NOT_CONFIRMED'
          )
        );
      }

      const msg = data.error_description || data.msg || data.message || 'Invalid email or password';
      return next(new AppError(msg, 401, 'INVALID_CREDENTIALS'));
    }

    // Set HTTP-only session cookie
    res.cookie('sb_access_token', data.access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: (data.expires_in || 3600) * 1000,
    });

    // Fetch verified profile from database
    const userClient = createScopedClient(data.access_token);
    const { data: profile } = await userClient
      .from('profiles')
      .select('id, full_name, college_identifier, role, approval_status, is_active, phone')
      .eq('id', data.user.id)
      .single();

    const userProfile = profile || {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || 'student',
      approval_status: data.user.user_metadata?.approval_status || 'approved',
      full_name: data.user.user_metadata?.full_name || 'Campus User',
      college_identifier: data.user.user_metadata?.college_identifier || null,
      is_active: true,
    };

    if (userProfile.role !== 'student' && userProfile.approval_status === 'pending') {
      res.clearCookie('sb_access_token');
      return next(
        new AppError(
          'Your account request is pending administrative approval before access is granted.',
          403,
          'ACCOUNT_PENDING_APPROVAL'
        )
      );
    }

    // Portal matching check
    if (portal && portal !== userProfile.role) {
      return next(
        new AppError(
          `Access denied. Your account role is '${userProfile.role}', which cannot access the '${portal}' portal.`,
          403,
          'ROLE_PORTAL_MISMATCH'
        )
      );
    }

    res.status(200).json({
      success: true,
      data: {
        session: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          user: data.user,
        },
        profile: userProfile,
      },
      message: 'Sign in successful',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/resend-verification
 * Resend email verification link
 */
authRouter.post('/auth/resend-verification', async (req, res, next) => {
  try {
    const parseResult = resendVerificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR'));
    }

    const { email } = parseResult.data;
    const resendUrl = `${env.SUPABASE_URL}/auth/v1/resend`;

    try {
      const response = await fetch(resendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'signup',
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error_code === 'over_email_send_rate_limit' || response.status === 429) {
          return next(
            new AppError(
              'Email rate limit reached. Please wait a few minutes before requesting another verification email.',
              429,
              'EMAIL_RATE_LIMIT_EXCEEDED'
            )
          );
        }
      }
    } catch (networkErr) {
      return next(new AppError('Unable to connect to email verification service.', 503, 'NETWORK_ERROR'));
    }

    // Privacy-conscious response: return success without exposing email existence
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email address, a verification link has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/logout
 * Sign out and clear session cookie
 */
authRouter.post('/auth/logout', (req, res) => {
  res.clearCookie('sb_access_token');
  res.status(200).json({
    success: true,
    message: 'Signed out successfully',
  });
});

/**
 * GET /api/v1/me
 * Retrieve the current authenticated user's profile and verified role
 */
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        approval_status: req.user.approval_status || 'approved',
        full_name: req.user.full_name,
        college_identifier: req.user.college_identifier,
        phone: req.user.phone || null,
        is_active: req.user.is_active,
      },
      message: 'Profile retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/me
 * Update permitted profile fields for the authenticated user
 */
authRouter.patch('/me', authenticate, async (req, res, next) => {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue.message, 400, 'VALIDATION_ERROR', parseResult.error.format()));
    }

    const { full_name, phone } = parseResult.data;
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    updates.updated_at = new Date().toISOString();

    // If demo token, update demo in-memory object
    if (req.user.token && req.user.token.startsWith('demo-')) {
      if (full_name !== undefined) req.user.full_name = full_name;
      if (phone !== undefined) req.user.phone = phone;
      return res.status(200).json({
        success: true,
        data: {
          id: req.user.id,
          full_name: req.user.full_name,
          college_identifier: req.user.college_identifier,
          role: req.user.role,
          phone: req.user.phone,
          is_active: req.user.is_active,
        },
        message: 'Profile updated successfully',
      });
    }

    const userClient = createScopedClient(req.user.token);
    const { data: updatedProfile, error } = await userClient
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, full_name, college_identifier, role, phone, is_active')
      .single();

    if (error) {
      return next(new AppError(`Failed to update profile: ${error.message}`, 500, 'DATABASE_ERROR'));
    }

    res.status(200).json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (err) {
    next(err);
  }
});
