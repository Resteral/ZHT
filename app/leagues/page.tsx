"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, DollarSign, Users, ArrowRight, Plus, Clock, Medal, Gamepad2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { UnifiedDraftSelector } from "@/components/draft/unified-draft-selector"
import { SoloQueuePool } from "@/components/leagues/solo-queue-pool"
import { EloTeamManager } from "@/components/leagues/elo-team-manager"
import { PlayerBiddingSystem } from "@/components/leagues/player-bidding-system"
import { Leaderboards } from "@/components/leagues/leaderboards"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Crown, Target, Star, BarChart3, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

interface Tournament {
  id: string
  name: string
  game: string
  max_teams: number
  current_teams: number
  entry_fee: number
  prize_pool: number
  start_date: string
  status: string
  format: string
  betting_enabled: boolean
  total_bets: number
  player_pool_size?: number
  max_player_pool?: number
  registration_open?: boolean
  tournament_type?: string
}

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

export default function LeaguesPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [activeWagerMatches, setActiveWagerMatches] = useState<WagerMatch[]>([])
  const [activeCaptainDrafts, setActiveCaptainDrafts] = useState<CaptainDraft[]>([])
  const [activeElos, setActiveElos] = useState<
    Array<{ id: string; username: string; elo_rating: number; status: string }>
  >([])
  const [eloLeagues, setEloLeagues] = useState<EloLeague[]>([])
  const [selectedLeague, setSelectedLeague] = useState<EloLeague | null>(null)
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([])
  const [monthlyRankings, setMonthlyRankings] = useState<MonthlyRanking[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

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
          trend: Math.random() > 0.5 ? "up" : Math.random() > 0.5 ? "down" : ("stable" as "up" | "down" | "stable"),
        }))

        setMonthlyRankings(rankings)
      }
    } catch (error) {
      console.error("Error loading monthly rankings:", error)
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

  const fetchData = async () => {
    try {
      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select(`
          *,
          tournament_player_pool!inner(count)
        `)
        .in("status", ["registration", "team_building", "active", "draft"])
        .order("created_at", { ascending: false })
        .limit(10)

      if (tournamentData) {
        const processedTournaments = tournamentData.map((tournament) => ({
          id: tournament.id,
          name: tournament.name || "Tournament",
          game: tournament.game || "zealot_hockey",
          max_teams: tournament.max_participants || 16,
          current_teams: tournament.current_participants || 0,
          entry_fee: tournament.entry_fee || 0,
          prize_pool: tournament.prize_pool || 1000,
          start_date: tournament.start_date || new Date().toISOString(),
          status: tournament.status,
          format: tournament.tournament_format || "bracket",
          betting_enabled: tournament.betting_enabled || false,
          total_bets: tournament.total_bets || 0,
          player_pool_size: tournament.tournament_player_pool?.length || 0,
          max_player_pool: tournament.max_player_pool || 64,
          registration_open: tournament.status === "registration" || tournament.status === "draft",
          tournament_type: tournament.tournament_type || "team",
        }))
        setTournaments(processedTournaments)
      }

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
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leagues</h1>
          <p className="text-muted-foreground">
            Tournaments, ELO teams, player bidding, and competitive leagues all in one place
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Leagues & Tournament Hub</h3>
            <p className="text-sm text-muted-foreground">
              Join tournaments, create ELO teams, bid on players, compete in leagues • Earn $10 per game played • Win
              massive prize pools • Multiple formats and durations available
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

      <Tabs defaultValue="lobbies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lobbies">Lobbies</TabsTrigger>
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="elo-league">Elo League</TabsTrigger>
        </TabsList>

        <TabsContent value="lobbies" className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">ELO Draft Lobbies</h3>
                <p className="text-sm text-muted-foreground">
                  Competitive lobbies based on ELO ratings • 1v1 to 6v6 formats • Real-time matchmaking • Skill-based
                  progression • $10-$50 per game
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-500">LIVE LOBBIES</div>
                <div className="text-xs text-muted-foreground">All Formats Available</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Active Lobbies Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Active ELO Lobbies
                </CardTitle>
                <CardDescription>Join existing lobbies or create new ones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : activeCaptainDrafts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No active lobbies</h3>
                    <p className="text-sm mb-4">Be the first to create a lobby!</p>
                    <UnifiedDraftSelector mode="create" buttonText="Create First Lobby" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeCaptainDrafts.slice(0, 5).map((draft) => (
                      <div
                        key={draft.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{draft.format}</span>
                          </div>
                          <div>
                            <h4 className="font-medium">{draft.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>
                                {draft.participants}/{draft.max_participants} players
                              </span>
                              <span>•</span>
                              <DollarSign className="h-3 w-3" />
                              <span>${draft.prize_pool} prize</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={draft.status === "waiting" ? "secondary" : "default"}>
                            {draft.status === "waiting" ? "Waiting" : "Active"}
                          </Badge>
                          <Button size="sm" asChild>
                            <Link href={`/draft/room/${draft.id}`}>{draft.user_is_participant ? "Enter" : "Join"}</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create ELO Lobby
                  </CardTitle>
                  <CardDescription>Start a new ELO-based draft lobby</CardDescription>
                </CardHeader>
                <CardContent>
                  <UnifiedDraftSelector mode="create" buttonText="Create New Lobby" className="w-full" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Browse All Lobbies
                  </CardTitle>
                  <CardDescription>View and join existing lobbies across all formats</CardDescription>
                </CardHeader>
                <CardContent>
                  <SoloQueuePool />
                </CardContent>
              </Card>
            </div>

            {/* ELO Requirements Info */}
            <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  ELO Requirements & Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-white/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">1200+</div>
                    <div className="text-sm text-muted-foreground">Minimum ELO Required</div>
                  </div>
                  <div className="text-center p-4 bg-white/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">$10-$50</div>
                    <div className="text-sm text-muted-foreground">Per Game Reward</div>
                  </div>
                  <div className="text-center p-4 bg-white/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-1">1v1-6v6</div>
                    <div className="text-sm text-muted-foreground">Available Formats</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-6">
          <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Tournaments</h2>
                <p className="text-muted-foreground">
                  Join ongoing tournaments with different draft formats and prize pools
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="lg">
                  <Link href="/tournaments/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Tournament Creation Menu
                  </Link>
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No tournaments available</h3>
                <p className="text-sm mb-4">Check back later for new tournaments!</p>
                <Button asChild>
                  <Link href="/tournaments/create?type=team">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tournament
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((tournament) => (
                  <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span className="text-2xl">{tournament.game}</span>
                            {tournament.name}
                          </CardTitle>
                          <CardDescription>{tournament.game}</CardDescription>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              tournament.status === "registration"
                                ? "secondary"
                                : tournament.status === "team_building"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {tournament.status === "registration"
                              ? "Open"
                              : tournament.status === "team_building"
                                ? "Team Building"
                                : "Live"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {tournament.tournament_type === "team" ? "Team" : "Player"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {tournament.tournament_type === "snake_draft" ||
                            tournament.tournament_type === "linear_draft"
                              ? `${tournament.player_pool_size}/${tournament.max_player_pool} players`
                              : `${tournament.current_teams}/${tournament.max_teams} teams`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.format}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${tournament.prize_pool} prize</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.registration_open ? "Registration Open" : "Registration Closed"}</span>
                        </div>
                      </div>

                      {tournament.betting_enabled && (
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-green-600 font-medium">
                              <DollarSign className="h-3 w-3 inline mr-1" />
                              Betting Available
                            </p>
                            <span className="text-xs text-muted-foreground">${tournament.total_bets} wagered</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {tournament.tournament_type === "snake_draft" ||
                            tournament.tournament_type === "linear_draft"
                              ? "Players registered"
                              : "Teams registered"}
                          </span>
                          <span>
                            {tournament.tournament_type === "snake_draft" ||
                            tournament.tournament_type === "linear_draft"
                              ? `${tournament.player_pool_size}/${tournament.max_player_pool}`
                              : `${tournament.current_teams}/${tournament.max_teams}`}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${
                                tournament.tournament_type === "snake_draft" ||
                                tournament.tournament_type === "linear_draft"
                                  ? (tournament.player_pool_size! / tournament.max_player_pool!) * 100
                                  : (tournament.current_teams / tournament.max_teams) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button asChild className="flex-1">
                          <Link href={`/tournaments/${tournament.id}`}>
                            {tournament.status === "registration"
                              ? "Join Tournament"
                              : tournament.status === "team_building"
                                ? "Build Team"
                                : "View Bracket"}
                          </Link>
                        </Button>
                        {tournament.betting_enabled && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/betting?tournament=${tournament.id}`}>
                              <DollarSign className="h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="elo-league" className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Medal className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Elo League</h3>
                <p className="text-sm text-muted-foreground">
                  Monthly competitive league based on ELO rankings • Climb divisions • Compete for prizes • Prove your
                  skill
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-500">ELO LEAGUE</div>
                <div className="text-xs text-muted-foreground">Monthly Seasons</div>
              </div>
            </div>
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

            <TabsContent value="current-season" className="space-y-6">
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
      </Tabs>
    </div>
  )
}
