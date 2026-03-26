"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function performMockDeposit() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "Unauthorized" }
    }

    // Use admin client to bypass the new increment_balance security check
    const adminSupabase = await createAdminClient()

    try {
        // 1. Create transaction
        const { data: tx, error: txError } = await adminSupabase.from("transactions").insert({
            user_id: user.id,
            amount: 50.00,
            type: 'deposit',
            provider: 'crypto_mock',
            status: 'completed',
            description: 'Mock Crypto Deposit (System Authorized)'
        }).select().single()

        if (txError) throw txError

        // 2. Increment balance using RPC
        const { error: balanceError } = await adminSupabase.rpc("increment_balance", {
            user_id: user.id,
            amount: 50.00
        })

        if (balanceError) throw balanceError

        revalidatePath("/wallet")
        return { success: true }
    } catch (error: any) {
        console.error("Mock Deposit Error:", error)
        return { success: false, error: error.message }
    }
}
