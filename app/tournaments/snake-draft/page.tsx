"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Trophy, Users, Crown, Target, Zap, Star, Play, Eye, Plus, BarChart3 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface Tournament {
  id: string
  name: string
  tournament_type: string
  status: string
  max_participants: number
  current_participants: number
  player_pool_size: number
  prize_pool: number
  entry_fee: number
  start_date: string
  end_date: string
  registration_open: boolean
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

export default function TournamentDataPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [playerPool, setPlayerPool] = useState<PoolPlayer[]>([])
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("tournaments")

  const supabase = createClient()

  useEffect(() => {
    loadTournamentData()
    const interval = setInterval(loadLiveData, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const loadTournamentData = async () => {
    try {
      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select(`
          *,
          tournament_player_pool(count)
        `)
        .in("status", ["registration", "draft", "team_building", "active"])
        .order("created_at", { ascending: false })

      if (tournamentData) {
        const processedTournaments = tournamentData.map((tournament) => ({
          id: tournament.id,
          name: tournament.name,
          tournament_type: tournament.tournament_type,
          status: tournament.status,
          max_participants: tournament.max_participants || 64,
          current_participants: tournament.current_participants || 0,
          player_pool_size: tournament.tournament_player_pool?.length || 0,
          prize_pool: tournament.prize_pool || 0,
          entry_fee: tournament.entry_fee || 0,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          registration_open: tournament.status === "registration" || tournament.status === "draft",
        }))
        setTournaments(processedTournaments)

        // Auto-select first tournament if available
        if (processedTournaments.length > 0) {
          setSelectedTournament(processedTournaments[0])
          await loadPlayerPool(processedTournaments[0].id)
          await loadLiveMatches(processedTournaments[0].id)
        }
      }

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

        setPlayerPool(processedPlayers.sort((a, b) => b.elo_rating - a.elo_rating))
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
    if (selectedTournament) {
      await loadPlayerPool(selectedTournament.id)
      await loadLiveMatches(selectedTournament.id)
    }
  }

  const handleTournamentSelect = async (tournament: Tournament) => {
    setSelectedTournament(tournament)
    await loadPlayerPool(tournament.id)
    await loadLiveMatches(tournament.id)
  }

  const joinTournament = async (tournamentId: string) => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const poolData = {
        tournament_id: tournamentId,
        user_id: user.id,
        status: "available",
        created_at: new Date().toISOString(),
      }

      const { error: poolError } = await supabase.from("tournament_player_pool").insert(poolData)

      if (poolError && !poolError.message.includes("duplicate")) {
        throw poolError
      }

      await loadPlayerPool(tournamentId)
      console.log("[v0] User joined tournament successfully")
    } catch (error) {
      console.error("[v0] Error joining tournament:", error)
      alert("Failed to join tournament. Please try again.")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTournamentTypeIcon = (type: string) => {
    switch (type) {
      case "snake_draft":
        return <Zap className="h-5 w-5 text-emerald-600" />
      case "linear_draft":
        return <BarChart3 className="h-5 w-5 text-blue-600" />
      default:
        return <Trophy className="h-5 w-5 text-purple-600" />
    }
  }

  const getTournamentTypeColor = (type: string) => {
    switch (type) {
      case "snake_draft":
        return "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50"
      case "linear_draft":
        return "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50"
      default:
        return "border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50"
    }
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
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Tournament Hub
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Join active tournaments, view player pools, and track live matches. Choose your tournament format and compete
          for prizes.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Trophy className="h-4 w-4 mr-1" />
            {tournaments.length} Active Tournaments
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Users className="h-4 w-4 mr-1" />
            Multiple Formats
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Calendar className="h-4 w-4 mr-1" />
            Live Registration
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="player-pool">Player Pool</TabsTrigger>
          <TabsTrigger value="live-bracket">Live Bracket</TabsTrigger>
          <TabsTrigger value="create">Create Tournament</TabsTrigger>
        </TabsList>

        <TabsContent value="tournaments" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-purple-600" />
              Available Tournaments
            </h2>
            <Button asChild>
              <Link href="/tournaments/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Tournament
              </Link>
            </Button>
          </div>

          {tournaments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No tournaments available</p>
                  <p className="text-sm">Create a new tournament to get started</p>
                  <Button asChild className="mt-4">
                    <Link href="/tournaments/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Tournament
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {tournaments.map((tournament) => (
                <Card
                  key={tournament.id}
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${getTournamentTypeColor(tournament.tournament_type)} ${
                    selectedTournament?.id === tournament.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleTournamentSelect(tournament)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/50 rounded-full">
                          {getTournamentTypeIcon(tournament.tournament_type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tournament.name}</CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">
                            {tournament.tournament_type.replace("_", " ")} Tournament
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={tournament.registration_open ? "secondary" : "outline"}
                          className={tournament.registration_open ? "bg-green-100 text-green-700" : ""}
                        >
                          {tournament.registration_open ? "Registration Open" : "Registration Closed"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ${tournament.prize_pool} Prize
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {tournament.player_pool_size}/{tournament.max_participants} players
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(tournament.start_date)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Players registered</span>
                        <span>
                          {tournament.player_pool_size}/{tournament.max_participants}
                        </span>
                      </div>
                      <Progress
                        value={(tournament.player_pool_size / tournament.max_participants) * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="flex gap-2">
                      {tournament.registration_open && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            joinTournament(tournament.id)
                          }}
                          className="flex-1"
                        >
                          Join Tournament
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/tournaments/${tournament.id}`)
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="player-pool" className="space-y-6">
          {selectedTournament ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  Player Pool - {selectedTournament.name}
                </h2>
                <Badge variant="outline">
                  {playerPool.length}/{selectedTournament.max_participants} Players
                </Badge>
              </div>

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
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a tournament to view its player pool</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="live-bracket" className="space-y-6">
          {selectedTournament ? (
            <>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Play className="h-6 w-6 text-purple-600" />
                Live Bracket - {selectedTournament.name}
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
                                onClick={() => router.push(`/matches/${match.id}/spectate`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {match.status === "live" ? "Watch Live" : "View Details"}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 text-sm text-muted-foreground">
                          Bracket Position: {match.bracket_position}
                        </div>
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
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a tournament to view its live bracket</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plus className="h-6 w-6 text-purple-600" />
            Create New Tournament
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-full">
                    <Zap className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-emerald-800">Snake Draft Tournament</CardTitle>
                    <p className="text-sm text-emerald-700">Strategic drafting with reversing pick order</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/tournaments/create?type=snake_draft">
                    <Zap className="h-4 w-4 mr-2" />
                    Create Snake Tournament
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-blue-800">Linear Draft Tournament</CardTitle>
                    <p className="text-sm text-blue-700">Consistent pick order strategy tournament</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link href="/tournaments/create?type=linear_draft">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Create Linear Tournament
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
