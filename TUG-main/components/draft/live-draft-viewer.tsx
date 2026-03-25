"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye, Users, Clock, Trophy, Play } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface LiveDraft {
  id: string
  name: string
  match_type: string
  status: string
  participants: number
  max_participants: number
  current_picker?: string
  time_remaining?: number
  created_at: string
}

interface DraftPick {
  id: string
  player_name: string
  picker_name: string
  pick_number: number
  timestamp: string
}

export function LiveDraftViewer() {
  const [liveDrafts, setLiveDrafts] = useState<LiveDraft[]>([])
  const [selectedDraft, setSelectedDraft] = useState<LiveDraft | null>(null)
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadLiveDrafts()
    const interval = setInterval(loadLiveDrafts, 3000) // Update every 3 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedDraft) {
      loadDraftPicks(selectedDraft.id)
      const interval = setInterval(() => loadDraftPicks(selectedDraft.id), 2000)
      return () => clearInterval(interval)
    }
  }, [selectedDraft])

  const loadLiveDrafts = async () => {
    try {
      const { data: matches, error } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          match_type,
          status,
          max_participants,
          created_at,
          match_participants (
            user_id,
            users (
              username
            )
          )
        `)
        .in("status", ["drafting", "active"])
        .order("created_at", { ascending: false })

      if (error) throw error

      const drafts: LiveDraft[] =
        matches?.map((match) => ({
          id: match.id,
          name: match.name || `${match.match_type?.toUpperCase()} Draft`,
          match_type: match.match_type || "draft",
          status: match.status,
          participants: match.match_participants?.length || 0,
          max_participants: match.max_participants || 8,
          created_at: match.created_at,
        })) || []

      setLiveDrafts(drafts)
    } catch (error) {
      console.error("[v0] Error loading live drafts:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadDraftPicks = async (draftId: string) => {
    try {
      const { data: draftPicks, error } = await supabase
        .from("draft_picks")
        .select(`
          id,
          pick_number,
          created_at,
          users!draft_picks_player_id_fkey(username),
          draft_captains!draft_picks_captain_id_fkey(
            users!draft_captains_user_id_fkey(username)
          )
        `)
        .eq("match_id", draftId)
        .order("pick_number", { ascending: false })
        .limit(10)

      if (error) throw error

      const formattedPicks: DraftPick[] =
        draftPicks?.map((pick) => ({
          id: pick.id,
          player_name: pick.users?.username || "Unknown Player",
          picker_name: pick.draft_captains?.users?.username || "Unknown Captain",
          pick_number: pick.pick_number,
          timestamp: pick.created_at,
        })) || []

      setDraftPicks(formattedPicks)
    } catch (error) {
      console.error("[v0] Error loading draft picks:", error)
      setDraftPicks([]) // Set empty array instead of mock data
    }
  }

  const joinDraft = (draft: LiveDraft) => {
    if (draft.status === "drafting") {
      router.push(`/draft/room/${draft.id}`)
    } else {
      router.push(`/leagues/lobby/${draft.id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading live drafts...</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Live Drafts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Drafts ({liveDrafts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {liveDrafts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No live drafts at the moment</p>
                  <p className="text-sm">Check back soon!</p>
                </div>
              ) : (
                liveDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                      selectedDraft?.id === draft.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedDraft(draft)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{draft.name}</h4>
                      <Badge variant={draft.status === "drafting" ? "default" : "secondary"}>
                        {draft.status === "drafting" ? "Drafting" : "Active"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {draft.participants}/{draft.max_participants} players
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {new Date(draft.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          joinDraft(draft)
                        }}
                        className="w-full"
                      >
                        {draft.status === "drafting" ? "Watch Draft" : "Join Lobby"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Draft Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {selectedDraft ? "Draft Activity" : "Select a Draft"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDraft ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">{selectedDraft.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Format:</span>
                    <div className="font-medium">{selectedDraft.match_type.toUpperCase()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Players:</span>
                    <div className="font-medium">
                      {selectedDraft.participants}/{selectedDraft.max_participants}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Recent Picks</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {draftPicks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p>No picks yet</p>
                        <p className="text-sm">Draft starting soon...</p>
                      </div>
                    ) : (
                      draftPicks.map((pick) => (
                        <div key={pick.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="flex-shrink-0">
                            <Badge variant="outline">#{pick.pick_number}</Badge>
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{pick.player_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{pick.player_name}</div>
                            <div className="text-sm text-muted-foreground">Picked by {pick.picker_name}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(pick.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <Button onClick={() => joinDraft(selectedDraft)} className="w-full" size="lg">
                {selectedDraft.status === "drafting" ? "Watch Live Draft" : "Join This Draft"}
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a live draft to watch the action</p>
              <p className="text-sm">See picks happen in real-time!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
