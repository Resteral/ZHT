import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export interface UserSyncResult {
  success: boolean
  userId: string
  username: string
  isNewUser: boolean
  error?: string
}

export class UserSyncService {
  /**
   * Synchronizes auth user with database user record
   * Ensures UUID consistency between auth and database
   */
  static async syncAuthUser(authUserId: string, username: string): Promise<UserSyncResult> {
    try {
      console.log(`[v0] Starting user sync for auth ID: ${authUserId}, username: ${username}`)

      // First check if user exists by auth ID
      const { data: userByAuthId, error: authIdError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUserId)
        .single()

      if (userByAuthId && !authIdError) {
        console.log(`[v0] User found by auth ID: ${userByAuthId.username}`)
        return {
          success: true,
          userId: userByAuthId.id,
          username: userByAuthId.username,
          isNewUser: false,
        }
      }

      // Check if user exists by username
      const { data: userByUsername, error: usernameError } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single()

      if (userByUsername && !usernameError) {
        console.log(
          `[v0] User found by username. Using database ID: ${userByUsername.id} instead of auth ID: ${authUserId}`,
        )

        return {
          success: true,
          userId: userByUsername.id, // Use the database ID, not the auth ID
          username: userByUsername.username,
          isNewUser: false,
        }
      }

      // Create new user if not found
      return await this.createNewUser(authUserId, username)
    } catch (error) {
      console.error(`[v0] User sync error:`, error)
      return {
        success: false,
        userId: authUserId,
        username: username,
        isNewUser: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      }
    }
  }

  /**
   * Creates a new user record with proper defaults
   */
  private static async createNewUser(authUserId: string, username: string): Promise<UserSyncResult> {
    try {
      console.log(`[v0] Creating new user with auth ID: ${authUserId}`)

      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          id: authUserId,
          username: username,
          email: `${username}@temp.com`,
          elo_rating: 1200,
          total_games: 0,
          wins: 0,
          losses: 0,
          balance: 100.0, // Starting balance
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        console.error(`[v0] Failed to create user: ${createError.message}`)
        return {
          success: false,
          userId: authUserId,
          username: username,
          isNewUser: false,
          error: createError.message,
        }
      }

      await supabase.from("user_wallets").insert({
        user_id: authUserId,
        balance: 100.0,
        total_wagered: 0,
        total_winnings: 0,
      })

      console.log(`[v0] Successfully created new user: ${username}`)
      return {
        success: true,
        userId: authUserId,
        username: username,
        isNewUser: true,
      }
    } catch (error) {
      console.error(`[v0] Error creating new user:`, error)
      return {
        success: false,
        userId: authUserId,
        username: username,
        isNewUser: false,
        error: error instanceof Error ? error.message : "Failed to create user",
      }
    }
  }

  /**
   * Validates that a user exists and is properly synced
   */
  static async validateUserSync(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await supabase.from("users").select("id, username").eq("id", userId).single()

      if (error || !user) {
        console.error(`[v0] User validation failed for ID: ${userId}`)
        return false
      }

      console.log(`[v0] User validation successful: ${user.username}`)
      return true
    } catch (error) {
      console.error(`[v0] User validation error:`, error)
      return false
    }
  }

  /**
   * Gets user profile with all related data
   */
  static async getUserProfile(userId: string) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select(`
          *,
          user_wallets (
            balance,
            total_wagered,
            total_winnings
          )
        `)
        .eq("id", userId)
        .single()

      if (error) {
        console.error(`[v0] Failed to get user profile: ${error.message}`)
        return null
      }

      return user
    } catch (error) {
      console.error(`[v0] Error getting user profile:`, error)
      return null
    }
  }
}
