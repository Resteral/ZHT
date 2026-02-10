import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { amount } = await req.json()

        if (!amount || amount < 10) {
            return NextResponse.json({ error: "Invalid amount. Minimum withdrawal is $10.00." }, { status: 400 })
        }

        // In a real application, this would:
        // 1. Check user balance in Supabase
        // 2. Deduct funds from user balance
        // 3. Trigger a Payout via Stripe Connect or log a withdrawal request for manual processing

        // For this implementation, we'll simulate a successful request
        console.log(`[Withdrawal] Request for $${amount} received.`)

        return NextResponse.json({
            success: true,
            message: "Withdrawal requested successfully",
        })
    } catch (error: any) {
        console.error("Withdrawal error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
