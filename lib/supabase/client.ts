import { createBrowserClient } from "@supabase/ssr"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

const supabase = isSupabaseConfigured
  ? createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : ({
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: null }, error: null }),
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          not: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          in: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
      channel: () => ({
        on: () => ({ subscribe: () => Promise.resolve() }),
        subscribe: () => Promise.resolve(),
        unsubscribe: () => Promise.resolve(),
      }),
    } as any)

// Export the createClient function for consistency with tournament service
export const createClient = () => supabase

// Also export the supabase instance directly
export { supabase }
