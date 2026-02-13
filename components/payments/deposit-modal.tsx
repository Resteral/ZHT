"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { DollarSign, Loader2 } from "lucide-react"

// Initialize Stripe with public key from env
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder")

function CheckoutForm({ amount, onSuccess, disabled }: { amount: number; onSuccess: () => void; disabled?: boolean }) {
    const stripe = useStripe()
    const elements = useElements()
    const [error, setError] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (!stripe || !elements || disabled) {
            return
        }

        setProcessing(true)
        setError(null)

        // 1. Create PaymentIntent on the server
        const response = await fetch("/api/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: amount * 100 }), // Amount in cents
        })

        const { clientSecret, error: backendError } = await response.json()

        if (backendError) {
            setError(backendError)
            setProcessing(false)
            return
        }

        // 2. Confirm Card Payment
        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardElement)!,
            },
        })

        if (result.error) {
            setError(result.error.message || "Payment failed")
        } else {
            if (result.paymentIntent.status === "succeeded") {
                onSuccess()
            }
        }
        setProcessing(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 border rounded-md">
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: "16px",
                                color: "#424770",
                                "::placeholder": {
                                    color: "#aab7c4",
                                },
                            },
                            invalid: {
                                color: "#9e2146",
                            },
                        },
                    }}
                />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button type="submit" disabled={!stripe || processing || disabled} className="w-full">
                {processing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    `Pay $${amount.toFixed(2)}`
                )}
            </Button>
        </form>
    )
}

export function DepositModal() {
    const router = useRouter()
    const [amount, setAmount] = useState<string>("25")
    const [isOpen, setIsOpen] = useState(false)
    const [isConfirmed, setIsConfirmed] = useState(false)

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (!isNaN(Number(value)) && Number(value) >= 0) {
            setAmount(value)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="default" className="gap-2 bg-green-600 hover:bg-green-700">
                    <DollarSign className="h-4 w-4" />
                    Deposit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Deposit Funds</DialogTitle>
                    <DialogDescription>Add funds to your contest wallet securely via Stripe.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount ($)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={handleAmountChange}
                                className="pl-8"
                                min="5"
                                step="5"
                            />
                        </div>
                        <div className="flex gap-2 mt-2">
                            {["10", "25", "50", "100"].map((val) => (
                                <Button
                                    key={val}
                                    type="button"
                                    variant={amount === val ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setAmount(val)}
                                    className="flex-1"
                                >
                                    ${val}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-start space-x-2 py-4">
                        <input
                            type="checkbox"
                            id="terms"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                            checked={isConfirmed}
                            onChange={(e) => setIsConfirmed(e.target.checked)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                I confirm I am 18+ and not in a restricted jurisdiction.
                            </label>
                            <p className="text-xs text-muted-foreground">
                                By depositing, you agree to our <a href="/terms" className="underline hover:text-foreground" target="_blank">Terms of Service</a>.
                            </p>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <Label className="mb-2 block">Card Details</Label>
                        <Elements stripe={stripePromise}>
                            <CheckoutForm
                                amount={Number(amount) || 0}
                                onSuccess={() => {
                                    setIsOpen(false)
                                    toast.success(`Successfully deposited $${amount}!`)
                                    router.refresh()
                                }}
                                disabled={!isConfirmed}
                            />
                        </Elements>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
