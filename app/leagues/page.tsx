"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, DollarSign, Users, ArrowRight, Medal } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { EloTeamManager } from "@/components/leagues/elo-team-manager"
import { PlayerBiddingSystem } from "@/components/leagues/player-bidding-system"
import { Leaderboards } from "@/components/leagues/leaderboards"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Crown, Target, Star, BarChart3, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { SeasonalTournamentDashboard } from "@/components/tournaments/seasonal-tournament-dashboard"
import { LeagueTournamentsSection } from "@/components/leagues/league-tournaments-section"

interface WagerMatch {
  id: string
  player1: string
  player2?: string
  pot: number
  status: string
  game: string
}

interface CaptainDraft {
  id: string
  name: string
  format: string
  participants: number
  max_participants: number
  team_price: number
  prize_pool: number
  status: string
  current_pick?: number
  round?: number
  draft_start?: string
  match_type?: string
  user_is_participant: boolean
  participant_names: string
  created_at: string
  game_number?: number
}

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

interface Lobby {
  id: string
  name: string
  format: string
  participants: number
  max_participants: number
  team_price: number
  prize_pool: number
  status: string
  current_pick?: number
  round?: number
  draft_start?: string
  match_type?: string
  user_is_participant: boolean
  participant_names: string
  created_at: string
  game_number?: number
}

export default function LeaguesPage() {
  const [eloLeagues, setEloLeagues] = useState<EloLeague[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCaptainDrafts, setActiveCaptainDrafts] = useState<CaptainDraft[]>([])
  const [activeElos, setActiveElos] = useState<
    Array<{ id: string; username: string; elo_rating: number; status: string }>
  >([])
  const [selectedLeague, setSelectedLeague] = useState<EloLeague | null>(null)
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([])
  const [monthlyRankings, setMonthlyRankings] = useState<MonthlyRanking[]>([])
  const [activeWagerMatches, setActiveWagerMatches] = useState<WagerMatch[]>([])
  const supabase = createClient()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!user) return

    const monitorTournamentDrafts = async () => {
      try {
        // Check for tournaments where user is registered and draft is starting
        const { data: userTournaments } = await supabase
          .from("tournament_player_pool")
          .select(`
            tournament_id,
            tournaments(
              id,
              name,
              status,
              tournament_type,
              start_date
            )
          `)
          .eq("user_id", user.id)
          .in("tournaments.status", ["draft_active", "draft_starting"])

        if (userTournaments && userTournaments.length > 0) {
          for (const entry of userTournaments) {
            const tournament = entry.tournaments
            if (tournament && tournament.status === "draft_active") {
              // Show notification and redirect to draft
              const shouldRedirect = window.confirm(
                `The draft for "${tournament.name}" is now active! Would you like to join the draft room?`,
              )

              if (shouldRedirect) {
                router.push(`/tournaments/${tournament.id}/draft`)
                return
              }
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error monitoring tournament drafts:", error)
      }
    }

    // Monitor tournament status changes every 30 seconds
    const draftMonitorInterval = setInterval(monitorTournamentDrafts, 30000)

    // Initial check
    monitorTournamentDrafts()

    return () => clearInterval(draftMonitorInterval)
  }, [user, router])

  useEffect(() => {
    if (!user) return

    const tournamentSubscription = supabase
      .channel("tournament-status-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `status=eq.draft_active`,
        },
        async (payload) => {
          console.log("[v0] Tournament draft started:", payload.new)

          // Check if user is registered for this tournament
          const { data: userRegistration } = await supabase
            .from("tournament_player_pool")
            .select("id")
            .eq("tournament_id", payload.new.id)
            .eq("user_id", user.id)
            .single()

          if (userRegistration) {
            // Show notification and redirect
            const shouldRedirect = window.confirm(
              `The draft for "${payload.new.name}" has started! Join the draft room now?`,
            )

            if (shouldRedirect) {
              router.push(`/tournaments/${payload.new.id}/draft`)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tournamentSubscription)
    }
  }, [user, router])

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
          max_participants: 128,
          current_participants: league.current_participants || 0,
          player_pool_size: league.tournament_player_pool?.length || 0,
          prize_pool: league.prize_pool || 5000,
          entry_fee: 0,
          start_date: league.start_date,
          end_date: league.end_date,
          registration_open: league.status === "registration",
          current_month: currentMonth,
          elo_cutoff_high: 1800,
          elo_cutoff_low: 1200,
        }))
        setEloLeagues(processedLeagues)

        if (processedLeagues.length > 0) {
          setSelectedLeague(processedLeagues[0])
          await loadLeaguePlayers(processedLeagues[0].id)
          await loadMonthlyRankings()
        }
      }
    } catch (error) {
      console.error("[v0] Error loading Elo League data:", error)
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
            season_points: Math.floor(eloRating / 10),
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
        .gte("elo_rating", 1200)
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
          trend: "stable" as "up" | "down" | "stable",
        }))

        setMonthlyRankings(rankings)
      }
    } catch (error) {
      console.error("Error loading monthly rankings:", error)
    }
  }

  const fetchData = useCallback(async () => {
    try {
      const { data: wagerMatches } = await supabase
        .from("wager_matches")
        .select("*")
        .in("status", ["open", "waiting", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(10)

      if (wagerMatches) {
        setActiveWagerMatches(
          wagerMatches.map((match) => ({
            id: match.id,
            player1: match.player1_name || "Player 1",
            player2: match.player2_name,
            pot: match.stake_amount || 50,
            status: match.status,
            game: match.game || "Omega Strikers",
          })),
        )
      }

      const { data: eloMatches } = await supabase
        .from("matches")
        .select(`
          *,
          match_participants(
            user_id,
            users(username, elo_rating)
          )
        `)
        .in("match_type", [
          "1v1_draft",
          "2v2_draft",
          "3v3_draft",
          "4v4_draft",
          "5v5_draft",
          "6v6_draft",
          "captain_draft",
          "elo_draft",
        ])
        .in("status", ["waiting", "active", "drafting", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50)

      if (eloMatches) {
        const processedMatches = eloMatches.map((match) => {
          const participants = match.match_participants || []
          const participantCount = participants.length

          const gameNumber =
            match.game_number ||
            (match.name?.match(/Game #(\d+)/) ? Number.parseInt(match.name.match(/Game #(\d+)/)[1]) : null) ||
            (Number.parseInt(match.id.slice(-4), 16) % 9999) + 1

          return {
            id: match.id,
            name: match.name?.includes("Game #")
              ? match.name
              : `${match.match_type?.replace("_draft", "").toUpperCase()} Game #${gameNumber}`,
            format: match.match_type?.replace("_draft", "").toUpperCase() || "Draft",
            participants: participantCount,
            max_participants: match.max_participants || 8,
            team_price: 0,
            prize_pool: participantCount * 10,
            status: match.status,
            current_pick: match.current_pick,
            round: match.current_round,
            draft_start: match.start_date,
            match_type: match.match_type,
            user_is_participant: participants.some((p: any) => p.user_id === user?.id) || false,
            participant_names: participants
              .map((p: any) => p.users?.username)
              .filter(Boolean)
              .join(", "),
            created_at: match.created_at,
            game_number: gameNumber,
          }
        })

        setActiveCaptainDrafts(processedMatches)
      }

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

      const { data: activeEloData } = await supabase
        .from("users")
        .select(`
          id, 
          username, 
          elo_rating,
          last_active
        `)
        .not("elo_rating", "is", null)
        .gte("last_active", thirtyMinutesAgo)
        .order("elo_rating", { ascending: false })
        .limit(12)

      if (activeEloData) {
        const elosWithStatus = activeEloData.map((player) => ({
          ...player,
          status: Math.random() > 0.5 ? "online" : "in_match",
        }))
        setActiveElos(elosWithStatus)
      }

      await loadEloLeagueData()
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ZHL</h1>
          <p className="text-muted-foreground">
            Zug Hockey League - Tournaments, ELO teams, player bidding, and competitive leagues
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Zug Hockey League Hub</h3>
            <p className="text-sm text-muted-foreground">
              Join ZHL tournaments, create ELO teams, bid on players, compete in leagues • Earn $10 per game played •
              Win massive prize pools • Multiple formats and durations available
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-lg font-bold text-green-500">$10</div>
                <div className="text-xs text-muted-foreground">Per Game Played</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-500">3-30 Days</div>
                <div className="text-xs text-muted-foreground">Various Durations</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-500">Prize Pools</div>
                <div className="text-xs text-muted-foreground">Winners</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button asChild>
            <Link href="/auth/sign-up">
              <DollarSign className="h-4 w-4 mr-2" />
              Start with $25
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/draft/3v3">
              <Users className="h-4 w-4 mr-2" />
              Join Draft
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="elo-league" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="elo-league">ELO League</TabsTrigger>
          <TabsTrigger value="league">League</TabsTrigger>
        </TabsList>

        <TabsContent value="elo-league" className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h2 className="text-3xl font-bold">ZHL ELO League</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join the competitive ZHL ELO league system with seasonal tournaments, divisions, and monthly rankings.
              Compete across all lobby formats to climb the leaderboards.
            </p>
          </div>

          <Tabs defaultValue="current-season" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="current-season">Current Season</TabsTrigger>
              <TabsTrigger value="divisions">Divisions</TabsTrigger>
              <TabsTrigger value="rankings">Monthly Rankings</TabsTrigger>
              <TabsTrigger value="teams">My Teams</TabsTrigger>
              <TabsTrigger value="bidding">Player Auction</TabsTrigger>
              <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
            </TabsList>

            <TabsContent value="current-season">
              <SeasonalTournamentDashboard />
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
                      Premier Division ({leaguePlayers.filter((p) => p.division === "premier").length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">1800+ ELO • Elite Competition</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {leaguePlayers
                      .filter((p) => p.division === "premier")
                      .slice(0, 5)
                      .map((player, index) => (
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
                    {leaguePlayers.filter((p) => p.division === "premier").length === 0 && (
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
                      Championship ({leaguePlayers.filter((p) => p.division === "championship").length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">1600-1799 ELO • High Competition</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {leaguePlayers
                      .filter((p) => p.division === "championship")
                      .slice(0, 5)
                      .map((player, index) => (
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
                      League One ({leaguePlayers.filter((p) => p.division === "league_one").length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">1400-1599 ELO • Competitive</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {leaguePlayers
                      .filter((p) => p.division === "league_one")
                      .slice(0, 5)
                      .map((player, index) => (
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
                      League Two ({leaguePlayers.filter((p) => p.division === "league_two").length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">1200-1399 ELO • Developing</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {leaguePlayers
                      .filter((p) => p.division === "league_two")
                      .slice(0, 5)
                      .map((player, index) => (
                        <div key={player.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full text-green-700 font-bold text-sm">
                            {index + 1}
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
                            <Badge className={getDivisionColor(player.division)}>
                              {getDivisionName(player.division)}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {player.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                              {player.trend === "down" && <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                              {player.trend === "stable" && <div className="w-4 h-4 bg-gray-400 rounded-full" />}
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
                          <Badge className={getDivisionColor(player.division)}>
                            {getDivisionName(player.division)}
                          </Badge>
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

            <TabsContent value="teams">
              <EloTeamManager />
            </TabsContent>

            <TabsContent value="bidding">
              <PlayerBiddingSystem />
            </TabsContent>

            <TabsContent value="leaderboards">
              <Leaderboards />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="league" className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="h-8 w-8 text-blue-500" />
              <h2 className="text-3xl font-bold">ZHL League Tournaments</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Long-term competitive ZHL tournaments (30+ days) with leaderboard-based progression. Join extended
              competitions with larger prize pools and seasonal rewards.
            </p>
          </div>

          {/* Active Long Tournaments */}
          <LeagueTournamentsSection />

          {/* Create League Tournament */}
          <Card>
            <CardHeader>
              <CardTitle>Create ZHL League Tournament</CardTitle>
              <p className="text-sm text-muted-foreground">
                Start a new long-term competitive ZHL league with leaderboard progression
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button asChild className="flex-1">
                  <Link href="/tournaments/create?type=long">
                    <Trophy className="h-4 w-4 mr-2" />
                    Create ZHL League Tournament
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 bg-transparent">
                  <Link href="/tournaments?filter=long">
                    <Users className="h-4 w-4 mr-2" />
                    Browse All ZHL Leagues
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6 mt-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Looking for Tournaments?</h3>
            <p className="text-sm text-muted-foreground">
              Create and join ZHL tournaments with Snake Draft, Linear Draft, and Auction formats on our dedicated
              tournaments page.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/tournaments">
              <Trophy className="h-4 w-4 mr-2" />
              Go to Tournaments
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
