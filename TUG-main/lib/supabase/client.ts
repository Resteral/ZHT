import { createBrowserClient } from "@supabase/ssr"

export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// Simple singleton pattern that's build-safe
let _supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!_supabaseInstance) {
    _supabaseInstance = createClient()
  }
  return _supabaseInstance
}

// Export a direct client instance for backward compatibility
export const supabase = createClient()
