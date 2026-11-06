/**
 * Quesless Campus — Client Authentication Module
 * Malla Reddy Engineering College for Women
 */

const SESSION_KEY = 'qc_session';

/**
 * Register a new user account (student, staff, or accountant) via backend API
 */
export async function signUpUser({ email, password, fullName, collegeIdentifier, role = 'student' }) {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      college_identifier: collegeIdentifier || null,
      role,
    }),
  });

  const resJson = await response.json();

  if (!response.ok || !resJson.success) {
    const errorMsg = resJson.error?.message || resJson.message || 'Registration failed';
    throw new Error(errorMsg);
  }

  // If session was granted immediately (auto-confirm enabled for students)
  if (resJson.data?.session?.access_token) {
    saveSession(resJson.data.session);
  }

  return resJson;
}

// Backwards-compatible alias for existing callers
export const signUpStudent = (params) => signUpUser({ ...params, role: 'student' });

/**
 * Sign in with email and password via backend API
 * @param {string} email
 * @param {string} password
 * @param {string} [portal] - 'student', 'staff', 'accountant', or 'admin'
 */
export async function signInUser(email, password, portal = 'student') {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, portal }),
  });

  const resJson = await response.json();

  if (!response.ok || !resJson.success) {
    const errorMsg = resJson.error?.message || resJson.message || 'Invalid email or password';
    throw new Error(errorMsg);
  }

  if (resJson.data?.session) {
    saveSession(resJson.data.session);
  }

  return resJson.data;
}

/**
 * Request password recovery email
 */
export async function sendPasswordResetEmail(email) {
  const url = `${window.CONFIG.SUPABASE_URL}/auth/v1/recover`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: window.CONFIG.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      redirect_to: `${window.location.origin}/login.html`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || data.message || 'Failed to send reset email');
  }

  return data;
}

/**
 * Request resending verification email
 */
export async function resendVerificationLink(email) {
  const response = await fetch('/api/v1/auth/resend-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const resJson = await response.json();
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error?.message || resJson.message || 'Failed to resend verification email');
  }

  return resJson;
}

/**
 * Sign out current session
 */
export async function signOutUser() {
  try {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
  } catch (e) {
    console.warn('Logout network notice:', e);
  }

  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/login.html';
}

/**
 * Save auth session to localStorage
 */
function saveSession(sessionData) {
  const payload = {
    access_token: sessionData.access_token,
    refresh_token: sessionData.refresh_token,
    expires_at: Date.now() + (sessionData.expires_in || 3600) * 1000,
    user: sessionData.user,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

/**
 * Retrieve active session from localStorage (checks expiry)
 */
export function getStoredSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (session.expires_at && Date.now() > session.expires_at) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/**
 * Fetch verified user profile & role from the backend /api/v1/me endpoint
 */
export async function fetchCurrentUserProfile() {
  const session = getStoredSession();
  const headers = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch('/api/v1/me', { headers });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(SESSION_KEY);
    }
    return null;
  }

  const json = await res.json();
  return json.data;
}

/**
 * Protect a page by enforcing authentication and required roles
 */
export async function requireAuth(allowedRoles = []) {
  const session = getStoredSession();
  const profile = await fetchCurrentUserProfile();

  if (!session && !profile) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }

  if (!profile) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    // Redirect to the user's appropriate portal if they try accessing another role's page
    if (profile.role === 'admin') window.location.href = '/admin/dashboard.html';
    else if (profile.role === 'accountant') window.location.href = '/accountant/dashboard.html';
    else if (profile.role === 'shop_owner') window.location.href = '/owner/dashboard.html';
    else if (profile.role === 'staff') window.location.href = '/staff/dashboard.html';
    else window.location.href = '/student/dashboard.html';
    return null;
  }

  return { session, profile };
}

window.Auth = {
  signUpUser,
  signUpStudent,
  signInUser,
  sendPasswordResetEmail,
  resendVerificationLink,
  signOutUser,
  getStoredSession,
  fetchCurrentUserProfile,
  requireAuth,
};
