"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Users, Crown, Target, Trophy, ArrowLeft, Play, DollarSign, Gavel } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { captainSelectionService } from "@/lib/services/captain-selection-service"

interface Team {
  id: string
  team_name: string
  team_captain: string
  budget_remaining: number
  captain_username: string
  captain_elo: number
  players: any[]
}

interface Player {
  user_id: string
  username: string
  elo_rating: number
  status: string
  captain_type: string
  current_bid?: number
  highest_bidder?: string
  is_captain?: boolean
}

export default function TournamentDraftPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [playerPool, setPlayerPool] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [bidAmount, setBidAmount] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draftStarted, setDraftStarted] = useState(false)
  const [bidTimer, setBidTimer] = useState<number>(30)

  const supabase = createClient()

  useEffect(() => {
    loadTournamentData()
  }, [tournamentId])

  useEffect(() => {
    if (draftStarted && bidTimer > 0) {
      const timer = setTimeout(() => setBidTimer(bidTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else if (bidTimer === 0 && currentPlayer) {
      // Auto-assign player to highest bidder
      handleBidTimeout()
    }
  }, [bidTimer, draftStarted, currentPlayer])

  const loadTournamentData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading tournament draft data for:", tournamentId)

      // Load tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) throw tournamentError
      setTournament(tournamentData)

      const currentCaptains = await captainSelectionService.getCurrentCaptains(tournamentId)
      console.log("[v0] Current captains:", currentCaptains.length)

      if (currentCaptains.length === 0) {
        console.log("[v0] No captains found, selecting automatically...")
        const result = await captainSelectionService.selectCaptainsAutomatically(tournamentId)
        if (!result.success) {
          throw new Error(result.message)
        }
      }

      await ensureTeamsExist(tournamentId, tournamentData)

      const requiredTeams = tournamentData.player_pool_settings?.num_teams || 3

      const { data: teamsData, error: teamsError } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_name,
          team_captain,
          budget_remaining,
          users:team_captain(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at")
        .limit(requiredTeams)

      if (teamsError) throw teamsError

      const transformedTeams = (teamsData || []).map((team) => ({
        id: team.id,
        team_name: team.team_name,
        team_captain: team.team_captain,
        budget_remaining: team.budget_remaining || 1000,
        captain_username: team.users?.username || "Unknown",
        captain_elo: team.users?.elo_rating || 1200,
        players: [],
      }))

      setTeams(transformedTeams)
      console.log("[v0] Teams with captains loaded:", transformedTeams.length)

      const { data: poolData, error: poolError } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          captain_type,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .in("status", ["available", "drafted"]) // Include both available and drafted (captains)
        .order("created_at")

      if (poolError) throw poolError

      const captainIds = transformedTeams.map((team) => team.team_captain)

      const transformedPlayers = (poolData || [])
        .filter((player) => player.status === "available" || captainIds.includes(player.user_id)) // Include available players and captains
        .map((player) => ({
          user_id: player.user_id,
          username: player.users?.username || "Unknown",
          elo_rating: player.users?.elo_rating || 1200,
          status: player.status,
          captain_type: player.captain_type,
          current_bid: 0,
          highest_bidder: null,
          is_captain: captainIds.includes(player.user_id),
        }))

      setPlayerPool(transformedPlayers)

      console.log("[v0] Loaded teams:", transformedTeams.length)
      console.log("[v0] Loaded available players:", transformedPlayers.length)
      console.log("[v0] Players who are also captains:", transformedPlayers.filter((p) => p.is_captain).length)

      setLoading(false)
    } catch (err) {
      console.error("[v0] Error loading tournament data:", err)
      setError(err instanceof Error ? err.message : "Failed to load tournament")
      setLoading(false)
    }
  }

  const ensureTeamsExist = async (tournamentId: string, tournament: any) => {
    try {
      const requiredTeams = tournament.player_pool_settings?.num_teams || 3

      const captains = await captainSelectionService.getCurrentCaptains(tournamentId)
      console.log("[v0] Creating teams for captains:", captains.length)

      if (captains.length === 0) {
        throw new Error("No captains selected for tournament")
      }

      const { data: existingTeams } = await supabase
        .from("tournament_teams")
        .select("id, team_captain, team_name")
        .eq("tournament_id", tournamentId)

      const captainIds = captains.map((c) => c.id)
      const teamsWithValidCaptains = existingTeams?.filter((team) => captainIds.includes(team.team_captain)) || []

      if (teamsWithValidCaptains.length !== requiredTeams || teamsWithValidCaptains.length !== captains.length) {
        console.log(
          "[v0] Recreating teams - current valid teams:",
          teamsWithValidCaptains.length,
          "required:",
          requiredTeams,
        )

        // Delete all existing teams for this tournament
        await supabase.from("tournament_teams").delete().eq("tournament_id", tournamentId)

        const teamInserts = captains.slice(0, requiredTeams).map((captain, index) => ({
          tournament_id: tournamentId,
          team_name: `Team ${captain.username}`,
          team_captain: captain.id, // This links the captain to the team
          budget_remaining: 1000, // Set budget to 1000 as requested
          created_at: new Date().toISOString(),
        }))

        const { error: insertError } = await supabase.from("tournament_teams").insert(teamInserts)

        if (insertError) {
          console.error("[v0] Error creating teams:", insertError)
          throw insertError
        }

        console.log("[v0] Successfully created", teamInserts.length, "teams with proper captains")
      } else {
        console.log("[v0] Teams already exist with correct captains:", teamsWithValidCaptains.length)

        for (const team of teamsWithValidCaptains) {
          await supabase.from("tournament_teams").update({ budget_remaining: 1000 }).eq("id", team.id)
        }
      }
    } catch (error) {
      console.error("[v0] Error ensuring teams exist:", error)
      throw error
    }
  }

  const startDraft = async () => {
    try {
      console.log("[v0] Starting auction draft for tournament:", tournamentId)

      if (playerPool.length === 0) {
        setError("No players available for drafting")
        return
      }

      // Start with first available player
      setCurrentPlayer(playerPool[0])
      setDraftStarted(true)
      setBidTimer(30)
      setBidAmount(1)

      console.log("[v0] Auction draft started successfully")
    } catch (err) {
      console.error("[v0] Error starting draft:", err)
      setError(err instanceof Error ? err.message : "Failed to start draft")
    }
  }

  const placeBid = async (teamId: string, amount: number) => {
    if (!currentPlayer || !user) return

    try {
      const team = teams.find((t) => t.id === teamId)
      if (!team || team.budget_remaining < amount) {
        setError("Insufficient budget for this bid")
        return
      }

      if (amount <= (currentPlayer.current_bid || 0)) {
        setError("Bid must be higher than current bid")
        return
      }

      // Update current player with new bid
      setCurrentPlayer({
        ...currentPlayer,
        current_bid: amount,
        highest_bidder: teamId,
      })

      // Reset timer
      setBidTimer(30)
      setError(null)

      console.log("[v0] Bid placed:", amount, "by team", team.team_name)
    } catch (err) {
      console.error("[v0] Error placing bid:", err)
      setError("Failed to place bid")
    }
  }

  const handleBidTimeout = async () => {
    if (!currentPlayer) return

    try {
      if (currentPlayer.highest_bidder) {
        // Assign player to winning team
        const winningTeam = teams.find((t) => t.id === currentPlayer.highest_bidder)
        if (winningTeam) {
          // Update team budget
          const updatedTeams = teams.map((team) =>
            team.id === currentPlayer.highest_bidder
              ? {
                  ...team,
                  budget_remaining: team.budget_remaining - (currentPlayer.current_bid || 0),
                  players: [...team.players, currentPlayer],
                }
              : team,
          )
          setTeams(updatedTeams)

          // Update database
          await supabase
            .from("tournament_teams")
            .update({
              budget_remaining: winningTeam.budget_remaining - (currentPlayer.current_bid || 0),
            })
            .eq("id", currentPlayer.highest_bidder)

          await supabase
            .from("tournament_player_pool")
            .update({ status: "drafted" })
            .eq("tournament_id", tournamentId)
            .eq("user_id", currentPlayer.user_id)

          console.log("[v0] Player", currentPlayer.username, "assigned to", winningTeam.team_name)
        }
      }

      // Move to next player
      const remainingPlayers = playerPool.filter((p) => p.user_id !== currentPlayer.user_id)
      setPlayerPool(remainingPlayers)

      if (remainingPlayers.length > 0) {
        setCurrentPlayer(remainingPlayers[0])
        setBidTimer(30)
        setBidAmount(1)
      } else {
        // Draft complete
        setDraftStarted(false)
        setCurrentPlayer(null)
        console.log("[v0] Auction draft completed")
      }
    } catch (err) {
      console.error("[v0] Error handling bid timeout:", err)
    }
  }

  const updatePlayerPrice = async (playerId: string, newPrice: number) => {
    if (!user || tournament.created_by !== user.id) {
      setError("Only the tournament host can edit prices")
      return
    }

    try {
      setPlayerPool((prev) =>
        prev.map((player) =>
          player.user_id === playerId ? { ...player, current_bid: newPrice, highest_bidder: null } : player,
        ),
      )

      if (currentPlayer?.user_id === playerId) {
        setCurrentPlayer((prev) => (prev ? { ...prev, current_bid: newPrice, highest_bidder: null } : null))
      }

      console.log("[v0] Host updated player price:", newPrice, "for player:", playerId)
    } catch (err) {
      console.error("[v0] Error updating player price:", err)
      setError("Failed to update player price")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading tournament draft...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error: {error || "Tournament not found"}</p>
          <Button onClick={() => router.push("/tournaments")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  const isUserCaptain = teams.some((team) => team.team_captain === user?.id)
  const userTeam = teams.find((team) => team.team_captain === user?.id)
  const draftMode = tournament.player_pool_settings?.draft_mode || "auction_draft"
  const isHost = user?.id === tournament.created_by

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/tournaments/${tournamentId}/lobby`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lobby
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-purple-500" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
              <p className="text-lg text-muted-foreground">
                {draftMode === "auction_draft" ? "Auction Draft" : "Snake Draft"} Room
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {tournament.status.replace("_", " ")}
          </Badge>
          <Badge variant="secondary">{teams.length} Teams</Badge>
          {isHost && <Badge variant="default">Host</Badge>}
        </div>
      </div>

      {/* Current Auction Player */}
      {draftStarted && currentPlayer && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-yellow-500" />
              Current Auction - {bidTimer}s remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{currentPlayer.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{currentPlayer.username}</p>
                  <p className="text-sm text-muted-foreground">ELO: {currentPlayer.elo_rating}</p>
                  {currentPlayer.is_captain && (
                    <Badge variant="outline" className="text-xs mt-1">
                      <Crown className="h-3 w-3 mr-1" />
                      Captain
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700">${currentPlayer.current_bid || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {currentPlayer.highest_bidder
                    ? `Leading: ${teams.find((t) => t.id === currentPlayer.highest_bidder)?.team_name}`
                    : "No bids yet"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {isHost && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-800">Host Controls:</span>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    placeholder="Set price"
                    className="w-24"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const value = Number.parseInt((e.target as HTMLInputElement).value) || 0
                        updatePlayerPrice(currentPlayer.user_id, value)
                        ;(e.target as HTMLInputElement).value = ""
                      }
                    }}
                  />
                  <span className="text-xs text-blue-600">Press Enter to set price</span>
                </div>
              )}

              {isUserCaptain && userTeam && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={Math.max(1, (currentPlayer.current_bid || 0) + 1)}
                    max={userTeam.budget_remaining}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Number.parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <Button
                    onClick={() => placeBid(userTeam.id, bidAmount)}
                    disabled={bidAmount <= (currentPlayer.current_bid || 0) || bidAmount > userTeam.budget_remaining}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Bid ${bidAmount}
                  </Button>
                  <p className="text-sm text-muted-foreground">Budget: ${userTeam.budget_remaining}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams with Captains */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-green-500" />
            Team Captains & Budgets
          </CardTitle>
          <CardDescription>
            {teams.length} teams ready for {draftMode === "auction_draft" ? "auction" : "snake"} draft
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{team.captain_username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{team.team_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Crown className="h-3 w-3" />
                    <span>{team.captain_username}</span>
                    <Badge variant="outline" className="text-xs">
                      {team.captain_elo} ELO
                    </Badge>
                  </div>
                  {draftMode === "auction_draft" && (
                    <p className="text-sm font-medium text-green-700">Budget: ${team.budget_remaining}</p>
                  )}
                </div>
                {team.team_captain === user?.id && <Badge variant="default">You</Badge>}
              </div>
            ))}
          </div>

          {isUserCaptain && !draftStarted && (
            <div className="mt-6">
              <Button onClick={startDraft} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Start {draftMode === "auction_draft" ? "Auction" : "Snake"} Draft
              </Button>
            </div>
          )}

          {!isUserCaptain && !isHost && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800 font-medium">You are not a team captain</p>
              <p className="text-sm text-blue-600 mt-1">
                Wait for captains to complete the draft, then you'll be assigned to a team
              </p>
            </div>
          )}

          {isHost && !isUserCaptain && !draftStarted && (
            <div className="mt-6">
              <Button onClick={startDraft} className="w-full bg-transparent" size="lg" variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Start Draft (Host Override)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Available Players ({playerPool.length})
          </CardTitle>
          <CardDescription>All players available for drafting, including team captains</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {playerPool
              .sort((a, b) => b.elo_rating - a.elo_rating)
              .map((player, index) => (
                <div
                  key={player.user_id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    currentPlayer?.user_id === player.user_id ? "border-yellow-500 bg-yellow-50" : ""
                  }`}
                >
                  <Badge variant="secondary" className="min-w-[2rem]">
                    #{index + 1}
                  </Badge>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{player.username}</p>
                      {player.is_captain && <Crown className="h-3 w-3 text-yellow-600" title="Team Captain" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      <span>ELO: {player.elo_rating}</span>
                      {player.is_captain && (
                        <Badge variant="outline" className="text-xs">
                          Captain
                        </Badge>
                      )}
                    </div>
                  </div>
                  {player.user_id === user?.id && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                  {currentPlayer?.user_id === player.user_id && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              ))}
          </div>

          {playerPool.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No players available for drafting</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Instructions */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Draft Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Draft Format:</strong> {draftMode === "auction_draft" ? "Auction Draft" : "Snake Draft"}
            </p>
            <p>
              <strong>Teams:</strong> {teams.length} teams with {tournament.player_pool_settings?.players_per_team || 4}{" "}
              players each
            </p>
            <p>
              <strong>Available Players:</strong> {playerPool.length} players ready to be drafted (including team
              captains)
            </p>
            <p>
              <strong>Team Captains:</strong> Captains can be drafted by other teams and participate as players
            </p>
            {draftMode === "auction_draft" && (
              <>
                <p>
                  <strong>Budget:</strong> Each team has $1000 to spend
                </p>
                <p>
                  <strong>Bidding:</strong> Teams bid on players with 30-second timer per player
                </p>
                {isHost && (
                  <p>
                    <strong>Host Controls:</strong> As the host, you can set player prices during the auction
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
