import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we have placeholder values or missing credentials
const hasValidCredentials = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== "YOUR_SUPABASE_URL" && 
  supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY";

if (!hasValidCredentials) {
  console.warn("Supabase credentials not configured. Please connect your Supabase project to enable full functionality.");
}

// Create a mock client if credentials are not available
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ error: { message: "Supabase not connected" } }),
    signOut: () => Promise.resolve({ error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { message: "Supabase not connected" } }),
      }),
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ error: { message: "Supabase not connected" } }),
    update: () => ({
      eq: () => Promise.resolve({ error: { message: "Supabase not connected" } }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ error: { message: "Supabase not connected" } }),
      neq: () => Promise.resolve({ error: { message: "Supabase not connected" } }),
    }),
  }),
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
  }),
  removeChannel: () => {},
});

export const supabase = hasValidCredentials 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  : createMockClient();
