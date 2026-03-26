
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ChevronLeft, Wallet, CreditCard, Bitcoin, History, ArrowDownToLine, ArrowUpFromLine, Info, Lock as LockIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

import { performMockDeposit } from "@/lib/actions/wallet"

export default function WalletPage() {
    const [balance, setBalance] = useState(0)
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [depositAmount, setDepositAmount] = useState("10.00")
    const supabase = createClient()
    const router = useRouter()

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push("/auth/login")
            return
        }

        const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single()
        if (profile) setBalance(profile.balance || 0)

        const { data: txs } = await supabase.from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
        setTransactions(txs || [])
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [router])

    const [isDepositing, setIsDepositing] = useState(false)

    const handleStripeDeposit = async () => {
        const amount = parseFloat(depositAmount)
        if (isNaN(amount) || amount < 5) {
            toast.error("Minimum deposit is $5.00")
            return
        }

        setIsDepositing(true)
        try {
            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            })

            const data = await response.json()
            if (data.url) {
                window.location.assign(data.url)
            } else {
                throw new Error(data.error || "Failed to create checkout session")
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred during checkout")
            setIsDepositing(false)
        }
    }

    const [isMocking, setIsMocking] = useState(false)

    const handleMockCryptoDeposit = async () => {
        setIsMocking(true)
        const toastId = toast.loading("Simulating blockchain deposit...")
        
        try {
            const result = await performMockDeposit()
            if (result.success) {
                toast.success("Successfully deposited $50.00 (Mock)", { id: toastId })
                await loadData()
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            toast.error(error.message || "Mock deposit failed", { id: toastId })
        } finally {
            setIsMocking(false)
        }
    }

    if (loading) return (
        <div className="container mx-auto p-4 max-w-4xl flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground animate-pulse">Accessing secure vault...</p>
            </div>
        </div>
    )

    return (
        <div className="container mx-auto p-4 max-w-5xl space-y-8 pb-20">
            <header className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Financial Hub</h1>
                    <p className="text-muted-foreground text-sm">Manage your platform balance and wagering history.</p>
                </div>
            </header>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Balance & Quick Actions */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/30 via-primary/5 to-transparent border border-primary/20 p-8 md:p-12 shadow-2xl">
                        <div className="absolute top-0 right-0 p-4 opacity-10 select-none">
                            <Wallet className="size-48 -mr-12 -mt-12 text-primary" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div>
                                <p className="text-sm font-medium text-primary/70 mb-2 flex items-center gap-2">
                                    <span className="size-2 bg-green-500 rounded-full animate-pulse" />
                                    Available Balance
                                </p>
                                <h2 className="text-5xl md:text-6xl font-black tracking-tight text-white font-mono">
                                    ${balance.toFixed(2)}
                                </h2>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20">
                                    <ArrowDownToLine className="mr-2 size-5" />
                                    Deposit
                                </Button>
                                <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5 font-bold px-8">
                                    <ArrowUpFromLine className="mr-2 size-5" />
                                    Withdraw
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="deposit" className="w-full">
                        <TabsList className="bg-black/40 border border-white/5 p-1 h-12 w-full justify-start gap-2">
                            <TabsTrigger value="deposit" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-6">
                                <ArrowDownToLine className="size-4 mr-2" />
                                Deposit Funds
                            </TabsTrigger>
                            <TabsTrigger value="withdraw" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-6">
                                <ArrowUpFromLine className="size-4 mr-2" />
                                Withdraw
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="deposit" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card className="bg-black/40 border-primary/20">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CreditCard className="size-5 text-primary" />
                                            Stripe / Card
                                        </CardTitle>
                                        <CardDescription>Instant deposit via credit/debit card.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Amount (USD)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                                <Input 
                                                    type="number" 
                                                    value={depositAmount} 
                                                    onChange={(e) => setDepositAmount(e.target.value)}
                                                    className="pl-7 bg-primary/5 border-primary/10 focus:border-primary/30" 
                                                />
                                            </div>
                                        </div>
                                        <Button className="w-full" onClick={handleStripeDeposit} disabled={isDepositing}>
                                            {isDepositing ? "Redirecting..." : "Continue to Checkout"}
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="bg-black/40 border-orange-500/20">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Bitcoin className="size-5 text-orange-500" />
                                            Crypto Deposit
                                        </CardTitle>
                                        <CardDescription>Deposit BTC, ETH, or LTC.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="p-4 bg-orange-500/5 rounded-lg border border-orange-500/10 space-y-3">
                                            <div className="flex items-center justify-between text-xs text-orange-200/70">
                                                <span>BTC (Network: Bitcoin)</span>
                                                <Button variant="link" className="h-auto p-0 text-orange-400">Copy Address</Button>
                                            </div>
                                            <p className="font-mono text-[10px] break-all text-orange-100 bg-black/40 p-2 rounded">
                                                bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
                                            </p>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            className="w-full border-orange-500/20 hover:bg-orange-500/10 text-orange-500"
                                            onClick={handleMockCryptoDeposit}
                                            disabled={isMocking}
                                        >
                                            {isMocking ? "Detecting..." : "Simulate Payment (Test)"}
                                        </Button>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Info className="size-3" />
                                            Funds will be credited after 2 network confirmations.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="withdraw" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card className="bg-black/40 border-white/10">
                                <CardHeader>
                                    <CardTitle>Request Withdrawal</CardTitle>
                                    <CardDescription>Withdraw your winnings to your preferred method.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                    <div className="size-16 bg-white/5 rounded-full flex items-center justify-center">
                                        <LockIcon className="size-8 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Identity Verification Required</p>
                                        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto mt-1">
                                            To comply with regulations, please complete KYC in settings before your first withdrawal.
                                        </p>
                                    </div>
                                    <Button variant="outline" onClick={() => router.push('/settings')}>Go to Settings</Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Transaction History Sidebar */}
                <div className="space-y-6">
                    <Card className="bg-black/40 border-white/5 lg:sticky lg:top-8 shadow-xl">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <History className="size-5 text-primary" />
                                Ledger
                            </CardTitle>
                            <CardDescription>Recent financial activity</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {transactions.length === 0 && (
                                    <div className="p-8 text-center">
                                        <p className="text-sm text-muted-foreground">No transaction history found.</p>
                                    </div>
                                )}
                                {transactions.map(tx => (
                                    <div key={tx.id} className="p-4 hover:bg-white/5 transition-colors group">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                                    {tx.type === 'arena_entry' ? 'Arena Entry' :
                                                     tx.type === 'arena_prize' ? 'Arena Prize' :
                                                     tx.type === 'deposit' ? 'Deposit' :
                                                     tx.type === 'refund' ? 'Refund' :
                                                     tx.type.split('_').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                                                    {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <div className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                                            </div>
                                        </div>
                                        {tx.description && (
                                            <div className="text-[11px] text-muted-foreground italic line-clamp-1 mt-1">
                                                {tx.description}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
