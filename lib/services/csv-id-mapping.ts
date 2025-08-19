import { createClient } from "@/lib/supabase/client"

// CSV ID to User mapping service
export class CSVIdMappingService {
  private supabase = createClient()
  private userCache = new Map<string, { id: string; username: string; elo_rating: number }>()

  private specificMappings = new Map<string, string>([
    ["1839314", "adonis"],
    ["6156823", "rizzy"],
    ["6820063", "DavidPameten"],
    ["10300134", "Redg"],
    ["4122701", "Adonis"],
    ["1520631", "Pirhana"],
    ["6347815", "Rush"],
    ["4964615", "Cerv"],
    ["4096795", "EzHockey"],
    ["6218367", "Resteral"],
    // Add more mappings as needed
  ])

  // Get user data by CSV ID (now queries database by account_id and specific mappings)
  async getUserByCSVId(csvId: string): Promise<{ id: string; username: string; elo_rating: number } | null> {
    // Check cache first
    if (this.userCache.has(csvId)) {
      return this.userCache.get(csvId)!
    }

    let query = this.supabase.from("users").select("id, username, elo_rating, account_id")

    // Try specific mapping first
    const mappedUsername = this.specificMappings.get(csvId)
    if (mappedUsername) {
      query = query.eq("username", mappedUsername)
    } else {
      // Try account_id lookup
      query = query.eq("account_id", csvId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error(`[v0] Database error for CSV ID ${csvId}:`, error)
      return null
    }

    if (!data) {
      console.log(`[v0] No user found for CSV ID ${csvId}`)
      return null
    }

    // Cache the result
    this.userCache.set(csvId, data)
    return data
  }

  async getUsersBatchByCSVIds(
    csvIds: string[],
  ): Promise<Map<string, { id: string; username: string; elo_rating: number }>> {
    const results = new Map<string, { id: string; username: string; elo_rating: number }>()
    const uncachedIds = csvIds.filter((id) => !this.userCache.has(id))

    if (uncachedIds.length > 0) {
      const mappedUsernames = uncachedIds.map((id) => this.specificMappings.get(id)).filter(Boolean) as string[]

      const accountIds = uncachedIds.filter((id) => !this.specificMappings.has(id))

      // Fetch by usernames (for specific mappings)
      if (mappedUsernames.length > 0) {
        const { data: usernameData, error: usernameError } = await this.supabase
          .from("users")
          .select("id, username, elo_rating, account_id")
          .in("username", mappedUsernames)

        if (!usernameError && usernameData) {
          usernameData.forEach((user) => {
            // Find the CSV ID that maps to this username
            const csvId = uncachedIds.find((id) => this.specificMappings.get(id) === user.username)
            if (csvId) {
              this.userCache.set(csvId, user)
            }
          })
        }
      }

      // Fetch by account_ids
      if (accountIds.length > 0) {
        const { data: accountData, error: accountError } = await this.supabase
          .from("users")
          .select("id, username, elo_rating, account_id")
          .in("account_id", accountIds)

        if (!accountError && accountData) {
          accountData.forEach((user) => {
            this.userCache.set(user.account_id, user)
          })
        }
      }
    }

    // Return all requested users (cached + newly fetched)
    csvIds.forEach((csvId) => {
      const user = this.userCache.get(csvId)
      if (user) {
        results.set(csvId, user)
      }
    })

    return results
  }

  async mapCSVIdToUserId(csvId: string): Promise<string | null> {
    const user = await this.getUserByCSVId(csvId)
    return user?.id || null
  }

  async getUserData(userId: string): Promise<{ id: string; username: string; elo_rating: number } | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("id, username, elo_rating")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching user data:", error)
      return null
    }

    return data
  }
}

export const csvIdMappingService = new CSVIdMappingService()
export const csvIdMapping = csvIdMappingService
