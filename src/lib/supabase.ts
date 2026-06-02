import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazy initialization - only create clients when needed
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
};

export const getSupabaseAdmin = (): SupabaseClient => {
  if (!_supabaseAdmin) {
    if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    }
    _supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabaseAdmin;
};

// For backward compatibility - these will throw if accessed before initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    return getSupabase()[prop as keyof SupabaseClient];
  },
}) as SupabaseClient;

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    return getSupabaseAdmin()[prop as keyof SupabaseClient];
  },
}) as SupabaseClient;
