"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Crown, Users, Star, Zap, RefreshCw, Target, History, Info, Shuffle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { captainSelectionService, type CaptainSelectionResult } from "@/lib/services/captain-selection-service"
import { toast } from "sonner"

interface CaptainSelectionInterfaceProps {
  tournamentId: string
  tournament: any
  isOrganizer?: boolean
  isTournamentCreator?: boolean
  onCaptainsSelected?: (captains: any[]) => void
}

export function CaptainSelectionInterface({
  tournamentId,
  tournament,
  isOrganizer = false,
  isTournamentCreator = false,
  onCaptainsSelected,
}: CaptainSelectionInterfaceProps) {
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([])
  const [currentCaptains, setCurrentCaptains] = useState<Captain[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectionHistory, setSelectionHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [canSelect, setCanSelect] = useState(false)
  const [playerCount, setPlayerCount] = useState(0)
  const [selectionMessage, setSelectionMessage] = useState("")
  const [tournamentSettings, setTournamentSettings] = useState<any>(null)
  const [requiredCaptains, setRequiredCaptains] = useState(3) // Default to 3 based on debug logs
  const supabase = createClient()
  const { user } = useAuth()

  const loadTournamentSettings = async () => {
    try {
      console.log("[v0] Loading tournament settings for captain count:", tournamentId)

      const { data: settings, error } = await supabase
        .from("tournament_settings")
        .select("player_pool_settings")
        .eq("tournament_id", tournamentId)
        .single()

      if (error) {
        console.log("[v0] No tournament settings found, using default of 3 teams")
        setRequiredCaptains(3)
        return
      }

      const numTeams = settings?.player_pool_settings?.num_teams || 3
      setRequiredCaptains(numTeams)
      setTournamentSettings(settings)
      console.log("[v0] Tournament requires", numTeams, "captains based on settings")
    } catch (error) {
      console.error("[v0] Error loading tournament settings:", error)
      setRequiredCaptains(3) // Fallback to 3
    }
  }

  const loadAvailablePlayers = async () => {
    try {
      console.log("[v0] Loading available players for captain selection:", tournamentId)

      const { data: poolData, error } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          created_at,
          users (
            username,
            elo_rating
          )
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "available")
        .order("created_at", { ascending: true })

      if (error) throw error

      const players: AvailablePlayer[] = (poolData || []).map((entry: any) => ({
        user_id: entry.user_id,
        username: entry.users?.username || "Unknown Player",
        elo_rating: entry.users?.elo_rating || 1200,
        status: entry.status,
        joined_at: entry.created_at,
      }))

      // Sort by ELO rating for display
      players.sort((a, b) => b.elo_rating - a.elo_rating)

      setAvailablePlayers(players)
      console.log("[v0] Loaded available players:", players.length)
    } catch (error) {
      console.error("[v0] Error loading available players:", error)
      toast.error("Failed to load available players")
    }
  }

  const loadCurrentCaptains = async () => {
    try {
      const captains = await captainSelectionService.getCurrentCaptains(tournamentId)
      setCurrentCaptains(captains)
      console.log("[v0] Loaded current captains:", captains.length)
    } catch (error) {
      console.error("[v0] Error loading current captains:", error)
    }
  }

  const loadSelectionHistory = async () => {
    try {
      const history = await captainSelectionService.getCaptainSelectionHistory(tournamentId)
      setSelectionHistory(history)
    } catch (error) {
      console.error("[v0] Error loading selection history:", error)
    }
  }

  const checkSelectionEligibility = async () => {
    try {
      const eligibility = await captainSelectionService.canSelectCaptains(tournamentId)
      setCanSelect(eligibility.canSelect)
      setPlayerCount(eligibility.playerCount)
      setSelectionMessage(eligibility.message)
    } catch (error) {
      console.error("[v0] Error checking selection eligibility:", error)
    }
  }

  const handleAutomaticSelection = async () => {
    if (!isOrganizer && !isTournamentCreator && user && tournament?.created_by !== user.id) return

    setProcessing(true)
    try {
      console.log("[v0] Starting automatic captain selection")

      const result: CaptainSelectionResult = await captainSelectionService.selectCaptainsAutomatically(tournamentId)

      if (result.success) {
        toast.success(result.message)
        await loadCurrentCaptains()
        await loadAvailablePlayers()
        await loadSelectionHistory()
        onCaptainsSelected?.(result.captains)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("[v0] Error in automatic captain selection:", error)
      toast.error("Failed to select captains automatically")
    } finally {
      setProcessing(false)
    }
  }

  const handleManualSelection = async () => {
    if (!isOrganizer && !isTournamentCreator && user && tournament?.created_by !== user.id) return

    if (selectedPlayers.length !== requiredCaptains) {
      toast.error(`Must select exactly ${requiredCaptains} captains`)
      return
    }

    setProcessing(true)
    try {
      console.log("[v0] Starting manual captain selection:", selectedPlayers)
      console.log("[v0] Selected player IDs:", selectedPlayers)
      console.log(
        "[v0] Available players pool:",
        availablePlayers.map((p) => ({ id: p.user_id, username: p.username })),
      )

      const result: CaptainSelectionResult = await captainSelectionService.selectCaptainsManually(
        tournamentId,
        selectedPlayers,
      )

      console.log("[v0] Manual selection result:", result)

      if (result.success) {
        toast.success(result.message)
        await loadCurrentCaptains()
        await loadAvailablePlayers()
        await loadSelectionHistory()
        setSelectedPlayers([])
        onCaptainsSelected?.(result.captains)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("[v0] Error in manual captain selection:", error)
      toast.error("Failed to select captains manually")
    } finally {
      setProcessing(false)
    }
  }

  const handleResetCaptains = async () => {
    if (!isOrganizer && !isTournamentCreator && user && tournament?.created_by !== user.id) return

    setProcessing(true)
    try {
      console.log("[v0] Resetting captain selections")

      const success = await captainSelectionService.resetCaptains(tournamentId)

      if (success) {
        toast.success("Captain selections reset successfully")
        await loadCurrentCaptains()
        await loadAvailablePlayers()
        await checkSelectionEligibility()
        setSelectedPlayers([])
        onCaptainsSelected?.([])
      } else {
        toast.error("Failed to reset captain selections")
      }
    } catch (error) {
      console.error("[v0] Error resetting captains:", error)
      toast.error("Failed to reset captain selections")
    } finally {
      setProcessing(false)
    }
  }

  const handlePlayerSelection = (playerId: string, checked: boolean) => {
    console.log("[v0] Captain selection attempt:", {
      playerId,
      checked,
      currentSelected: selectedPlayers.length,
      maxAllowed: requiredCaptains,
    })

    setSelectedPlayers((prevSelected) => {
      if (checked) {
        if (prevSelected.length < requiredCaptains && !prevSelected.includes(playerId)) {
          const newSelected = [...prevSelected, playerId]
          console.log("[v0] Captain selected, total now:", newSelected.length)
          return newSelected
        } else {
          console.log("[v0] Cannot select more captains - limit reached or already selected:", requiredCaptains)
          if (prevSelected.length >= requiredCaptains) {
            toast.error(`Cannot select more than ${requiredCaptains} captains`)
          }
          return prevSelected
        }
      } else {
        const newSelected = prevSelected.filter((id) => id !== playerId)
        console.log("[v0] Captain deselected, total now:", newSelected.length)
        return newSelected
      }
    })
  }

  const handleRandomSelection = async () => {
    if (!isOrganizer && !isTournamentCreator && user && tournament?.created_by !== user.id) return

    setProcessing(true)
    try {
      console.log("[v0] Starting random captain selection")

      const result: CaptainSelectionResult = await captainSelectionService.selectCaptainsRandomly(tournamentId)

      if (result.success) {
        toast.success(result.message)
        await loadCurrentCaptains()
        await loadAvailablePlayers()
        await loadSelectionHistory()
        onCaptainsSelected?.(result.captains)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("[v0] Error in random captain selection:", error)
      toast.error("Failed to select captains randomly")
    } finally {
      setProcessing(false)
    }
  }

  const refreshData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadTournamentSettings(), // Added tournament settings loading
        loadAvailablePlayers(),
        loadCurrentCaptains(),
        loadSelectionHistory(),
        checkSelectionEligibility(),
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()

    const subscription = supabase
      .channel(`captain-selection-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_player_pool",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] Captain selection change detected:", payload.eventType)
          refreshData()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tournamentId])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading captain selection...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Captain Selection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Captain Selection Status
            <Button onClick={refreshData} variant="outline" size="sm" className="ml-auto bg-transparent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Select team captains from the player pool to lead teams in the tournament draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{playerCount}</div>
              <div className="text-sm text-muted-foreground">Available Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{currentCaptains.length}</div>
              <div className="text-sm text-muted-foreground">Selected Captains</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{requiredCaptains}</div>
              <div className="text-sm text-muted-foreground">Teams Needed</div>
            </div>
          </div>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>{selectionMessage}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="selection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="selection">Captain Selection</TabsTrigger>
          <TabsTrigger value="current">Current Captains</TabsTrigger>
          <TabsTrigger value="history">Selection History</TabsTrigger>
        </TabsList>

        <TabsContent value="selection" className="space-y-4">
          {/* Selection Methods */}
          {(isOrganizer || isTournamentCreator || (user && tournament?.created_by === user.id)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Selection Methods
                </CardTitle>
                <CardDescription>
                  Choose how to select team captains for this tournament. All methods are available for every
                  tournament.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-blue-500" />
                        <h4 className="font-medium">Highest ELO</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatically selects captains distributed across ELO ranges for balanced teams.
                      </p>
                      <Button
                        onClick={handleAutomaticSelection}
                        disabled={!canSelect || processing || currentCaptains.length > 0}
                        className="w-full"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        {processing ? "Selecting..." : "Auto-Select Captains"}
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-500" />
                        <h4 className="font-medium">Creator Choice</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Manually choose exactly {requiredCaptains} captains from {availablePlayers.length} available
                        players. Each captain will lead one team.
                      </p>
                      <Button
                        onClick={handleManualSelection}
                        disabled={
                          selectedPlayers.length !== requiredCaptains || processing || currentCaptains.length > 0
                        }
                        className="w-full"
                        variant="outline"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        {processing ? "Selecting..." : `Select ${selectedPlayers.length}/${requiredCaptains} Captains`}
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Shuffle className="h-5 w-5 text-purple-500" />
                        <h4 className="font-medium">Random Selection</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Randomly selects {requiredCaptains} players from the pool as captains for unpredictable
                        matchups.
                      </p>
                      <Button
                        onClick={handleRandomSelection}
                        disabled={!canSelect || processing || currentCaptains.length > 0}
                        className="w-full"
                        variant="secondary"
                      >
                        <Shuffle className="h-4 w-4 mr-2" />
                        {processing ? "Selecting..." : "Random Captains"}
                      </Button>
                    </div>
                  </Card>
                </div>

                {currentCaptains.length > 0 && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleResetCaptains}
                      disabled={processing}
                      variant="destructive"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {processing ? "Resetting..." : "Reset Captain Selections"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Available Players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Available Players ({availablePlayers.length})
                {(isOrganizer || isTournamentCreator || (user && tournament?.created_by === user.id)) &&
                  currentCaptains.length === 0 && (
                    <Badge variant="secondary" className="ml-2">
                      Select {requiredCaptains} Captains
                    </Badge>
                  )}
              </CardTitle>
              <CardDescription>
                Players available for captain selection, sorted by ELO rating. Tournament structure: {requiredCaptains}{" "}
                teams with {tournamentSettings?.player_pool_settings?.players_per_team || 4} players each.
                {(isOrganizer || isTournamentCreator || (user && tournament?.created_by === user.id)) &&
                  " Check players for manual captain selection."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availablePlayers.map((player, index) => (
                  <div key={player.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    {(isOrganizer || isTournamentCreator || (user && tournament?.created_by === user.id)) &&
                      currentCaptains.length === 0 && (
                        <Checkbox
                          checked={selectedPlayers.includes(player.user_id)}
                          onCheckedChange={(checked) => handlePlayerSelection(player.user_id, checked as boolean)}
                          disabled={
                            !selectedPlayers.includes(player.user_id) && selectedPlayers.length >= requiredCaptains
                          }
                        />
                      )}

                    <Badge variant="secondary" className="min-w-[2.5rem]">
                      #{index + 1}
                    </Badge>

                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {player.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="font-medium">{player.username}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          <span>{player.elo_rating} ELO</span>
                        </div>
                        <span>Joined {new Date(player.joined_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs text-blue-600">
                          Highest ELO
                        </Badge>
                      )}
                      {index === availablePlayers.length - 1 && availablePlayers.length > 1 && (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          Lowest ELO
                        </Badge>
                      )}
                      {player.user_id === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {availablePlayers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Available Players</h3>
                    <p className="text-muted-foreground">
                      All players have been assigned roles or withdrawn from the pool
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Current Captains
              </CardTitle>
              <CardDescription>Team captains selected for this tournament.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentCaptains.map((captain) => (
                  <div
                    key={captain.id}
                    className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <Crown className="h-6 w-6 text-yellow-500" />
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-yellow-100 text-yellow-800 font-bold">
                        {captain.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-bold text-lg">{captain.username}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          <span>{captain.elo_rating} ELO</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {captain.captain_type ? captain.captain_type.replace("_", " ") : "Team"} Captain
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500 text-white">Captain</Badge>
                      {captain.id === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {currentCaptains.length === 0 && (
                  <div className="text-center py-8">
                    <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Captains Selected</h3>
                    <p className="text-muted-foreground">
                      {isOrganizer || isTournamentCreator || (user && tournament?.created_by === user.id)
                        ? "Use the selection methods above to choose team captains"
                        : "Tournament creator will select captains soon"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Selection History
              </CardTitle>
              <CardDescription>History of captain selection activities for this tournament.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectionHistory.map((entry, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {entry.selection_type === "automatic" ? (
                        <Zap className="h-4 w-4 text-blue-500" />
                      ) : entry.selection_type === "manual" ? (
                        <Users className="h-4 w-4 text-green-500" />
                      ) : (
                        <Shuffle className="h-4 w-4 text-purple-500" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {entry.selection_type}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {entry.selection_type === "automatic"
                          ? "Automatic Selection"
                          : entry.selection_type === "manual"
                            ? "Manual Selection"
                            : "Random Selection"}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</p>
                      <div className="mt-2 space-y-1">
                        {entry.captains_selected?.map((captain: any, idx: number) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            {captain.username} ({captain.elo_rating} ELO) -{" "}
                            {captain.captain_type ? captain.captain_type.replace("_", " ") : "Team"}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {selectionHistory.length === 0 && (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Selection History</h3>
                    <p className="text-muted-foreground">Captain selection activities will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface AvailablePlayer {
  user_id: string
  username: string
  elo_rating: number
  status: string
  joined_at: string
}

interface Captain {
  id: string
  username: string
  elo_rating: number
  captain_type: "high_elo" | "low_elo" | null
}
