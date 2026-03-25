
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: Request) {
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
            apiVersion: "2023-10-16" as any, // Cast to any to avoid type errors with different stripe versions
        })
        const { amount } = await request.json()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!amount || amount < 5) {
            return NextResponse.json({ error: "Minimum deposit is $5" }, { status: 400 })
        }

        // Create a pending transaction record
        const { data: transaction, error: txError } = await supabase
            .from("transactions")
            .insert({
                user_id: user.id,
                amount: amount,
                type: 'deposit',
                provider: 'stripe',
                status: 'pending',
            })
            .select()
            .single()

        if (txError) {
            console.error("Transaction Creation Error:", txError)
            return NextResponse.json({ error: "Failed to create transaction record" }, { status: 500 })
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Platform Deposit",
                        },
                        unit_amount: Math.round(amount * 100), // Stripe expects cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${request.headers.get("origin")}/wallet?success=true`,
            cancel_url: `${request.headers.get("origin")}/wallet?canceled=true`,
            metadata: {
                userId: user.id,
                transactionId: transaction.id,
            },
            client_reference_id: transaction.id,
        })

        // Update transaction with stripe session ID
        await supabase.from("transactions").update({ external_id: session.id }).eq("id", transaction.id)

        return NextResponse.json({ sessionId: session.id, url: session.url })
    } catch (err: any) {
        console.error("Stripe Checkout Error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
