"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, CreditCard, Bitcoin, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createDepositIntent } from "@/lib/actions/payment"

export function DepositForm({ onDepositSuccess }: { onDepositSuccess: () => void }) {
    const [amount, setAmount] = useState("25")
    const [isProcessing, setIsProcessing] = useState(false)

    const handleStripeDeposit = async () => {
        const value = parseFloat(amount)
        if (isNaN(value) || value < 5) {
            toast.error("Minimum deposit is $5.00")
            return
        }

        setIsProcessing(true)
        try {
            // In a real app, this would redirect to Stripe Checkout
            // For now, we mock the success flow as requested in TASK.md
            const result = await createDepositIntent(value, 'stripe')
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success(`Successfully deposited $${value.toFixed(2)} via Stripe`)
                setAmount("25")
                onDepositSuccess()
            }
        } catch (error) {
            toast.error("Failed to process deposit")
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCryptoDeposit = async () => {
        const value = parseFloat(amount)
        if (isNaN(value) || value < 10) {
            toast.error("Minimum crypto deposit is $10.00")
            return
        }

        setIsProcessing(true)
        try {
            // Mocking Crypto Deposit
            const result = await createDepositIntent(value, 'crypto')
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success(`Mock Crypto transfer for $${value.toFixed(2)} received`)
                setAmount("25")
                onDepositSuccess()
            }
        } catch (error) {
            toast.error("Failed to process transaction")
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <Card className="border-primary/20 bg-black/40">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                    <Wallet className="h-6 w-6 text-primary" />
                    Add Funds
                </CardTitle>
                <CardDescription>Deposit money to your Arena wallet to compete.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Amount (USD)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <Input
                                type="number"
                                min="5"
                                step="5"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-8 bg-gray-900/50 text-lg border-gray-700"
                            />
                        </div>
                        <div className="flex gap-2 mt-2">
                            {[10, 25, 50, 100].map(preset => (
                                <Button
                                    key={preset}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 bg-gray-800/50 border-gray-700 hover:bg-primary/20 hover:text-primary hover:border-primary/50"
                                    onClick={() => setAmount(preset.toString())}
                                >
                                    ${preset}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <Tabs defaultValue="stripe" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-gray-900 mb-4 p-1 rounded-xl">
                            <TabsTrigger value="stripe" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <CreditCard className="w-4 h-4 mr-2" />
                                Credit Card
                            </TabsTrigger>
                            <TabsTrigger value="crypto" className="rounded-lg data-[state=active]:bg-primary xl:data-[state=active]:bg-[#F7931A] data-[state=active]:text-white">
                                <Bitcoin className="w-4 h-4 mr-2" />
                                Crypto
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="stripe">
                            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
                                <p className="text-sm text-gray-400">Secure credit or debit card deposit powered by Stripe.</p>
                                <Button
                                    className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20"
                                    onClick={handleStripeDeposit}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                                    Deposit ${amount || "0"} via Stripe
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="crypto">
                            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
                                <p className="text-sm text-gray-400">Deposit USDC, BTC, or ETH. Funds are credited instantly after 1 network confirmation.</p>
                                <Button
                                    className="w-full h-12 text-lg font-bold bg-[#F7931A] text-white hover:bg-[#F7931A]/90 shadow-lg shadow-[#F7931A]/20"
                                    onClick={handleCryptoDeposit}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Bitcoin className="w-5 h-5 mr-2" />}
                                    Mock Crypto Transfer
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </CardContent>
        </Card>
    )
}
