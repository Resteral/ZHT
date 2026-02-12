import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { serverWalletService } from "@/lib/services/server-wallet-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2023-10-16" as any,
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
    const body = await req.text()
    const signature = (await headers()).get("stripe-signature")

    let event: Stripe.Event

    try {
        if (!signature || !endpointSecret) {
            console.error("Missing signature or endpoint secret")
            return NextResponse.json({ error: "Webhook Error: Missing signature or secret" }, { status: 400 })
        }
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`)
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const userId = paymentIntent.metadata.userId
        const amount = paymentIntent.amount // Amount in cents

        if (userId && amount) {
            // Convert cents to dollars for our system (assuming our DB uses dollars as float/decimal, or verify if we settled on cents)
            // Existing wallet service seems to just take 'amount'.
            // In deposit-modal, we send amount * 100 to stripe.
            // So we should divide by 100 here if our DB stores dollars.
            // Let's assume DB stores Dollars based on previous "Pay $25.00" UI.
            const amountInDollars = amount / 100

            console.log(`[Stripe Webhook] Crediting $${amountInDollars} to user ${userId}`)

            try {
                const success = await serverWalletService.depositFunds(userId, amountInDollars, paymentIntent.id)
                if (!success) {
                    console.error("Failed to deposit funds")
                    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
                }
            } catch (error) {
                console.error("Error in wallet service during webhook:", error)
                return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
            }
        } else {
            console.warn("[Stripe Webhook] Missing userId or amount in metadata", paymentIntent.metadata)
        }
    }

    return NextResponse.json({ received: true })
}
