import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const isPlaceholderKey =
  !env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_ROLE_KEY.includes('mock-') ||
  env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder') ||
  env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_') ||
  env.SUPABASE_URL.includes('your-project');

if (isPlaceholderKey && env.NODE_ENV !== 'test') {
  console.warn(
    '[Quesless Campus] Warning: Using placeholder Supabase credentials. Database operations requiring Supabase will require real credentials in .env.'
  );
}

// Trusted server-side admin client (bypasses RLS for secure system tasks)
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper to create a user-scoped client that respects Row Level Security (RLS)
export function createScopedClient(token) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}
