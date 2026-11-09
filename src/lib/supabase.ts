import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client.
 *
 * Only the public project URL and the public anon/publishable key are read here.
 * Never place a service-role key or database password in a VITE_ variable: all
 * VITE_ values are embedded in the shipped JavaScript bundle.
 */
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
// Prefer the legacy anon key but fall back to the newer publishable key name.
// Using `||` (not `??`) means an empty placeholder does not block the fallback.
const rawAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  '';

export const isSupabaseConfigured = Boolean(
  rawUrl && rawAnonKey && /^https?:\/\//i.test(rawUrl)
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl as string, rawAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and restart the dev server.'
    );
  }
  return supabase;
}

export function describeSupabaseError(error: unknown): string {
  if (!error) return 'Unknown Supabase error.';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const message =
      typeof candidate.message === 'string' ? candidate.message : 'Supabase request failed.';
    const details = typeof candidate.details === 'string' ? ` ${candidate.details}` : '';
    const hint = typeof candidate.hint === 'string' ? ` ${candidate.hint}` : '';
    const code = typeof candidate.code === 'string' ? ` (${candidate.code})` : '';
    return `${message}${details}${hint}${code}`.trim();
  }
  return String(error);
}
