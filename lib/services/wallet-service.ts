import { createClient } from "@/lib/supabase/client"

export const walletService = {
    /**
     * Get a user's wallet balance
     */
    async getBalance(userId: string): Promise<number> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from("user_wallets")
            .select("balance")
            .eq("user_id", userId)
            .single()

        if (error) {
            console.error("Error fetching balance:", error)
            return 0
        }

        return data?.balance || 0
    },

    async getTotalWinnings(userId: string): Promise<number> {
        const supabase = createClient()
        const { data } = await supabase
            .from("user_wallets")
            .select("total_winnings")
            .eq("user_id", userId)
            .single()
        return data?.total_winnings || 0
    }
}
