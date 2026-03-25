"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Crown, Users, Star, Target, Timer, Shuffle, Zap, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { captainSelectionService } from "@/lib/services/captain-selection-service"
import { toast } from "sonner"

interface EnhancedDraftingSheetProps {
  tournamentId: string
  tournament: any
  userRole: "organizer" | "participant" | "spectator"
  onDraftStart?: () => void
}

export function EnhancedDraftingSheet({
  tournamentId,
  tournament,
  userRole,
  onDraftStart,
}: EnhancedDraftingSheetProps) {
  const [teams, setTeams] = useState<any[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [captains, setCaptains] = useState<any[]>([])
  const [draftState, setDraftState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedCaptainMethod, setSelectedCaptainMethod] = useState<"creator" | "random" | "elo">("elo")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])

  const { user } = useAuth()
  const supabase = createClient()
  const isOwner = user && tournament?.created_by === user.id
  const canManageDraft = userRole === "organizer" || isOwner

  const loadDraftData = async () => {
    try {
      setLoading(true)

      const { data: poolData, error: poolError } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          captain_type,
          team_assignment,
          users (
            username,
            elo_rating
          )
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (poolError) throw poolError

      const allPlayers = (poolData || []).map((entry: any) => ({
        id: entry.user_id,
        username: entry.users?.username || "Unknown Player",
        elo_rating: entry.users?.elo_rating || 1200,
        status: entry.status,
        captain_type: entry.captain_type,
        team_assignment: entry.team_assignment,
      }))

      const currentCaptains = allPlayers.filter((p) => p.captain_type && p.status === "captain")
      const availableForDraft = allPlayers.filter((p) => p.status === "available")

      setCaptains(currentCaptains)
      setAvailablePlayers(availableForDraft.sort((a, b) => b.elo_rating - a.elo_rating))

      const maxTeams = tournament?.player_pool_settings?.max_teams || 2
      const teamsArray = Array.from({ length: maxTeams }, (_, index) => {
        const captain = currentCaptains.find((c) => c.captain_type === (index === 0 ? "high_elo" : "low_elo"))
        return {
          id: `team-${index + 1}`,
          name: `Team ${index + 1}`,
          captain: captain || null,
          players: allPlayers.filter((p) => p.team_assignment === `team-${index + 1}` && p.status === "drafted"),
          color: index === 0 ? "blue" : "red",
        }
      })

      setTeams(teamsArray)
    } catch (error) {
      console.error("[v0] Error loading draft data:", error)
      toast.error("Failed to load draft data")
    } finally {
      setLoading(false)
    }
  }

  const handleCaptainSelection = async (method: "creator" | "random" | "elo") => {
    if (!canManageDraft) return

    setProcessing(true)
    try {
      let result

      switch (method) {
        case "elo":
          result = await captainSelectionService.selectCaptainsAutomatically(tournamentId)
          break
        case "random":
          result = await captainSelectionService.selectCaptainsRandomly(tournamentId)
          break
        case "creator":
          if (selectedPlayers.length !== 2) {
            toast.error("Please select exactly 2 players as captains")
            return
          }
          result = await captainSelectionService.selectCaptainsManually(tournamentId, selectedPlayers)
          break
      }

      if (result.success) {
        toast.success(result.message)
        await loadDraftData()
        setSelectedPlayers([])
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("[v0] Error selecting captains:", error)
      toast.error("Failed to select captains")
    } finally {
      setProcessing(false)
    }
  }

  const handlePlayerSelection = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter((id) => id !== playerId))
    } else if (selectedPlayers.length < 2) {
      setSelectedPlayers([...selectedPlayers, playerId])
    }
  }

  const handleStartDraft = async () => {
    if (!canManageDraft || captains.length < 2) return

    try {
      setProcessing(true)
      const { error } = await supabase.from("tournament_draft_state").upsert({
        tournament_id: tournamentId,
        status: "active",
        current_round: 1,
        current_pick: 1,
        current_team_index: 0,
        time_remaining: 120,
      })

      if (error) throw error

      toast.success("Draft started successfully!")
      onDraftStart?.()
    } catch (error) {
      console.error("[v0] Error starting draft:", error)
      toast.error("Failed to start draft")
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    loadDraftData()

    const subscription = supabase
      .channel(`draft-sheet-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_player_pool",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          loadDraftData()
        },
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }, [tournamentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading drafting sheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Draft Header */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              Tournament Drafting Sheet
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={captains.length >= 2 ? "default" : "secondary"}>
                {captains.length >= 2 ? "Ready to Draft" : "Selecting Captains"}
              </Badge>
              <Button onClick={loadDraftData} variant="outline" size="sm">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Visual draft interface with team captains at the top and player pool below</CardDescription>
        </CardHeader>
      </Card>

      {/* Teams Section - Top */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Team Captains & Rosters
          </CardTitle>
          <CardDescription>
            {captains.length >= 2 ? "Team captains selected - ready for draft" : "Select team captains to begin"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {teams.map((team, index) => (
              <Card
                key={team.id}
                className={`border-2 ${team.color === "blue" ? "border-blue-200 bg-blue-50/50" : "border-red-200 bg-red-50/50"}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className={`text-lg ${team.color === "blue" ? "text-blue-700" : "text-red-700"}`}>
                        {team.name}
                      </CardTitle>
                      {team.captain ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Crown className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{team.captain.username}</span>
                          <Badge variant="outline" className="text-xs">
                            {team.captain.elo_rating} ELO
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No captain selected</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {team.players.length + (team.captain ? 1 : 0)}/
                      {tournament?.player_pool_settings?.players_per_team || 5}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 min-h-[200px]">
                    {/* Captain Slot */}
                    <div
                      className={`p-3 rounded-lg border-2 border-dashed ${team.captain ? "border-yellow-300 bg-yellow-50" : "border-gray-300 bg-gray-50"}`}
                    >
                      {team.captain ? (
                        <div className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-yellow-500" />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-yellow-100 text-yellow-800 font-bold">
                              {team.captain.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{team.captain.username}</p>
                            <p className="text-xs text-muted-foreground">Captain • {team.captain.elo_rating} ELO</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <Crown className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                          <p className="text-sm text-gray-500">Captain Slot</p>
                        </div>
                      )}
                    </div>

                    {/* Team Players */}
                    {team.players.map((player: any) => (
                      <div key={player.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{player.username}</p>
                          <p className="text-xs text-muted-foreground">{player.elo_rating} ELO</p>
                        </div>
                      </div>
                    ))}

                    {/* Empty Slots */}
                    {Array.from({
                      length: Math.max(
                        0,
                        (tournament?.player_pool_settings?.players_per_team || 5) -
                          team.players.length -
                          (team.captain ? 1 : 0),
                      ),
                    }).map((_, idx) => (
                      <div key={idx} className="p-2 border-2 border-dashed border-gray-200 rounded text-center">
                        <p className="text-xs text-gray-400">Empty Slot</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Captain Selection Controls */}
      {canManageDraft && captains.length < 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Captain Selection Methods
            </CardTitle>
            <CardDescription>Choose how to select team captains for this tournament</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCaptainMethod} onValueChange={(value) => setSelectedCaptainMethod(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="elo">Highest ELO</TabsTrigger>
                <TabsTrigger value="creator">Creator Choice</TabsTrigger>
                <TabsTrigger value="random">Random</TabsTrigger>
              </TabsList>

              <TabsContent value="elo" className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Automatic ELO Selection</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Automatically selects the highest and lowest ELO players as captains for balanced teams.
                  </p>
                  <Button
                    onClick={() => handleCaptainSelection("elo")}
                    disabled={processing || availablePlayers.length < 2}
                    className="w-full"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {processing ? "Selecting..." : "Select by ELO"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="creator" className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium mb-2">Manual Selection</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose exactly 2 players from the pool below to be team captains.
                  </p>
                  <Button
                    onClick={() => handleCaptainSelection("creator")}
                    disabled={processing || selectedPlayers.length !== 2}
                    className="w-full"
                    variant="outline"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {processing ? "Selecting..." : `Select ${selectedPlayers.length}/2 Captains`}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="random" className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium mb-2">Random Selection</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Randomly selects 2 players from the pool as captains for unpredictable matchups.
                  </p>
                  <Button
                    onClick={() => handleCaptainSelection("random")}
                    disabled={processing || availablePlayers.length < 2}
                    className="w-full"
                    variant="secondary"
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    {processing ? "Selecting..." : "Random Selection"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Player Pool Section - Bottom */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-purple-500" />
            Player Pool ({availablePlayers.length} Available)
            {selectedCaptainMethod === "creator" && captains.length < 2 && (
              <Badge variant="secondary" className="ml-2">
                Select 2 for Captains
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Players available for drafting, ranked by ELO rating</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
            {availablePlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedPlayers.includes(player.id) ? "border-primary bg-primary/5" : "hover:border-primary/50"
                } ${
                  selectedCaptainMethod === "creator" && captains.length < 2 && canManageDraft
                    ? "cursor-pointer"
                    : "cursor-default"
                }`}
                onClick={() => {
                  if (selectedCaptainMethod === "creator" && captains.length < 2 && canManageDraft) {
                    handlePlayerSelection(player.id)
                  }
                }}
              >
                <Badge variant="secondary" className="min-w-[2rem]">
                  #{index + 1}
                </Badge>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {player.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{player.username}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3" />
                    <span>{player.elo_rating} ELO</span>
                    {index === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Highest
                      </Badge>
                    )}
                    {index === availablePlayers.length - 1 && availablePlayers.length > 1 && (
                      <Badge variant="outline" className="text-xs">
                        Lowest
                      </Badge>
                    )}
                  </div>
                </div>
                {selectedPlayers.includes(player.id) && <Badge className="bg-green-500">Selected</Badge>}
                {player.id === user?.id && (
                  <Badge variant="outline" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {availablePlayers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Available Players</h3>
              <p className="text-muted-foreground">All players have been drafted or assigned roles</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Controls */}
      {canManageDraft && captains.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-500" />
              Draft Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to Start Draft</p>
                <p className="text-sm text-muted-foreground">
                  Captains selected • {availablePlayers.length} players available for drafting
                </p>
              </div>
              <Button
                onClick={handleStartDraft}
                disabled={processing}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                {processing ? "Starting..." : "Start Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
