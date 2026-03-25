"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { readyCheckService } from "@/lib/services/ready-check-service"
import { useRouter } from "next/navigation"
import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

export function ReadyCheckModal({ userId }: { userId: string }) {
    const [open, setOpen] = useState(false)
    const [tournamentId, setTournamentId] = useState<string | null>(null)
    const [status, setStatus] = useState<"pending" | "ready">("pending")
    const [timeLeft, setTimeLeft] = useState(30)
    const [acceptedCount, setAcceptedCount] = useState(0)
    const [totalPlayers, setTotalPlayers] = useState(0)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        if (!userId) return

        // Check for any active ready checks
        const checkActiveReadyChecks = async () => {
            const { data: participation, error } = await supabase
                .from("tournament_participants")
                .select("tournament_id, status, tournament:tournaments(id, status, max_participants)")
                .eq("user_id", userId)
                .eq("status", "pending_ready")
                .single() // Assuming functionality for one at a time

            if (participation && (participation.tournament as any)?.status === "ready_check") {
                const tournament = participation.tournament as any
                setTournamentId(participation.tournament_id)
                setTotalPlayers(tournament.max_participants)
                setOpen(true)
                setStatus("pending")
            }
        }

        checkActiveReadyChecks()

        // Subscribe to changes
        const channel = supabase
            .channel(`ready-check-user-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "tournament_participants",
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    if (payload.new.status === 'pending_ready') {
                        checkActiveReadyChecks()
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "tournament_participants",
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    if (payload.new.status === 'pending_ready') {
                        // Re-check just in case
                        checkActiveReadyChecks()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    // Timer effect
    useEffect(() => {
        if (!open) return

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    handleDecline() // Auto decline
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [open])


    // Poll/Subscribe for accepted count
    useEffect(() => {
        if (!open || !tournamentId) return

        const fetchStatus = async () => {
            const { data, error } = await supabase
                .from("tournament_participants")
                .select("status")
                .eq("tournament_id", tournamentId)

            if (data) {
                const ready = data.filter(p => p.status === 'ready').length
                setAcceptedCount(ready)

                // Check if everyone is ready and moved to drafting
                // This is a bit of a race condition with the service, but good for UI feedback
                const { data: tourney } = await supabase.from("tournaments").select("status").eq("id", tournamentId).single()
                if (tourney?.status === 'drafting') {
                    setOpen(false)
                    toast.success("All players ready! Starting draft...")
                    router.push(`/draft/room/${tournamentId}`)
                }
            }
        }

        fetchStatus()
        const interval = setInterval(fetchStatus, 2000)

        return () => clearInterval(interval)
    }, [open, tournamentId])


    const handleAccept = async () => {
        if (!tournamentId) return

        try {
            await readyCheckService.markUserReady(tournamentId, userId)
            setStatus("ready")
            toast.success("You are ready!")
        } catch (error) {
            toast.error("Failed to accept match")
            console.error(error)
        }
    }

    const handleDecline = async () => {
        setOpen(false)
        if (!tournamentId) return
        try {
            const supabase = createClient()
            // Remove from tournament participants
            await supabase
                .from("tournament_participants")
                .delete()
                .eq("tournament_id", tournamentId)
                .eq("user_id", userId)

            // Refund entry fee via leave queue RPC
            // (The tournament was created from the queue so we should refund the fee)
            await supabase.rpc('leave_pay_to_play_queue', {
                p_user_id: userId,
                p_entry_fee: 0 // actual fee read from stored entry in DB
            })

            toast.info("Match declined. Entry fee refunded.")
        } catch (err) {
            console.error("[v0] Error during decline:", err)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <AlertTriangle className="h-6 w-6 text-yellow-500" />
                        Match Found!
                    </DialogTitle>
                    <DialogDescription>
                        A strategic arena match has been staged. Are you prepared to compete?
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    <div className="text-4xl font-mono font-bold">{timeLeft}s</div>

                    <div className="w-full space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Players Ready</span>
                            <span>{acceptedCount} / {totalPlayers}</span>
                        </div>
                        <Progress value={(acceptedCount / totalPlayers) * 100} className="h-4" />
                    </div>

                    {status === "ready" && (
                        <div className="flex items-center gap-2 text-green-500 font-medium">
                            <CheckCircle className="h-5 w-5" />
                            Waiting for other players...
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    {status === "pending" ? (
                        <>
                            <Button variant="destructive" onClick={handleDecline} className="flex-1">
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                            </Button>
                            <Button onClick={handleAccept} className="flex-1 bg-green-600 hover:bg-green-700">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept Match
                            </Button>
                        </>
                    ) : (
                        <Button variant="secondary" className="w-full" disabled>
                            Match Accepted
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
