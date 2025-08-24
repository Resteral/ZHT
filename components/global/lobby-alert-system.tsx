"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Trophy, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface LobbyAlert {
  id: string
  name: string
  match_type: string
  max_participants: number
  current_participants: number
  prize_pool: number
  timeUntilStart: number
}

export function LobbyAlertSystem() {
  const [alerts, setAlerts] = useState<LobbyAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const [isDisabled, setIsDisabled] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAndCleanupLobbies = async () => {
      if (isDisabled) {
        console.log("[v0] Lobby checking disabled due to consecutive errors")
        return
      }

      try {
        console.log("[v0] Checking for active lobbies...")

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

        const { data: matches, error } = await supabase
          .from("matches")
          .select(`
            id,
            name,
            match_type,
            max_participants,
            prize_pool,
            status,
            created_at
          `)
          .eq("status", "waiting")
          .limit(10) // Limit results to prevent large queries
          .abortSignal(controller.signal)

        clearTimeout(timeoutId)

        if (error) {
          console.error("[v0] Database error:", error)
          throw error
        }

        setConsecutiveErrors(0)

        if (!matches || matches.length === 0) {
          console.log("[v0] No waiting lobbies found")
          setAlerts([])
          return
        }

        console.log(`[v0] Found ${matches.length} waiting lobbies`)

        const now = new Date()
        const fullLobbies = []
        const staleLobbyIds = []

        for (const match of matches) {
          try {
            const createdAt = new Date(match.created_at)
            const ageInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

            if (ageInMinutes > 5) {
              staleLobbyIds.push(match.id)
              console.log(`[v0] Marking stale lobby for cleanup: ${match.id} (${ageInMinutes.toFixed(1)} minutes old)`)
              continue
            }

            const { data: participants, error: participantError } = await supabase
              .from("match_participants")
              .select("user_id")
              .eq("match_id", match.id)

            if (participantError) {
              console.error("[v0] Error fetching participants for match", match.id, participantError)
              continue
            }

            const participantCount = participants?.length || 0

            if (participantCount >= match.max_participants && !dismissed.has(match.id)) {
              fullLobbies.push({
                id: match.id,
                name: match.name,
                match_type: match.match_type,
                max_participants: match.max_participants,
                current_participants: participantCount,
                prize_pool: match.prize_pool,
                timeUntilStart: 10,
              })
            }
          } catch (participantError) {
            console.error("[v0] Error processing match participants:", participantError)
            continue
          }
        }

        if (staleLobbyIds.length > 0) {
          console.log(`[v0] Cleaning up ${staleLobbyIds.length} stale lobbies`)

          try {
            const { error: participantCleanupError } = await supabase
              .from("match_participants")
              .delete()
              .in("match_id", staleLobbyIds)

            if (participantCleanupError) {
              console.error("[v0] Error cleaning up participants:", participantCleanupError)
            }

            const { error: matchCleanupError } = await supabase.from("matches").delete().in("id", staleLobbyIds)

            if (matchCleanupError) {
              console.error("[v0] Error cleaning up matches:", matchCleanupError)
            } else {
              console.log(`[v0] Successfully cleaned up ${staleLobbyIds.length} stale lobbies`)
            }
          } catch (cleanupError) {
            console.error("[v0] Error during cleanup:", cleanupError)
          }
        }

        setAlerts(fullLobbies)

        for (const lobby of fullLobbies) {
          if (lobby.current_participants >= lobby.max_participants) {
            setTimeout(() => {
              autoStartLobby(lobby.id, lobby.name)
            }, 10000)
          }
        }
      } catch (error) {
        console.error("[v0] Error checking lobbies:", error)

        setConsecutiveErrors((prev) => {
          const newCount = prev + 1
          if (newCount >= 3) {
            console.log("[v0] Too many consecutive errors, disabling lobby checking for 5 minutes")
            setIsDisabled(true)
            // Re-enable after 5 minutes
            setTimeout(
              () => {
                setIsDisabled(false)
                setConsecutiveErrors(0)
                console.log("[v0] Re-enabling lobby checking")
              },
              5 * 60 * 1000,
            )
          }
          return newCount
        })
      }
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    checkAndCleanupLobbies()
    intervalRef.current = setInterval(checkAndCleanupLobbies, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [dismissed, isDisabled])

  const autoStartLobby = async (lobbyId: string, lobbyName: string) => {
    try {
      console.log("[v0] Auto-starting lobby:", lobbyId)

      const { error } = await supabase
        .from("matches")
        .update({
          status: "active",
          start_date: new Date().toISOString(),
        })
        .eq("id", lobbyId)

      if (error) throw error

      toast.success(`🎮 ${lobbyName} has started! All players have been notified.`, {
        duration: 5000,
        action: {
          label: "View Match",
          onClick: () => router.push(`/leagues/match/${lobbyId}`),
        },
      })

      setAlerts((prev) => prev.filter((alert) => alert.id !== lobbyId))
    } catch (error) {
      console.error("[v0] Error auto-starting lobby:", error)
      toast.error("Failed to start lobby automatically")
    }
  }

  const dismissAlert = (alertId: string) => {
    setDismissed((prev) => new Set([...prev, alertId]))
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  const joinLobby = (alertId: string) => {
    router.push(`/leagues/lobby/${alertId}`)
  }

  if (alerts.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {alerts.map((alert) => (
        <Card key={alert.id} className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-sm">Lobby Full!</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => dismissAlert(alert.id)} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{alert.name}</div>

              <div className="flex items-center justify-between text-xs">
                <Badge variant="secondary" className="text-xs">
                  {alert.match_type}
                </Badge>
                <div className="flex items-center gap-1 text-green-600">
                  <Trophy className="h-3 w-3" />${alert.prize_pool}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Starting in 10 seconds...</span>
              </div>

              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => joinLobby(alert.id)} className="flex-1 text-xs h-7">
                  Join Now
                </Button>
                <Button variant="outline" size="sm" onClick={() => dismissAlert(alert.id)} className="text-xs h-7">
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
