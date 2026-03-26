import { createClient } from "@/lib/supabase/client"

export class UserManagementService {
  private supabase = createClient()

  async ensureUserExists(authUser: any) {
    if (!authUser?.id) {
      throw new Error("No authenticated user provided")
    }

    try {
      // Check if user exists in database
      const { data: existingUser, error: fetchError } = await this.supabase
        .from("users")
        .select("id, username, elo_rating")
        .eq("id", authUser.id)
        .single()

      // If user exists, return them
      if (existingUser && !fetchError) {
        return existingUser
      }

      // If user doesn't exist (PGRST116 error or null data), create them
      if (fetchError?.code === "PGRST116" || !existingUser) {
        console.log("[v0] Creating new user in database:", authUser.id)

        const newUser = {
          id: authUser.id,
          username:
            authUser.user_metadata?.username || authUser.email?.split("@")[0] || `User_${authUser.id.slice(0, 8)}`,
          email: authUser.email,
          display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.username || null,
          elo_rating: 1200,
          wins: 0,
          losses: 0,
          total_games: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { data: createdUser, error: createError } = await this.supabase
          .from("users")
          .insert(newUser)
          .select()
          .single()

        if (createError) {
          console.error("[v0] Error creating user:", createError)
          throw createError
        }

        console.log("[v0] Successfully created user:", createdUser.username)
        return createdUser
      }

      // If there's a different error, throw it
      throw fetchError
    } catch (error) {
      console.error("[v0] Error in ensureUserExists:", error)
      throw error
    }
  }

  async getCurrentUser() {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await this.supabase.auth.getUser()

      if (authError || !authUser) {
        throw new Error("Not authenticated")
      }

      return await this.ensureUserExists(authUser)
    } catch (error) {
      console.error("[v0] Error getting current user:", error)
      throw error
    }
  }
}

export const userManagementService = new UserManagementService()
