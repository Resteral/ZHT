"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowUpRight, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export function WithdrawalModal() {
    const router = useRouter()
    const [amount, setAmount] = useState<string>("")
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (!isNaN(Number(value)) && Number(value) >= 0) {
            setAmount(value)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/request-withdrawal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: Number(amount) }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to process withdrawal")
            }

            setIsOpen(false)
            toast.success("Withdrawal requested successfully! Funds pending approval.")
            setAmount("")
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/10">
                    <ArrowUpRight className="h-4 w-4" />
                    Withdraw
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Withdraw Funds</DialogTitle>
                    <DialogDescription>Request a payout to your connected Stripe account.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="withdraw-amount">Amount ($)</Label>
                        <Input
                            id="withdraw-amount"
                            type="number"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0.00"
                            min="10"
                            step="0.01"
                            required
                        />
                        <p className="text-xs text-muted-foreground">Minimum withdrawal: $10.00</p>
                    </div>

                    {error && <div className="text-sm text-red-500">{error}</div>}

                    <Button type="submit" disabled={loading || !amount || Number(amount) < 10} className="w-full">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Request Withdrawal"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
