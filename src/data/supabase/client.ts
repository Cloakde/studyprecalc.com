import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as Partial<Record<string, string>>;

export const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? '';
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;
