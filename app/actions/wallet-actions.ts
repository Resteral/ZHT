"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { serverWalletService } from "@/lib/services/server-wallet-service"

import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2023-10-16" as any,
})

export async function createDepositPaymentIntent(amount: number) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    if (!amount || amount < 5) {
        throw new Error("Invalid amount. Minimum deposit is $5.00.")
    }

    try {
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: "usd",
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: user.id,
            },
        })

        return { clientSecret: paymentIntent.client_secret }
    } catch (error: any) {
        console.error("Stripe error:", error)
        throw new Error(error.message || "Failed to create payment intent")
    }
}

export async function requestWithdrawal(amount: number) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    if (!amount || amount < 10) {
        throw new Error("Invalid amount. Minimum withdrawal is $10.00.")
    }

    try {
        const success = await serverWalletService.withdrawFunds(user.id, amount)

        if (!success) {
            throw new Error("Withdrawal failed. Insufficient funds or system error.")
        }

        console.log(`[Withdrawal] Request for $${amount} received from ${user.id}.`)
        revalidatePath("/profile") // Assuming profile shows balance/transactions
        return { success: true, message: "Withdrawal requested successfully" }
    } catch (error: any) {
        console.error("Withdrawal error:", error)
        throw new Error(error.message || "Failed to process withdrawal")
    }
}
