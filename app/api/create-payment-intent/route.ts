import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2023-10-16" as any, // Cast to any to avoid strict version check errors with rapid updates
})

export async function POST(req: Request) {
    try {
        const { amount } = await req.json()

        if (!amount || amount < 500) { // Minimum $5.00
            return NextResponse.json({ error: "Invalid amount. Minimum deposit is $5.00." }, { status: 400 })
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            automatic_payment_methods: {
                enabled: true,
            },
        })

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        })
    } catch (error: any) {
        console.error("Stripe error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
