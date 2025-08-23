"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Trophy, Users, Crown, Target, Star, Plus, BarChart3, Medal, TrendingUp } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface EloLeague {
  id: string
  name: string
  season: string
  status: string
  max_participants: number
  current_participants: number
  player_pool_size: number
  prize_pool: number
  entry_fee: number
  start_date: string
  end_date: string
  registration_open: boolean
  current_month: string
  elo_cutoff_high: number
  elo_cutoff_low: number
}

interface LeaguePlayer {
  id: string
  username: string
  elo_rating: number
  monthly_rank: number
  season_points: number
  is_captain: boolean
  captain_type?: "high_elo" | "low_elo"
  team_id?: string
  status: "available" | "drafted" | "captain"
  division: "premier" | "championship" | "league_one" | "league_two"
}

interface MonthlyRanking {
  id: string
  username: string
  elo_rating: number
  monthly_points: number
  rank: number
  division: string
  trend: "up" | "down" | "stable"
}

export default function EloLeaguePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [eloLeagues, setEloLeagues] = useState<EloLeague[]>([])
  const [selectedLeague, setSelectedLeague] = useState<EloLeague | null>(null)
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([])
  const [monthlyRankings, setMonthlyRankings] = useState<MonthlyRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("leagues")

  const supabase = createClient()

  useEffect(() => {
    loadEloLeagueData()
    const interval = setInterval(loadLiveData, 15000) // Refresh every 15 seconds
    return () => clearInterval(interval)
  }, [])

  const loadEloLeagueData = async () => {
    try {
      const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" })

      const { data: leagueData } = await supabase
        .from("tournaments")
        .select(`
          *,
          tournament_player_pool(count)
        `)
        .eq("tournament_type", "elo_league")
        .in("status", ["registration", "active", "monthly_ranking"])
        .order("created_at", { ascending: false })

      if (leagueData) {
        const processedLeagues = leagueData.map((league) => ({
          id: league.id,
          name: `${currentMonth} Elo League`,
          season: `Season ${new Date().getFullYear()}`,
          status: league.status,
          max_participants: 128, // Larger capacity for league
          current_participants: league.current_participants || 0,
          player_pool_size: league.tournament_player_pool?.length || 0,
          prize_pool: league.prize_pool || 5000, // Higher prize pool for monthly league
          entry_fee: 0, // Free entry based on ELO ranking
          start_date: league.start_date,
          end_date: league.end_date,
          registration_open: league.status === "registration",
          current_month: currentMonth,
          elo_cutoff_high: 1800, // Premier division cutoff
          elo_cutoff_low: 1200, // Minimum ELO to participate
        }))
        setEloLeagues(processedLeagues)

        if (processedLeagues.length > 0) {
          setSelectedLeague(processedLeagues[0])
          await loadLeaguePlayers(processedLeagues[0].id)
          await loadMonthlyRankings()
        }
      }

      setLoading(false)
    } catch (error) {
      console.error("[v0] Error loading Elo League data:", error)
      setLoading(false)
    }
  }

  const loadLeaguePlayers = async (leagueId: string) => {
    try {
      const { data: poolData } = await supabase
        .from("tournament_player_pool")
        .select(`
          *,
          users(username, elo_rating)
        `)
        .eq("tournament_id", leagueId)
        .order("created_at", { ascending: true })

      if (poolData) {
        const processedPlayers = poolData.map((entry: any, index: number) => {
          const eloRating = entry.users?.elo_rating || 1200
          return {
            id: entry.user_id,
            username: entry.users?.username || "Unknown",
            elo_rating: eloRating,
            monthly_rank: index + 1,
            season_points: Math.floor(eloRating / 10), // Convert ELO to season points
            is_captain: entry.status === "captain",
            captain_type: entry.captain_type,
            team_id: entry.team_id,
            status: entry.status,
            division: getDivisionFromElo(eloRating),
          }
        })

        setLeaguePlayers(processedPlayers.sort((a, b) => b.elo_rating - a.elo_rating))
      }
    } catch (error) {
      console.error("Error loading league players:", error)
    }
  }

  const loadMonthlyRankings = async () => {
    try {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, username, elo_rating")
        .gte("elo_rating", 1200) // Minimum ELO to appear in rankings
        .order("elo_rating", { ascending: false })
        .limit(50)

      if (usersData) {
        const rankings = usersData.map((user, index) => ({
          id: user.id,
          username: user.username,
          elo_rating: user.elo_rating,
          monthly_points: Math.floor(user.elo_rating / 10),
          rank: index + 1,
          division: getDivisionFromElo(user.elo_rating),
          trend: Math.random() > 0.5 ? "up" : Math.random() > 0.5 ? "down" : ("stable" as "up" | "down" | "stable"),
        }))

        setMonthlyRankings(rankings)
      }
    } catch (error) {
      console.error("Error loading monthly rankings:", error)
    }
  }

  const getDivisionFromElo = (elo: number): "premier" | "championship" | "league_one" | "league_two" => {
    if (elo >= 1800) return "premier"
    if (elo >= 1600) return "championship"
    if (elo >= 1400) return "league_one"
    return "league_two"
  }

  const getDivisionColor = (division: string) => {
    switch (division) {
      case "premier":
        return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
      case "championship":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
      case "league_one":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
      case "league_two":
        return "bg-gradient-to-r from-green-500 to-teal-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getDivisionName = (division: string) => {
    switch (division) {
      case "premier":
        return "Premier Division"
      case "championship":
        return "Championship"
      case "league_one":
        return "League One"
      case "league_two":
        return "League Two"
      default:
        return "Unranked"
    }
  }

  const loadLiveData = async () => {
    if (selectedLeague) {
      await loadLeaguePlayers(selectedLeague.id)
      await loadMonthlyRankings()
    }
  }

  const joinEloLeague = async (leagueId: string) => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const { data: userData } = await supabase.from("users").select("elo_rating").eq("id", user.id).single()

      if (!userData || userData.elo_rating < 1200) {
        alert("You need at least 1200 ELO to join the Elo League. Play more matches to increase your rating!")
        return
      }

      const poolData = {
        tournament_id: leagueId,
        user_id: user.id,
        status: "available",
        created_at: new Date().toISOString(),
      }

      const { error: poolError } = await supabase.from("tournament_player_pool").insert(poolData)

      if (poolError && !poolError.message.includes("duplicate")) {
        throw poolError
      }

      await loadLeaguePlayers(leagueId)
      console.log("[v0] User joined Elo League successfully")
    } catch (error) {
      console.error("[v0] Error joining Elo League:", error)
      alert("Failed to join Elo League. Please try again.")
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

  const premierPlayers = leaguePlayers.filter((p) => p.division === "premier")
  const championshipPlayers = leaguePlayers.filter((p) => p.division === "championship")
  const leagueOnePlayers = leaguePlayers.filter((p) => p.division === "league_one")
  const leagueTwoPlayers = leaguePlayers.filter((p) => p.division === "league_two")

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
          <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full">
            <Medal className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Elo League
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Monthly competitive league based on ELO rankings. Climb divisions, compete for prizes, and prove your skill
          against the best players.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Medal className="h-4 w-4 mr-1" />
            Monthly Seasons
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <TrendingUp className="h-4 w-4 mr-1" />
            ELO-Based Divisions
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Trophy className="h-4 w-4 mr-1" />
            $5,000+ Monthly Prizes
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leagues">Current Season</TabsTrigger>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="rankings">Monthly Rankings</TabsTrigger>
          <TabsTrigger value="join">Join League</TabsTrigger>
        </TabsList>

        <TabsContent value="leagues" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Medal className="h-6 w-6 text-yellow-600" />
              Current Season
            </h2>
            <Button asChild>
              <Link href="/tournaments/create?type=elo_league">
                <Plus className="h-4 w-4 mr-2" />
                Create New Season
              </Link>
            </Button>
          </div>

          {eloLeagues.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Medal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active Elo League season</p>
                  <p className="text-sm">New seasons start monthly</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {eloLeagues.map((league) => (
                <Card
                  key={league.id}
                  className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-full">
                          <Medal className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{league.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{league.season}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={league.registration_open ? "secondary" : "outline"}
                          className={league.registration_open ? "bg-green-100 text-green-700" : ""}
                        >
                          {league.registration_open ? "Registration Open" : "Season Active"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ${league.prize_pool} Prize Pool
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {league.player_pool_size}/{league.max_participants} players
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>Min {league.elo_cutoff_low} ELO</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{league.current_month}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Season progress</span>
                        <span>
                          {league.player_pool_size}/{league.max_participants}
                        </span>
                      </div>
                      <Progress value={(league.player_pool_size / league.max_participants) * 100} className="h-2" />
                    </div>

                    <div className="flex gap-2">
                      {league.registration_open && (
                        <Button
                          onClick={() => joinEloLeague(league.id)}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                        >
                          Join Season
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => router.push(`/tournaments/${league.id}`)}>
                        View Season
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="divisions" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-600" />
            League Divisions
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Premier Division */}
            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-500/20 rounded-full">
                    <Crown className="h-5 w-5 text-yellow-600" />
                  </div>
                  Premier Division ({premierPlayers.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">1800+ ELO • Elite Competition</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {premierPlayers.slice(0, 5).map((player, index) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full text-yellow-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-yellow-100 text-yellow-700">
                        {player.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{player.username}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-3 w-3" />
                        <span>{player.elo_rating} ELO</span>
                        <span>•</span>
                        <span>{player.season_points} pts</span>
                      </div>
                    </div>
                    <Crown className="h-5 w-5 text-yellow-500" />
                  </div>
                ))}
                {premierPlayers.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No players in Premier Division</p>
                    <p className="text-sm">Reach 1800+ ELO to qualify</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Championship Division */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/20 rounded-full">
                    <Medal className="h-5 w-5 text-purple-600" />
                  </div>
                  Championship ({championshipPlayers.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">1600-1799 ELO • High Competition</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {championshipPlayers.slice(0, 5).map((player, index) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full text-purple-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        {player.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
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
              </CardContent>
            </Card>

            {/* League One */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  League One ({leagueOnePlayers.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">1400-1599 ELO • Competitive</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {leagueOnePlayers.slice(0, 5).map((player, index) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {player.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
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
              </CardContent>
            </Card>

            {/* League Two */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-teal-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/20 rounded-full">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  League Two ({leagueTwoPlayers.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">1200-1399 ELO • Developing</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {leagueTwoPlayers.slice(0, 5).map((player, index) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full text-green-700 font-bold text-sm">
                      {index + 1}
                    </div>
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
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-yellow-600" />
            Monthly Rankings
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>Top 50 Players</CardTitle>
              <p className="text-sm text-muted-foreground">
                Rankings based on current ELO rating • Updated in real-time
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyRankings.map((player) => (
                  <div key={player.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full font-bold text-primary">
                      {player.rank}
                    </div>
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{player.username}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {player.elo_rating} ELO
                        </span>
                        <span>•</span>
                        <span>{player.monthly_points} pts</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getDivisionColor(player.division)}>{getDivisionName(player.division)}</Badge>
                      <div className="flex items-center gap-1">
                        {player.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {player.trend === "down" && <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                        {player.trend === "stable" && <div className="w-4 h-4 bg-gray-400 rounded-full" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="join" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plus className="h-6 w-6 text-yellow-600" />
            Join Elo League
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>How to Join</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full text-primary font-bold text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Achieve Minimum ELO</p>
                      <p className="text-sm text-muted-foreground">Reach at least 1200 ELO by playing ranked matches</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full text-primary font-bold text-sm">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Register for Current Season</p>
                      <p className="text-sm text-muted-foreground">
                        Join the monthly league during registration period
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full text-primary font-bold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Compete in Your Division</p>
                      <p className="text-sm text-muted-foreground">Play matches against players in your ELO division</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Division Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">Premier</span>
                  </div>
                  <span className="text-sm text-muted-foreground">1800+ ELO</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Medal className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Championship</span>
                  </div>
                  <span className="text-sm text-muted-foreground">1600-1799 ELO</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">League One</span>
                  </div>
                  <span className="text-sm text-muted-foreground">1400-1599 ELO</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="font-medium">League Two</span>
                  </div>
                  <span className="text-sm text-muted-foreground">1200-1399 ELO</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {eloLeagues.length > 0 && eloLeagues[0].registration_open && (
            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
              <CardHeader>
                <CardTitle>Join Current Season</CardTitle>
                <p className="text-sm text-muted-foreground">Registration is open for {eloLeagues[0].current_month}</p>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => joinEloLeague(eloLeagues[0].id)}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  size="lg"
                >
                  <Medal className="h-5 w-5 mr-2" />
                  Join {eloLeagues[0].current_month} Season
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
