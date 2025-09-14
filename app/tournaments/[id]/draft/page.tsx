"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Users, Crown, Target, Trophy, ArrowLeft, Play, DollarSign, Gavel, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context" // Updated to use consolidated auth context
import { createClient } from "@/lib/supabase/client"
import { captainSelectionService } from "@/lib/services/captain-selection-service"
import PermissionGuard from "@/components/auth/permission-guard" // Added permission guard

interface Team {
  id: string
  team_name: string
  team_captain: string
  budget_remaining: number
  captain_username: string
  captain_elo: number
  players: any[]
  logo_url?: string
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
  const { user, isAuthenticated, supabaseUser } = useAuth() // Updated to use consolidated auth
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
  const [customizingTeam, setCustomizingTeam] = useState<Team | null>(null)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamLogo, setNewTeamLogo] = useState("")

  const supabase = createClient()

  useEffect(() => {
    if (isAuthenticated && user && supabaseUser) {
      // Enhanced authentication check
      loadTournamentData()
    }
  }, [tournamentId, user, isAuthenticated, supabaseUser]) // Updated dependencies

  const loadTournamentData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading tournament draft data for:", tournamentId)
      console.log("[v0] Current user:", {
        id: user?.id,
        username: user?.username,
        role: user?.role,
        supabaseId: supabaseUser?.id,
      }) // Enhanced user logging

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) throw tournamentError
      setTournament(tournamentData)

      console.log("[v0] Checking for existing captains...")
      const currentCaptains = await captainSelectionService.getCurrentCaptains(tournamentId)
      console.log("[v0] Current captains found:", currentCaptains.length, currentCaptains)

      const userIsCaptain = currentCaptains.some((captain) => captain.id === user?.id)
      console.log("[v0] Current user is captain:", userIsCaptain, "User ID:", user?.id)

      if (currentCaptains.length === 0) {
        console.log("[v0] No captains found, checking if we can select automatically...")

        const { data: poolCheck } = await supabase
          .from("tournament_player_pool")
          .select("user_id")
          .eq("tournament_id", tournamentId)
          .eq("status", "available")

        const requiredTeams = tournamentData.player_pool_settings?.num_teams || 3
        console.log("[v0] Players in pool:", poolCheck?.length || 0, "Required teams:", requiredTeams)

        if ((poolCheck?.length || 0) >= requiredTeams) {
          console.log("[v0] Sufficient players available, selecting captains automatically...")
          const result = await captainSelectionService.selectCaptainsAutomatically(tournamentId)
          if (!result.success) {
            console.error("[v0] Failed to auto-select captains:", result.message)
            throw new Error(result.message)
          }
          console.log("[v0] Auto-selected captains:", result.captains)
        } else {
          console.log("[v0] Not enough players to select captains automatically")
        }
      } else {
        console.log("[v0] Using existing captains:", currentCaptains)
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
          users:team_captain(username, elo_rating),
          logo_url
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
        logo_url: team.logo_url,
      }))

      setTeams(transformedTeams)
      console.log("[v0] Teams with captains loaded:", transformedTeams.length)

      transformedTeams.forEach((team) => {
        console.log(
          "[v0] Team:",
          team.team_name,
          "Captain ID:",
          team.team_captain,
          "Captain Name:",
          team.captain_username,
        )
        if (team.team_captain === user?.id) {
          console.log("[v0] Current user is captain of team:", team.team_name)
        }
      })

      const finalCaptains = await captainSelectionService.getCurrentCaptains(tournamentId)
      console.log("[v0] Final captains after team creation:", finalCaptains.length, finalCaptains)

      const { data: poolData, error: poolError } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          captain_type,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .in("status", ["available", "drafted"])
        .order("created_at")

      if (poolError) throw poolError

      const captainIds = transformedTeams.map((team) => team.team_captain)
      console.log("[v0] Captain IDs from teams:", captainIds)

      const transformedPlayers = (poolData || [])
        .filter((player) => player.status === "available" && !captainIds.includes(player.user_id))
        .map((player) => ({
          user_id: player.user_id,
          username: player.users?.username || "Unknown",
          elo_rating: player.users?.elo_rating || 1200,
          status: player.status,
          captain_type: player.captain_type,
          current_bid: 0,
          highest_bidder: null,
          is_captain: false,
        }))

      setPlayerPool(transformedPlayers)

      console.log("[v0] Loaded teams:", transformedTeams.length)
      console.log("[v0] Loaded available players:", transformedPlayers.length)
      console.log("[v0] Players who are also captains:", finalCaptains.length)
      console.log("[v0] Captains excluded from player pool:", captainIds.length)

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
      console.log("[v0] Creating teams for captains:", captains.length, captains)

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

        await supabase.from("tournament_teams").delete().eq("tournament_id", tournamentId)

        const teamInserts = captains.slice(0, requiredTeams).map((captain, index) => ({
          tournament_id: tournamentId,
          team_name: `Team ${captain.username}`,
          team_captain: captain.id,
          budget_remaining: 1000,
          logo_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${captain.username}`,
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
    if (!currentPlayer || !user || !supabaseUser) return // Added supabaseUser check

    try {
      console.log(
        "[v0] Attempting to place bid - User ID:",
        user.id,
        "Supabase ID:",
        supabaseUser.id,
        "Team ID:",
        teamId,
        "Amount:",
        amount,
      ) // Enhanced logging

      const team = teams.find((t) => t.id === teamId)
      if (!team) {
        console.error("[v0] Team not found:", teamId)
        setError("Team not found")
        return
      }

      if (team.team_captain !== user.id && team.team_captain !== supabaseUser.id) {
        console.error(
          "[v0] User is not captain of this team. User ID:",
          user.id,
          "Supabase ID:",
          supabaseUser.id,
          "Team Captain:",
          team.team_captain,
        )
        setError("You are not the captain of this team")
        return
      }

      if (team.budget_remaining < amount) {
        console.error("[v0] Insufficient budget. Available:", team.budget_remaining, "Requested:", amount)
        setError("Insufficient budget for this bid")
        return
      }

      if (amount <= (currentPlayer.current_bid || 0)) {
        console.error("[v0] Bid too low. Current bid:", currentPlayer.current_bid, "New bid:", amount)
        setError("Bid must be higher than current bid")
        return
      }

      setCurrentPlayer({
        ...currentPlayer,
        current_bid: amount,
        highest_bidder: teamId,
      })

      setBidTimer(30)
      setError(null)

      console.log("[v0] Bid placed successfully:", amount, "by team", team.team_name, "Captain:", team.captain_username)
    } catch (err) {
      console.error("[v0] Error placing bid:", err)
      setError("Failed to place bid")
    }
  }

  const handleBidTimeout = async () => {
    if (!currentPlayer) return

    try {
      if (currentPlayer.highest_bidder) {
        const winningTeam = teams.find((t) => t.id === currentPlayer.highest_bidder)
        if (winningTeam) {
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

          await supabase
            .from("tournament_teams")
            .update({
              budget_remaining: winningTeam.budget_remaining - (currentPlayer.current_bid || 0),
            })
            .eq("id", currentPlayer.highest_bidder)

          await supabase.from("tournament_team_members").insert({
            tournament_id: tournamentId,
            team_id: currentPlayer.highest_bidder,
            user_id: currentPlayer.user_id,
            role: currentPlayer.is_captain ? "captain" : "player",
            created_at: new Date().toISOString(),
          })

          await supabase
            .from("tournament_player_pool")
            .update({ status: "drafted" })
            .eq("tournament_id", tournamentId)
            .eq("user_id", currentPlayer.user_id)

          console.log("[v0] Player", currentPlayer.username, "assigned to", winningTeam.team_name)
        }
      }

      const remainingPlayers = playerPool.filter((p) => p.user_id !== currentPlayer.user_id)
      setPlayerPool(remainingPlayers)

      if (remainingPlayers.length > 0) {
        setCurrentPlayer(remainingPlayers[0])
        setBidTimer(30)
        setBidAmount(1)
      } else {
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

  const updateTeamCustomization = async (teamId: string, teamName: string, teamLogo: string) => {
    try {
      const { error } = await supabase
        .from("tournament_teams")
        .update({
          team_name: teamName,
          logo_url: teamLogo,
        })
        .eq("id", teamId)

      if (error) throw error

      setTeams((prev) =>
        prev.map((team) =>
          team.id === teamId
            ? {
                ...team,
                team_name: teamName,
                logo_url: teamLogo,
              }
            : team,
        ),
      )

      setCustomizingTeam(null)
      setNewTeamName("")
      setNewTeamLogo("")

      console.log("[v0] Team customization updated for team:", teamId)
    } catch (err) {
      console.error("[v0] Error updating team customization:", err)
      setError("Failed to update team customization")
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

  const isUserCaptain = teams.some((team) => team.team_captain === user?.id || team.team_captain === supabaseUser?.id)
  const userTeam = teams.find((team) => team.team_captain === user?.id || team.team_captain === supabaseUser?.id)
  const draftMode = tournament?.player_pool_settings?.draft_mode || "auction_draft"
  const isHost = user?.id === tournament?.created_by || supabaseUser?.id === tournament?.created_by

  console.log("[v0] Captain status check - User ID:", user?.id)
  console.log("[v0] Supabase User ID:", supabaseUser?.id) // Added Supabase user ID logging
  console.log("[v0] Is user captain:", isUserCaptain)
  console.log("[v0] User team:", userTeam?.team_name || "None")
  console.log(
    "[v0] All teams:",
    teams.map((t) => ({ name: t.team_name, captain: t.team_captain })),
  )

  return (
    <PermissionGuard tournamentId={tournamentId} requiredRole="user">
      <div className="container mx-auto py-6 space-y-6">
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

                {!isUserCaptain && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-red-800 font-medium">Debug: You are not recognized as a captain</p>
                    <p className="text-xs text-red-600 mt-1">
                      Your ID: {user?.id} | Teams: {teams.map((t) => `${t.team_name}(${t.team_captain})`).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                    {team.logo_url ? (
                      <img
                        src={team.logo_url || "/placeholder.svg"}
                        alt={team.team_name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback>{team.captain_username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{team.team_name}</p>
                      {team.team_captain === user?.id && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setCustomizingTeam(team)
                                setNewTeamName(team.team_name)
                                setNewTeamLogo(team.logo_url || "")
                              }}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Customize Your Team</DialogTitle>
                              <DialogDescription>Update your team name and logo</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="team-name">Team Name</Label>
                                <Input
                                  id="team-name"
                                  value={newTeamName}
                                  onChange={(e) => setNewTeamName(e.target.value)}
                                  placeholder="Enter team name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="team-logo">Team Logo URL</Label>
                                <Input
                                  id="team-logo"
                                  value={newTeamLogo}
                                  onChange={(e) => setNewTeamLogo(e.target.value)}
                                  placeholder="Enter logo URL or leave blank for default"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setCustomizingTeam(null)
                                    setNewTeamName("")
                                    setNewTeamLogo("")
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => updateTeamCustomization(team.id, newTeamName, newTeamLogo)}
                                  disabled={!newTeamName.trim()}
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
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
                    <p className="text-xs text-muted-foreground">Players: {team.players.length}</p>
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
                <details className="mt-2">
                  <summary className="text-xs text-blue-500 cursor-pointer">Debug Info</summary>
                  <div className="text-xs text-blue-600 mt-1 space-y-1">
                    <p>Your User ID: {user?.id}</p>
                    <p>Your Supabase ID: {supabaseUser?.id}</p>
                    <p>Teams: {teams.map((t) => `${t.team_name}(${t.team_captain})`).join(", ")}</p>
                    <p>Is Authenticated: {isAuthenticated ? "Yes" : "No"}</p>
                    <p>User Role: {user?.role || "Unknown"}</p>
                  </div>
                </details>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Available Players ({playerPool.length})
            </CardTitle>
            <CardDescription>
              Players available for drafting (captains are automatically assigned to their own teams and cannot be
              drafted by others)
            </CardDescription>
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
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Target className="h-3 w-3" />
                        <span>ELO: {player.elo_rating}</span>
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
                <strong>Teams:</strong> {teams.length} teams with{" "}
                {tournament.player_pool_settings?.players_per_team || 4} players each
              </p>
              <p>
                <strong>Available Players:</strong> {playerPool.length} players ready to be drafted
              </p>
              <p>
                <strong>Team Captains:</strong> Captains are automatically assigned to their own teams and cannot be
                drafted by others
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
    </PermissionGuard>
  )
}
