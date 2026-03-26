"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Crown, Users, Star, Zap, RefreshCw, Target, Info, Shuffle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { captainSelectionService, type CaptainSelectionResult } from "@/lib/services/captain-selection-service"
import { toast } from "sonner"

interface UnifiedCaptainSelectionProps {
  tournamentId: string
  tournament: any
  draftType: "snake" | "auction" | "linear"
  isOrganizer?: boolean
  isTournamentCreator?: boolean
  onCaptainsSelected?: (captains: any[]) => void
  onStartDraft?: () => void
}

export function UnifiedCaptainSelection({
  tournamentId,
  tournament,
  draftType,
  isOrganizer = false,
  isTournamentCreator = false,
  onCaptainsSelected,
  onStartDraft,
}: UnifiedCaptainSelectionProps) {
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([])
  const [currentCaptains, setCurrentCaptains] = useState<Captain[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [canSelect, setCanSelect] = useState(false)
  const [playerCount, setPlayerCount] = useState(0)
  const [selectionMessage, setSelectionMessage] = useState("")
  const [tournamentSettings, setTournamentSettings] = useState<any>(null)
  const [requiredCaptains, setRequiredCaptains] = useState(3)
  const [playersPerTeam, setPlayersPerTeam] = useState(4)
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
        console.log("[v0] No tournament settings found, using defaults")
        setRequiredCaptains(3)
        setPlayersPerTeam(4)
        return
      }

      const numTeams = settings?.player_pool_settings?.num_teams || 3
      const playersPerTeamSetting = settings?.player_pool_settings?.players_per_team || 4
      setRequiredCaptains(numTeams)
      setPlayersPerTeam(playersPerTeamSetting)
      setTournamentSettings(settings)
      console.log("[v0] Tournament requires", numTeams, "captains with", playersPerTeamSetting, "players per team")
    } catch (error) {
      console.error("[v0] Error loading tournament settings:", error)
      setRequiredCaptains(3)
      setPlayersPerTeam(4)
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
      console.log("[v0] Starting automatic captain selection for", draftType, "draft")

      const result: CaptainSelectionResult = await captainSelectionService.selectCaptainsAutomatically(tournamentId)

      if (result.success) {
        toast.success(result.message)
        await loadCurrentCaptains()
        await loadAvailablePlayers()
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
      console.log("[v0] Starting manual captain selection for", draftType, "draft:", selectedPlayers)

      const result: CaptainSelectionResult = await captainSelectionService.selectCaptainsManually(
        tournamentId,
        selectedPlayers,
      )

      if (result.success) {
        toast.success(result.message)
        await loadCurrentCaptains()
        await loadAvailablePlayers()
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

  const handleRandomSelection = async () => {
    if (!isOrganizer && !isTournamentCreator && user && tournament?.created_by !== user.id) return

    setProcessing(true)
    try {
      console.log("[v0] Starting random captain selection for", draftType, "draft")

      const result: CaptainSelectionResult = await captainSelectionService.selectCaptainsRandomly(tournamentId)

      if (result.success) {
        toast.success(result.message)
        await loadCurrentCaptains()
        await loadAvailablePlayers()
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
    setSelectedPlayers((prevSelected) => {
      if (checked) {
        if (prevSelected.length < requiredCaptains && !prevSelected.includes(playerId)) {
          return [...prevSelected, playerId]
        } else {
          if (prevSelected.length >= requiredCaptains) {
            toast.error(`Cannot select more than ${requiredCaptains} captains`)
          }
          return prevSelected
        }
      } else {
        return prevSelected.filter((id) => id !== playerId)
      }
    })
  }

  const refreshData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadTournamentSettings(),
        loadAvailablePlayers(),
        loadCurrentCaptains(),
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

  const getDraftTypeColor = () => {
    switch (draftType) {
      case "snake":
        return "border-l-green-500"
      case "auction":
        return "border-l-blue-500"
      case "linear":
        return "border-l-purple-500"
      default:
        return "border-l-gray-500"
    }
  }

  const getDraftTypeIcon = () => {
    switch (draftType) {
      case "snake":
        return <Target className="h-5 w-5 text-green-500" />
      case "auction":
        return <Zap className="h-5 w-5 text-blue-500" />
      case "linear":
        return <Users className="h-5 w-5 text-purple-500" />
      default:
        return <Crown className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Captain Selection Status */}
      <Card className={`border-l-4 ${getDraftTypeColor()}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getDraftTypeIcon()}
            {draftType.charAt(0).toUpperCase() + draftType.slice(1)} Draft - Captain Selection
            <Button onClick={refreshData} variant="outline" size="sm" className="ml-auto bg-transparent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Select {requiredCaptains} team captains for the {draftType} draft. Each captain will lead a team of{" "}
            {playersPerTeam} players.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{playersPerTeam}</div>
              <div className="text-sm text-muted-foreground">Players per Team</div>
            </div>
          </div>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>{selectionMessage}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Current Captains Display */}
      {currentCaptains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Selected Captains ({currentCaptains.length}/{requiredCaptains})
            </CardTitle>
            <CardDescription>Team captains ready for the {draftType} draft.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
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
                        {captain.captain_type.replace("_", " ")} Captain
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
            </div>

            <div className="flex gap-2 mt-4">
              {currentCaptains.length === requiredCaptains && onStartDraft && (
                <Button onClick={onStartDraft} className="flex-1" size="lg">
                  <Target className="h-4 w-4 mr-2" />
                  Start {draftType.charAt(0).toUpperCase() + draftType.slice(1)} Draft
                </Button>
              )}
              {(isOrganizer || isTournamentCreator || (user && tournament?.created_by === user.id)) && (
                <Button onClick={handleResetCaptains} disabled={processing} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Captains
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Methods - Only show if no captains selected and user can select */}
      {currentCaptains.length === 0 &&
        (isOrganizer || isTournamentCreator || (user && tournament?.created_by === user.id)) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Captain Selection Methods
              </CardTitle>
              <CardDescription>
                Choose how to select {requiredCaptains} team captains for this {draftType} draft tournament.
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
                    <Button onClick={handleAutomaticSelection} disabled={!canSelect || processing} className="w-full">
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
                      players.
                    </p>
                    <Button
                      onClick={handleManualSelection}
                      disabled={selectedPlayers.length !== requiredCaptains || processing}
                      className="w-full bg-transparent"
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
                      Randomly selects {requiredCaptains} players from the pool as captains.
                    </p>
                    <Button
                      onClick={handleRandomSelection}
                      disabled={!canSelect || processing}
                      className="w-full"
                      variant="secondary"
                    >
                      <Shuffle className="h-4 w-4 mr-2" />
                      {processing ? "Selecting..." : "Random Captains"}
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Available Players for Manual Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Available Players ({availablePlayers.length})
                    <Badge variant="secondary" className="ml-2">
                      Select {requiredCaptains} Captains
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Players available for captain selection, sorted by ELO rating. Check players for manual selection.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {availablePlayers.map((player, index) => (
                      <div key={player.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Checkbox
                          checked={selectedPlayers.includes(player.user_id)}
                          onCheckedChange={(checked) => handlePlayerSelection(player.user_id, checked as boolean)}
                          disabled={
                            !selectedPlayers.includes(player.user_id) && selectedPlayers.length >= requiredCaptains
                          }
                        />

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
            </CardContent>
          </Card>
        )}
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
  captain_type: "high_elo" | "low_elo"
}
