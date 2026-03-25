"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Users, Clock, ArrowRight, Crown, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface ActiveDraft {
  id: string
  type: "lobby" | "draft"
  name: string
  status: string
  participants: number
  max_participants: number
  url: string
  updated_at: string
  isMyTurn?: boolean
  currentPicker?: string
}

export function ActiveDraftTracker() {
  const [activeDrafts, setActiveDrafts] = useState<ActiveDraft[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadActiveDrafts()
    const interval = setInterval(loadActiveDrafts, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadActiveDrafts = async () => {
    try {
      const { data: user, error: userError } = await supabase.auth.getUser()
      if (userError || !user.user) return

      const { data: lobbies, error: lobbyError } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          match_type,
          status,
          max_participants,
          updated_at,
          match_participants!inner (
            user_id
          )
        `)
        .eq("match_participants.user_id", user.user.id)
        .in("status", ["waiting", "active", "drafting"])
        .neq("status", "completed")
        .order("updated_at", { ascending: false })

      if (lobbyError) throw lobbyError

      const activeDrafts: ActiveDraft[] = []

      // Add lobbies
      lobbies?.forEach((lobby) => {
        if (!dismissed.includes(lobby.id)) {
          activeDrafts.push({
            id: lobby.id,
            type: lobby.status === "drafting" ? "draft" : "lobby",
            name: lobby.name || `${lobby.match_type?.toUpperCase()} Lobby`,
            status: lobby.status,
            participants: lobby.match_participants?.length || 0,
            max_participants: lobby.max_participants || 8,
            url: getUrlForLobby(lobby),
            updated_at: lobby.updated_at,
          })
        }
      })

      setActiveDrafts(activeDrafts)
      setIsVisible(activeDrafts.length > 0)
    } catch (error) {
      console.error("Error loading active drafts:", error)
    }
  }

  const getUrlForLobby = (lobby: any) => {
    if (lobby.status === "drafting") {
      return `/draft/room/${lobby.id}`
    }
    return `/leagues/lobby/${lobby.id}`
  }

  const dismissDraft = (draftId: string) => {
    setDismissed((prev) => [...prev, draftId])
    setActiveDrafts((prev) => prev.filter((draft) => draft.id !== draftId))
  }

  const navigateToDraft = (draft: ActiveDraft) => {
    router.push(draft.url)
  }

  if (!isVisible || activeDrafts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm space-y-2">
      {activeDrafts.map((draft) => (
        <Card
          key={draft.id}
          className={`bg-background/95 backdrop-blur-sm shadow-lg transition-all duration-300 ${
            draft.isMyTurn ? "border-yellow-500 bg-yellow-500/10 animate-pulse" : "border-primary/20"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{draft.name}</h4>
                  {draft.isMyTurn && <Target className="h-4 w-4 text-yellow-500 animate-bounce" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={draft.status === "drafting" ? "default" : "secondary"}
                    className={`text-xs ${draft.isMyTurn ? "bg-yellow-500 text-black" : ""}`}
                  >
                    {draft.isMyTurn ? "YOUR TURN" : draft.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {draft.participants}/{draft.max_participants}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dismissDraft(draft.id)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {draft.type === "lobby"
                  ? "In Lobby"
                  : draft.isMyTurn
                    ? "Your Turn to Pick"
                    : `${draft.currentPicker} picking`}
              </div>
              <Button
                size="sm"
                onClick={() => navigateToDraft(draft)}
                className={`h-7 text-xs flex items-center gap-1 ${
                  draft.isMyTurn ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""
                }`}
              >
                {draft.status === "drafting" ? (draft.isMyTurn ? "Make Pick" : "Watch Draft") : "Return to Lobby"}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {draft.status === "waiting" && draft.participants === draft.max_participants && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded px-2 py-1">
                Lobby full! Starting soon...
              </div>
            )}

            {draft.isMyTurn && (
              <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 rounded px-2 py-1 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                It's your turn to pick a player!
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
