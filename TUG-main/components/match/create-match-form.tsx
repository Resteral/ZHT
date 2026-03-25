"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createMatch } from "@/lib/actions/match"
import { getAllGames, getAllowedModesForGame } from "@/lib/game-config"

import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Trophy, Swords, DollarSign, Users, ChevronRight, Info } from "lucide-react"

export function CreateMatchForm() {
    const [selectedGame, setSelectedGame] = useState("zealot_hockey")
    const games = getAllGames()
    const allowedModes = getAllowedModesForGame(selectedGame)
    const [loading, setLoading] = useState(false)

    return (
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden group">
            <CardHeader className="pb-8 border-b border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                <div className="flex items-center gap-3 mb-2">
                    <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Swords className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight italic text-white">Initiate Arena Challenge</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground font-medium">Configure your match parameters and establish the stakes.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
                <form
                    action={async (formData) => {
                        setLoading(true)
                        try {
                            const result = await createMatch(formData)
                            if (result?.error) {
                                toast.error(result.error)
                            }
                        } catch (error) {
                            toast.error("An unexpected error occurred")
                        } finally {
                            setLoading(false)
                        }
                    }}
                    className="space-y-6"
                >
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Game Selection */}
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Select Combat Arena</Label>
                            <Select name="game" value={selectedGame} onValueChange={setSelectedGame} required>
                                <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-white/10">
                                    {games.map((game) => (
                                        <SelectItem key={game.id} value={game.id} className="focus:bg-primary/10">
                                            <span className="flex items-center gap-3">
                                                <span className="text-xl">{game.icon}</span>
                                                <span className="font-bold text-white uppercase italic">{game.name}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Team Size */}
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Format Specification</Label>
                            <Select name="teamSize" required defaultValue={allowedModes[0]?.teamSize.toString()}>
                                <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-white/10">
                                    {allowedModes.map((mode) => (
                                        <SelectItem key={mode.id} value={mode.teamSize.toString()} className="focus:bg-primary/10">
                                            <div className="flex items-center gap-3">
                                                <Users className="size-4 text-primary" />
                                                <span className="font-bold uppercase italic text-white">{mode.name} <span className="text-muted-foreground not-italic font-medium ml-1">({mode.players} Players)</span></span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Entry Fee */}
                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Escrow Contribution (Entry Fee)</Label>
                        <div className="relative group/input">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black italic">$</div>
                            <Input 
                                name="entryFee" 
                                type="number" 
                                min="1" 
                                step="0.50" 
                                required 
                                className="h-14 pl-8 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 font-black text-lg text-white" 
                                placeholder="10.00" 
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <Badge variant="secondary" className="bg-white/5 border-white/5 text-[10px] uppercase font-black italic text-muted-foreground">+ 10% Platform Rake</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                        <Info className="size-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            By creating this arena challenge, you agree to lock your entry fee in escrow. Payouts are distributed automatically upon result verification.
                        </p>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest italic rounded-2xl shadow-xl shadow-primary/20 group/btn transition-all active:scale-[0.98]"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Deploying Arena...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                Deploy Combat Arena
                                <ChevronRight className="size-5 transition-transform group-hover/btn:translate-x-1" />
                            </div>
                        )}
                    </Button>
                </form>
            </CardContent>
            {/* Background Glow */}
            <div className="absolute -bottom-24 -right-24 size-48 bg-primary/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-primary/20 transition-all duration-500" />
        </Card>
    )
}
