"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Trophy, Users, Crown, Target, ArrowRight, Zap, Star, Play, Eye } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { userManagementService } from "@/lib/services/user-management-service"
import { createClient } from "@/lib/supabase/client"

interface TournamentPhase {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  status: "upcoming" | "active" | "completed"
  max_participants: number
  current_participants: number
}

interface LeaderboardEntry {
  rank: number
  username: string
  wins: number
  losses: number
  points: number
  elo_rating: number
  recent_form: string[]
}

interface PoolPlayer {
  id: string
  username: string
  elo_rating: number
  is_captain: boolean
  captain_type?: "high_elo" | "low_elo"
  team_id?: string
  status: "available" | "drafted" | "captain"
}

interface LiveMatch {
  id: string
  team1_name: string
  team2_name: string
  team1_captain: string
  team2_captain: string
  status: "upcoming" | "live" | "completed"
  score_team1: number
  score_team2: number
  bracket_position: string
}

export default function SnakeDraftTournamentPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isRegistered, setIsRegistered] = useState(false)
  const [tournamentPhases, setTournamentPhases] = useState<TournamentPhase[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [playerPool, setPlayerPool] = useState<PoolPlayer[]>([])
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [tournamentId, setTournamentId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadTournamentData()
    const interval = setInterval(loadLiveData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadTournamentData = async () => {
    try {
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("*")
        .eq("name", "Snake Draft Championship")
        .eq("tournament_type", "snake_draft")
        .single()

      if (tournament) {
        setTournamentId(tournament.id)
        await loadPlayerPool(tournament.id)
        await loadLiveMatches(tournament.id)
      }

      // Load tournament phases
      const phases: TournamentPhase[] = [
        {
          id: "week1",
          name: "Week 1: Player Pool & Captain Selection",
          description: "Players join pool, captains randomly selected based on ELO",
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
          max_participants: 64,
          current_participants: playerPool.length,
        },
        {
          id: "week2",
          name: "Week 2: Snake Draft & Team Building",
          description: "Captains draft teams using snake format",
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          max_participants: 32,
          current_participants: 0,
        },
        {
          id: "week3",
          name: "Week 3: Live Bracket Matches",
          description: "Teams compete in live bracket with captain scoring",
          start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          max_participants: 16,
          current_participants: 0,
        },
        {
          id: "week4",
          name: "Week 4: Championship Finals",
          description: "Final matches with captain performance scoring",
          start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          max_participants: 8,
          current_participants: 0,
        },
      ]

      // Load leaderboard data
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          username: "DraftMaster",
          wins: 12,
          losses: 2,
          points: 1240,
          elo_rating: 1850,
          recent_form: ["W", "W", "W", "L", "W"],
        },
        {
          rank: 2,
          username: "SnakeCharmer",
          wins: 11,
          losses: 3,
          points: 1180,
          elo_rating: 1820,
          recent_form: ["W", "W", "L", "W", "W"],
        },
        {
          rank: 3,
          username: "CaptainPick",
          wins: 10,
          losses: 4,
          points: 1120,
          elo_rating: 1790,
          recent_form: ["L", "W", "W", "W", "L"],
        },
      ]

      setTournamentPhases(phases)
      setLeaderboard(mockLeaderboard)
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error loading tournament data:", error)
      setLoading(false)
    }
  }

  const loadPlayerPool = async (tournamentId: string) => {
    try {
      const { data: poolData } = await supabase
        .from("tournament_player_pool")
        .select(`
          *,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (poolData) {
        const processedPlayers = poolData.map((entry: any) => ({
          id: entry.user_id,
          username: entry.users?.username || "Unknown",
          elo_rating: entry.users?.elo_rating || 1200,
          is_captain: entry.status === "captain",
          captain_type: entry.captain_type,
          team_id: entry.team_id,
          status: entry.status,
        }))

        const sortedByElo = [...processedPlayers].sort((a, b) => b.elo_rating - a.elo_rating)
        const captains = processedPlayers.filter((p) => p.is_captain)

        if (captains.length === 0 && sortedByElo.length >= 2) {
          // Select highest and lowest ELO as captains
          sortedByElo[0].is_captain = true
          sortedByElo[0].captain_type = "high_elo"
          sortedByElo[0].status = "captain"

          sortedByElo[sortedByElo.length - 1].is_captain = true
          sortedByElo[sortedByElo.length - 1].captain_type = "low_elo"
          sortedByElo[sortedByElo.length - 1].status = "captain"
        }

        setPlayerPool(sortedByElo)
      }
    } catch (error) {
      console.error("Error loading player pool:", error)
    }
  }

  const loadLiveMatches = async (tournamentId: string) => {
    try {
      const { data: matchesData } = await supabase
        .from("tournament_matches")
        .select(`
          *,
          team1:tournament_teams!team1_id(name, captain_id),
          team2:tournament_teams!team2_id(name, captain_id)
        `)
        .eq("tournament_id", tournamentId)
        .order("bracket_position", { ascending: true })

      if (matchesData) {
        const processedMatches = matchesData.map((match: any) => ({
          id: match.id,
          team1_name: match.team1?.name || "Team 1",
          team2_name: match.team2?.name || "Team 2",
          team1_captain: match.team1?.captain_id || "Unknown",
          team2_captain: match.team2?.captain_id || "Unknown",
          status: match.status,
          score_team1: match.score_team1 || 0,
          score_team2: match.score_team2 || 0,
          bracket_position: match.bracket_position || "TBD",
        }))

        setLiveMatches(processedMatches)
      }
    } catch (error) {
      console.error("Error loading live matches:", error)
    }
  }

  const loadLiveData = async () => {
    if (tournamentId) {
      await loadPlayerPool(tournamentId)
      await loadLiveMatches(tournamentId)
    }
  }

  const handleRegistration = async () => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      console.log("[v0] Starting tournament registration for user:", user.id)

      const dbUser = await userManagementService.ensureUserExists(user)
      console.log("[v0] User verified in database:", dbUser.username)
      console.log("[v0] Auth user ID:", user.id)
      console.log("[v0] Database user ID:", dbUser.id)
      console.log("[v0] Database user object:", JSON.stringify(dbUser))

      // First, try to find an existing snake draft championship tournament
      const { data: existingTournament, error: findError } = await supabase
        .from("tournaments")
        .select("id")
        .eq("name", "Snake Draft Championship")
        .eq("tournament_type", "snake_draft")
        .eq("status", "registration")
        .single()

      let currentTournamentId: string

      if (existingTournament) {
        currentTournamentId = existingTournament.id
        console.log("[v0] Found existing snake draft tournament:", currentTournamentId)
      } else {
        // Create a new snake draft championship tournament
        const startDate = new Date()
        startDate.setDate(startDate.getDate() + 1) // Start tomorrow

        const tournamentData = {
          name: "Snake Draft Championship",
          description: "Ultimate month-long snake draft tournament with strategic picks and intense competition",
          tournament_type: "snake_draft",
          game: "hockey",
          max_participants: 64,
          entry_fee: 0,
          prize_pool: 10000,
          start_date: startDate.toISOString(),
          end_date: new Date(startDate.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: user.id, // Use auth user ID directly
          status: "registration",
          team_based: false,
          player_pool_settings: {
            draft_type: "snake_draft",
            duration_days: 28,
            phases_enabled: true,
          },
        }

        console.log("[v0] Creating tournament with data:", JSON.stringify(tournamentData))

        const { data: newTournament, error: createError } = await supabase
          .from("tournaments")
          .insert(tournamentData)
          .select("id")
          .single()

        if (createError) {
          console.error("[v0] Error creating tournament:", createError)
          throw createError
        }

        currentTournamentId = newTournament.id
        console.log("[v0] Created new snake draft tournament:", currentTournamentId)
      }

      const poolData = {
        tournament_id: currentTournamentId,
        user_id: user.id, // Use auth user ID directly
        status: "available",
        created_at: new Date().toISOString(),
      }

      console.log("[v0] Adding user to player pool with data:", JSON.stringify(poolData))

      const { error: poolError } = await supabase.from("tournament_player_pool").insert(poolData)

      if (poolError && !poolError.message.includes("duplicate")) {
        console.error("[v0] Error adding to player pool:", poolError)
        throw poolError
      }

      setTournamentId(currentTournamentId)
      setIsRegistered(true)
      await loadPlayerPool(currentTournamentId)
      console.log("[v0] User registered for snake draft tournament successfully")
    } catch (error) {
      console.error("[v0] Error registering for tournament:", error)
      alert("Failed to register for tournament. Please try again.")
    }
  }

  const joinDraftRoom = () => {
    if (tournamentId) {
      router.push(`/tournaments/${tournamentId}/draft`)
    } else {
      router.push("/draft?type=snake")
    }
  }

  const watchLiveMatch = (matchId: string) => {
    router.push(`/matches/${matchId}/spectate`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getPhaseProgress = (phase: TournamentPhase) => {
    return (phase.current_participants / phase.max_participants) * 100
  }

  const captains = playerPool.filter((p) => p.is_captain)
  const availablePlayers = playerPool.filter((p) => !p.is_captain && p.status === "available")
  const draftedPlayers = playerPool.filter((p) => p.status === "drafted")

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Snake Draft Championship
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Join the ultimate month-long snake draft tournament. Strategic picks, intense competition, and massive rewards
          await.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <Trophy className="h-4 w-4 mr-1" />
            $10,000 Prize Pool
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Users className="h-4 w-4 mr-1" />
            {playerPool.length}/64 Players
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Calendar className="h-4 w-4 mr-1" />4 Week Tournament
          </Badge>
        </div>
      </div>

      {/* Registration Card */}
      {!isRegistered && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Ready to Draft Your Way to Victory?</h3>
              <p className="text-emerald-700">
                Registration is open for the Snake Draft Championship. Secure your spot before it fills up!
              </p>
              <Button
                onClick={handleRegistration}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-lg"
              >
                Join Player Pool - Free Entry
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="player-pool">Player Pool</TabsTrigger>
          <TabsTrigger value="live-bracket">Live Bracket</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Tournament Phases */}
          <div className="grid gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-emerald-600" />
              Tournament Phases
            </h2>
            {tournamentPhases.map((phase, index) => (
              <Card
                key={phase.id}
                className={`border-l-4 ${
                  phase.status === "active"
                    ? "border-l-emerald-600 bg-emerald-100"
                    : phase.status === "completed"
                      ? "border-l-gray-500 bg-gray-100"
                      : "border-l-blue-600 bg-blue-100"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Badge
                        variant={
                          phase.status === "active" ? "default" : phase.status === "completed" ? "secondary" : "outline"
                        }
                      >
                        {phase.status === "active" ? "Live" : phase.status === "completed" ? "Done" : "Soon"}
                      </Badge>
                      {phase.name}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{phase.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Participants</span>
                      <span>
                        {phase.current_participants}/{phase.max_participants}
                      </span>
                    </div>
                    <Progress value={getPhaseProgress(phase)} className="h-2" />
                  </div>
                  {phase.status === "active" && isRegistered && (
                    <Button onClick={joinDraftRoom} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                      Join Draft Room
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="player-pool" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            Player Pool & Captain Selection
          </h2>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Captains */}
            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Team Captains ({captains.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {captains.map((captain) => (
                  <div key={captain.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-yellow-100 text-yellow-700">
                        {captain.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{captain.username}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-3 w-3" />
                        <span>{captain.elo_rating} ELO</span>
                        <Badge variant="outline" className="text-xs">
                          {captain.captain_type === "high_elo" ? "High ELO" : "Low ELO"}
                        </Badge>
                      </div>
                    </div>
                    <Crown className="h-5 w-5 text-yellow-500" />
                  </div>
                ))}
                {captains.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Captains will be selected</p>
                    <p className="text-sm">when pool reaches minimum size</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Players */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Available Players ({availablePlayers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availablePlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{player.username}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" />
                          <span>{player.elo_rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {availablePlayers.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>All players drafted</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Drafted Players */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-600" />
                  Drafted Players ({draftedPlayers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {draftedPlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {player.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{player.username}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" />
                          <span>{player.elo_rating}</span>
                          {player.team_id && (
                            <Badge variant="outline" className="text-xs">
                              Team {player.team_id.slice(-4)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {draftedPlayers.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No players drafted yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="live-bracket" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Play className="h-6 w-6 text-emerald-600" />
            Live Tournament Bracket
          </h2>

          <div className="grid gap-4">
            {liveMatches.length > 0 ? (
              liveMatches.map((match) => (
                <Card
                  key={match.id}
                  className={`border-l-4 ${
                    match.status === "live"
                      ? "border-l-red-500 bg-red-50"
                      : match.status === "completed"
                        ? "border-l-green-500 bg-green-50"
                        : "border-l-blue-500 bg-blue-50"
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="font-semibold">{match.team1_name}</div>
                          <div className="text-sm text-muted-foreground">Captain: {match.team1_captain}</div>
                        </div>
                        <div className="text-2xl font-bold text-muted-foreground">VS</div>
                        <div className="text-center">
                          <div className="font-semibold">{match.team2_name}</div>
                          <div className="text-sm text-muted-foreground">Captain: {match.team2_captain}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {match.status === "completed" && (
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {match.score_team1} - {match.score_team2}
                            </div>
                            <div className="text-sm text-muted-foreground">Final Score</div>
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <Badge
                            variant={
                              match.status === "live"
                                ? "destructive"
                                : match.status === "completed"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {match.status === "live"
                              ? "🔴 LIVE"
                              : match.status === "completed"
                                ? "✅ Completed"
                                : "⏳ Upcoming"}
                          </Badge>

                          <Button
                            size="sm"
                            variant={match.status === "live" ? "default" : "outline"}
                            onClick={() => watchLiveMatch(match.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {match.status === "live" ? "Watch Live" : "View Details"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-muted-foreground">Bracket Position: {match.bracket_position}</div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No matches scheduled yet</p>
                    <p className="text-sm">Matches will appear once teams are formed</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-emerald-600" />
            Current Standings
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full font-bold">
                        {entry.rank}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {entry.username}
                          {entry.rank === 1 && <Crown className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.wins}W - {entry.losses}L • ELO: {entry.elo_rating}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">{entry.points} pts</div>
                      <div className="flex gap-1 mt-1">
                        {entry.recent_form.map((result, i) => (
                          <div
                            key={i}
                            className={`w-4 h-4 rounded-full text-xs flex items-center justify-center text-white ${
                              result === "W" ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          >
                            {result}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-600" />
            Tournament Rules
          </h2>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Snake Draft Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>• Captains are selected based on ELO ratings (highest and lowest become captains)</p>
                <p>• Lower ELO captain gets first pick advantage</p>
                <p>• Draft order follows snake pattern: 1-2-2-1-1-2-2-1...</p>
                <p>• Each team must have equal number of players</p>
                <p>• Draft timer: 60 seconds per pick</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Captain Scoring System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>• Captains earn points for their team's performance</p>
                <p>• Win: +100 points for captain</p>
                <p>• Loss: +25 points (participation)</p>
                <p>• MVP Performance by drafted player: +50 bonus points</p>
                <p>• Perfect Draft (all picks perform well): +25 bonus points</p>
                <p>• Captain personal performance: +25 points per goal/assist</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prize Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>• 1st Place Captain: $5,000</p>
                <p>• 2nd Place Captain: $2,500</p>
                <p>• 3rd Place Captain: $1,500</p>
                <p>• 4th-8th Place Captains: $250 each</p>
                <p>• Weekly MVP Awards: $100 each</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
