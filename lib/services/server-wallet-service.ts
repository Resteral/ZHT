import { createClient } from "@/lib/supabase/server"

export const serverWalletService = {
    /**
     * Get a user's wallet balance (Server Side)
     */
    async getBalance(userId: string): Promise<number> {
        const supabase = await createClient()
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
     * Deduct entry fee from user's wallet (Server Side)
     * Returns true if successful, false if insufficient funds or error
     */
    async deductEntryFee(userId: string, amount: number, description: string): Promise<boolean> {
        if (amount <= 0) return true

        const supabase = await createClient()

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
            p_description: description,
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
                created_at: new Date().toISOString(),
            })

            return true
        }

        return true
    },

    /**
     * Award prize to user's wallet (Server Side)
     */
    async awardPrize(userId: string, amount: number, description: string): Promise<boolean> {
        if (amount <= 0) return true

        const supabase = await createClient()

        const { error } = await supabase.rpc("add_balance", {
            p_user_id: userId,
            p_amount: amount,
            p_description: description,
        })

        if (error) {
            console.error("Error awarding prize:", error)
            // Fallback
            const balance = await this.getBalance(userId)
            const { error: updateError } = await supabase
                .from("user_wallets")
                .update({
                    balance: balance + amount,
                    // total_winnings increment skipped in fallback for simplicity unless we fetch it
                })
                .eq("user_id", userId)

            if (updateError) return false

            await supabase.from("transactions").insert({
                user_id: userId,
                amount: amount,
                type: "prize",
                description: description,
                status: "completed",
                created_at: new Date().toISOString(),
            })

            return true
        }

        return true
    },

    /**
     * Deposit funds to user's wallet (Server Side)
     */
    async depositFunds(userId: string, amount: number, paymentIntentId: string): Promise<boolean> {
        if (amount <= 0) return true

        const supabase = await createClient()

        const { error } = await supabase.rpc("add_balance", {
            p_user_id: userId,
            p_amount: amount,
            p_description: `Deposit via Stripe (${paymentIntentId})`,
        })

        if (error) {
            console.error("Error depositing funds:", error)
            // Fallback
            const balance = await this.getBalance(userId)
            const { error: updateError } = await supabase
                .from("user_wallets")
                .update({
                    balance: balance + amount,
                })
                .eq("user_id", userId)

            if (updateError) {
                console.error("Critical: Failed to deposit funds fallback", updateError)
                return false
            }

            // Log transaction
            await supabase.from("transactions").insert({
                user_id: userId,
                amount: amount,
                type: "deposit",
                description: `Deposit via Stripe (${paymentIntentId})`,
                status: "completed",
                created_at: new Date().toISOString(),
                metadata: { payment_intent_id: paymentIntentId }
            })

            return true
        }

        return true
    },

    /**
     * Request withdrawal from user's wallet (Server Side)
     * Deducts funds immediately and creates a pending withdrawal transaction.
     */
    async withdrawFunds(userId: string, amount: number): Promise<boolean> {
        if (amount <= 0) return false

        const supabase = await createClient()

        // 1. Check balance first
        const balance = await this.getBalance(userId)
        if (balance < amount) {
            return false
        }

        // 2. Perform deduction
        const { error } = await supabase.rpc("deduct_balance", {
            p_user_id: userId,
            p_amount: amount,
            p_description: "Withdrawal Request",
        })

        if (error) {
            console.error("Error processing withdrawal:", error)
            return false
        }

        // 3. Record transaction as 'pending' (or 'withdrawal_pending' if you prefer specific status)
        // We'll use 'pending' to indicate it needs admin action.
        await supabase.from("transactions").insert({
            user_id: userId,
            amount: -amount,
            type: "withdrawal",
            description: "Withdrawal Request",
            status: "pending",
            created_at: new Date().toISOString(),
        })

        return true
    },
}
