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

    /**
     * Deduct entry fee from user's wallet
     * Returns true if successful, false if insufficient funds or error
     */
    async deductEntryFee(userId: string, amount: number, description: string): Promise<boolean> {
        if (amount <= 0) return true

        const supabase = createClient()

        // 1. Check balance first
        const balance = await this.getBalance(userId)
        if (balance < amount) {
            return false
        }

        // 2. Perform deduction (RPC or direct update if simple)
        // Using direct update for now, but in production should use a transaction/RPC
        const { error } = await supabase.rpc("deduct_balance", {
            p_user_id: userId,
            p_amount: amount,
            p_description: description
        })

        if (error) {
            console.error("Error deducting fee:", error)
            // Fallback to manual update if RPC doesn't exist yet (dev env)
            const { error: updateError } = await supabase
                .from("user_wallets")
                .update({ balance: balance - amount })
                .eq("user_id", userId)

            if (updateError) {
                console.error("Fallback deduction failed:", updateError)
                return false
            }

            // Record transaction
            await supabase.from("transactions").insert({
                user_id: userId,
                amount: -amount,
                type: "entry_fee",
                description: description,
                status: "completed",
                created_at: new Date().toISOString()
            })

            return true
        }

        return true
    },

    /**
     * Award prize to user's wallet
     */
    async awardPrize(userId: string, amount: number, description: string): Promise<boolean> {
        if (amount <= 0) return true

        const supabase = createClient()

        const { error } = await supabase.rpc("add_balance", {
            p_user_id: userId,
            p_amount: amount,
            p_description: description
        })

        if (error) {
            console.error("Error awarding prize:", error)
            // Fallback
            const balance = await this.getBalance(userId)
            const { error: updateError } = await supabase
                .from("user_wallets")
                .update({
                    balance: balance + amount,
                    total_winnings: (await this.getTotalWinnings(userId)) + amount
                })
                .eq("user_id", userId)

            if (updateError) return false

            await supabase.from("transactions").insert({
                user_id: userId,
                amount: amount,
                type: "prize",
                description: description,
                status: "completed",
                created_at: new Date().toISOString()
            })

            return true
        }

        return true
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
