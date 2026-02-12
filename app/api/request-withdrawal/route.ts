import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { serverWalletService } from "@/lib/services/server-wallet-service"

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { amount } = await req.json()

        if (!amount || amount < 10) {
            return NextResponse.json({ error: "Invalid amount. Minimum withdrawal is $10.00." }, { status: 400 })
        }

        const success = await serverWalletService.withdrawFunds(user.id, amount)

        if (!success) {
            return NextResponse.json(
                { error: "Withdrawal failed. Insufficient funds or system error." },
                { status: 400 }
            )
        }

        console.log(`[Withdrawal] Request for $${amount} received from ${user.id}.`)

        return NextResponse.json({
            success: true,
            message: "Withdrawal requested successfully",
        })
    } catch (error: any) {
        console.error("Withdrawal error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
