
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: Request) {
    const body = await request.text()
    const sig = request.headers.get("stripe-signature") as string

    let event: Stripe.Event
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
            apiVersion: "2023-10-16" as any,
        })
        if (!endpointSecret) throw new Error("Missing Webhook Secret")
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`)
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    const supabase = await createClient()

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session
        const transactionId = session.metadata?.transactionId
        const userId = session.metadata?.userId

        if (transactionId && userId) {
            // 1. Mark transaction as completed
            const { error: txError } = await supabase
                .from("transactions")
                .update({ status: "completed", external_id: session.payment_intent as string })
                .eq("id", transactionId)

            if (txError) {
                console.error("Error updating transaction:", txError)
                return NextResponse.json({ error: "Transaction update failed" }, { status: 500 })
            }

            // 2. Increment user balance atomically
            const { error: balanceError } = await supabase.rpc("increment_balance", {
                user_id: userId,
                amount: session.amount_total! / 100, // Convert cents to dollars
            })

            if (balanceError) {
                console.error("Error incrementing balance:", balanceError)
                // Note: Transaction is marked completed but balance failed. 
                // In prod, this needs manual reconciliation or a retry mechanism.
                return NextResponse.json({ error: "Balance update failed" }, { status: 500 })
            }
        }
    }

    return NextResponse.json({ received: true })
}
