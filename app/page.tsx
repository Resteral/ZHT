"use client"

import { Suspense, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Trophy,
  Users,
  Target,
  BarChart3,
  Calendar,
  TrendingUp,
  ArrowRight,
  DollarSign,
  Crown,
  Timer,
  Eye,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { UpcomingEvents } from "@/components/dashboard/upcoming-events"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { formatDateEST } from "@/lib/utils/timezone"
import { UnifiedGameCreator } from "@/components/game-creation/unified-game-creator"

interface LiveGame {
  id: string
  name: string
  match_type: string
  status: string
  participants: number
  max_participants: number
  created_at: string
  description: string
  game_state: "lobby" | "drafting" | "scoring"
  players: Array<{
    id: string
    username: string
    elo_rating: number
  }>
}

interface TopPlayer {
  id: string
  username: string
  elo_rating: number
  recent_change: number
}

interface ActiveELOPlayer {
  id: string
  username: string
  elo_rating: number
  status: "online" | "in_match" | "drafting"
  current_match_id?: string
}

interface LiveScore {
  id: string
  name: string
  status: string
  team1_score: number
  team2_score: number
  team1_captain: string
  team2_captain: string
  winner: string
  created_at: string
}

interface CompletedMatch {
  id: string
  name: string
  team1_score: number
  team2_score: number
  winning_team: number
  team1_captain: string
  team2_captain: string
  team1_players: Array<{ username: string; elo_rating: number }>
  team2_players: Array<{ username: string; elo_rating: number }>
  match_duration: number
  validated_at: string
  match_analytics?: {
    total_kills: number
    total_damage: number
    mvp_user_id: string
  }
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [liveGames, setLiveGames] = useState<LiveGame[]>([])
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([])
  const [activeELOPlayers, setActiveELOPlayers] = useState<ActiveELOPlayer[]>([])
  const [liveScores, setLiveScores] = useState<LiveScore[]>([])
  const [completedMatches, setCompletedMatches] = useState<CompletedMatch[]>([])
  const [lastFetch, setLastFetch] = useState<number>(0)

  const loadRealTimeData = async () => {
    if (!isSupabaseConfigured) {
      console.log("[v0] Supabase not configured, using mock data")
      setLoading(false)
      return
    }

    const now = Date.now()
    if (now - lastFetch < 30000) {
      console.log("[v0] Skipping data fetch - too soon since last fetch")
      return
    }
    setLastFetch(now)

    try {
      const supabase = createClient()

      console.log("[v0] Loading real-time data...")
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          match_type,
          status,
          created_at,
          max_participants,
          description,
          match_participants!inner(
            users!inner(id, username, elo_rating)
          )
        `)
        .in("status", ["waiting", "active", "drafting"])
        .order("created_at", { ascending: false })
        .limit(10)

      if (matchesError) {
        console.error("[v0] Error loading matches:", matchesError)
      } else {
        console.log("[v0] Loaded matches:", matchesData?.length || 0)
      }

      const { data: players, error: playersError } = await supabase
        .from("users")
        .select("id, username, elo_rating")
        .order("elo_rating", { ascending: false })
        .limit(20)

      if (playersError) {
        console.error("[v0] Error loading players:", playersError)
      } else {
        console.log("[v0] Loaded players:", players?.length || 0)
      }

      const { data: completedMatchesData, error: completedError } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          status,
          created_at
        `)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5)

      if (completedError) {
        console.error("[v0] Error loading completed matches:", completedError)
      } else {
        console.log("[v0] Loaded completed matches:", completedMatchesData?.length || 0)
      }

      const { data: matchResultsData, error: resultsError } = await supabase
        .from("match_results")
        .select(`
          match_id,
          team1_score,
          team2_score,
          winning_team,
          validated_at
        `)
        .order("validated_at", { ascending: false })
        .limit(10)

      if (resultsError) {
        console.error("[v0] Error loading match results:", resultsError)
      } else {
        console.log("[v0] Loaded match results:", matchResultsData?.length || 0)
      }

      const formattedGames: LiveGame[] = (matchesData || [])
        .map((match: any) => {
          const participants = match.match_participants || []
          const players = participants.map((p: any) => p.users).filter(Boolean)

          let gameState: "lobby" | "drafting" | "scoring" = "lobby"
          const isCompleted = false

          if (match.description) {
            try {
              const description = JSON.parse(match.description)
              if (description.draft_state?.status === "completed") {
                gameState = "scoring"
              } else if (description.draft_state?.status === "in_progress") {
                gameState = "drafting"
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }

          // Skip completed matches
          if (match.status === "completed") {
            return null
          }

          // Determine game state based on status and participants
          if (match.status === "drafting" && participants.length === match.max_participants) {
            gameState = "drafting"
          } else if (match.status === "scoring") {
            gameState = "scoring"
          }

          return {
            id: match.id,
            name: match.name,
            match_type: match.match_type,
            status: match.status,
            participants: participants.length,
            max_participants: match.max_participants || 8,
            created_at: match.created_at,
            description: match.description,
            game_state: gameState,
            players: players.slice(0, 8).map((player: any) => ({
              id: player.id,
              username: player.username || player.account_name || "Unknown",
              elo_rating: player.elo_rating || 1200,
            })),
          }
        })
        .filter(Boolean) as LiveGame[]

      console.log("[v0] Formatted games:", formattedGames)
      setLiveGames(formattedGames)

      const activePlayersSet = new Set()
      const activePlayersData: ActiveELOPlayer[] = []

      formattedGames.forEach((game) => {
        game.players.forEach((player) => {
          if (!activePlayersSet.has(player.id)) {
            activePlayersSet.add(player.id)
            activePlayersData.push({
              id: player.id,
              username: player.username,
              elo_rating: player.elo_rating,
              status: game.status === "drafting" ? "drafting" : "in_match",
              current_match_id: game.id,
            })
          }
        })
      })

      if (players) {
        players.forEach((player) => {
          if (!activePlayersSet.has(player.id)) {
            activePlayersData.push({
              id: player.id,
              username: player.username,
              elo_rating: player.elo_rating,
              status: "online",
            })
          }
        })
      }

      activePlayersData.sort((a, b) => b.elo_rating - a.elo_rating)

      const formattedTopPlayers: TopPlayer[] = (players || []).slice(0, 5).map((player: any) => ({
        id: player.id,
        username: player.username,
        elo_rating: player.elo_rating,
        recent_change: Math.floor(Math.random() * 40) - 20, // Mock recent change
      }))

      const resultsMap = new Map()
      if (matchResultsData) {
        matchResultsData.forEach((result: any) => {
          resultsMap.set(result.match_id, result)
        })
      }

      const formattedLiveScores: LiveScore[] = (completedMatchesData || []).map((match: any) => {
        const result = resultsMap.get(match.id)

        return {
          id: match.id,
          name: match.name,
          status: match.status,
          team1_score: result?.team1_score || 0,
          team2_score: result?.team2_score || 0,
          team1_captain: "Team 1",
          team2_captain: "Team 2",
          winner: result?.winning_team === 1 ? "Team 1" : result?.winning_team === 2 ? "Team 2" : "TBD",
          created_at: match.created_at,
        }
      })

      console.log("[v0] Formatted live scores:", formattedLiveScores)

      setTopPlayers(formattedTopPlayers)
      setActiveELOPlayers(activePlayersData.slice(0, 10))
      setLiveScores(formattedLiveScores)
      setCompletedMatches(completedMatchesData || [])
    } catch (error) {
      console.error("[v0] Error loading real-time data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRealTimeData()

    const interval = setInterval(loadRealTimeData, 120000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 pt-20">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            TUG E-Sport Lobbies
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Compete in ELO-ranked e-sport lobbies, earn rewards, and climb the leaderboards
          </p>
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
            <TrendingUp className="h-3 w-3 mr-1" />
            ELO Rankings
          </Badge>

          <div className="pt-4">
            <UnifiedGameCreator />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-8 relative z-10">
        <Card className="gaming-card bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Live Games</CardTitle>
                  <CardDescription>Active lobbies, drafts, and scoring games</CardDescription>
                </div>
              </div>
              <Link href="/leagues">
                <Button variant="outline" className="gaming-button-secondary bg-transparent">
                  View All Games
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : liveGames.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {liveGames.map((game) => {
                  const getGameStateInfo = () => {
                    switch (game.game_state) {
                      case "lobby":
                        return {
                          badge: { text: "Open Lobby", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
                          icon: <Users className="h-3 w-3 mr-1" />,
                          action: { text: "Join Lobby", href: `/leagues/lobby/${game.id}` },
                        }
                      case "drafting":
                        return {
                          badge: {
                            text: "Drafting",
                            className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                          },
                          icon: <Timer className="h-3 w-3 mr-1" />,
                          action: { text: "Watch Draft", href: `/draft/room/${game.id}` },
                        }
                      case "scoring":
                        return {
                          badge: { text: "Scoring", className: "bg-green-500/20 text-green-400 border-green-500/30" },
                          icon: <Trophy className="h-3 w-3 mr-1" />,
                          action: { text: "Submit Score", href: `/draft/score/${game.id}` },
                        }
                      default:
                        return {
                          badge: {
                            text: "Live",
                            className: "bg-gaming-success/20 text-gaming-success border-gaming-success/30",
                          },
                          icon: <Timer className="h-3 w-3 mr-1" />,
                          action: { text: "View Game", href: `/leagues/lobby/${game.id}` },
                        }
                    }
                  }

                  const stateInfo = getGameStateInfo()

                  return (
                    <div
                      key={game.id}
                      className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg overflow-hidden border-2 border-slate-600"
                      style={{
                        backgroundImage: `
                          linear-gradient(90deg, transparent 0%, transparent 48%, #64748b 48%, #64748b 52%, transparent 52%, transparent 100%),
                          linear-gradient(0deg, transparent 0%, transparent 48%, #64748b 48%, #64748b 52%, transparent 52%, transparent 100%),
                          repeating-linear-gradient(45deg, transparent, transparent 8px, #475569 8px, #475569 10px),
                          repeating-linear-gradient(-45deg, transparent, transparent 8px, #475569 8px, #475569 10px)
                        `,
                        backgroundSize: "20px 20px, 20px 20px, 28px 28px, 28px 28px",
                      }}
                    >
                      {/* Hockey net frame */}
                      <div className="absolute inset-0 border-4 border-red-600 rounded-lg"></div>
                      <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"></div>
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-600"></div>
                      <div className="absolute top-0 bottom-0 right-0 w-1 bg-red-600"></div>

                      {/* Content overlay */}
                      <div className="relative bg-black/60 backdrop-blur-sm p-4 h-full">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-white drop-shadow-lg">{game.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-black/50 text-white border-white/30">
                                {game.match_type?.replace("_draft", "").toUpperCase() || "DRAFT"}
                              </Badge>
                              <Badge variant="secondary" className={`${stateInfo.badge.className} bg-opacity-80`}>
                                {stateInfo.icon}
                                {stateInfo.badge.text}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold">
                              {game.participants}/{game.max_participants} players
                            </span>
                          </div>
                          {game.players.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-gray-300 font-medium">
                                {game.game_state === "lobby" ? "Waiting:" : "Players:"}
                              </div>
                              <div className="flex items-center gap-2">
                                {game.players.slice(0, 2).map((player, index) => (
                                  <div key={player.id} className="flex items-center gap-1">
                                    <Avatar className="h-6 w-6 border border-white/30">
                                      <AvatarFallback className="text-xs bg-slate-700 text-white">
                                        {player.username.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="text-xs">
                                      <div className="font-bold text-white">{player.username}</div>
                                      <div className="text-gray-300">{player.elo_rating}</div>
                                    </div>
                                  </div>
                                ))}
                                {game.players.length > 2 && (
                                  <div className="text-xs text-gray-300 font-medium">
                                    +{game.players.length - 2} more
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <Link href={stateInfo.action.href}>
                            <Button
                              size="sm"
                              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold border-2 border-white/30 shadow-lg"
                            >
                              {stateInfo.icon}
                              {stateInfo.action.text}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No live games at the moment</p>
                <Link href="/leagues">
                  <Button className="mt-4 gaming-button-primary">
                    Create New Game
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gaming-card bg-gradient-to-r from-secondary/5 via-accent/5 to-primary/5 border-secondary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Active ELO Players</CardTitle>
                  <CardDescription>Players currently online and in matches</CardDescription>
                </div>
              </div>
              <Link href="/leaderboard">
                <Button variant="outline" className="gaming-button-secondary bg-transparent">
                  View All Players
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : activeELOPlayers.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {activeELOPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{player.username}</div>
                        <div className="text-xs text-muted-foreground">ELO: {player.elo_rating}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          player.status === "in_match"
                            ? "bg-red-500/20 text-red-500"
                            : player.status === "drafting"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-green-500/20 text-green-500"
                        }
                      >
                        {player.status === "in_match"
                          ? "In Match"
                          : player.status === "drafting"
                            ? "Drafting"
                            : "Online"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active players at the moment</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gaming-card bg-gradient-to-r from-gaming-accent/5 via-gaming-warning/5 to-gaming-danger/5 border-gaming-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gaming-accent/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-gaming-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl">Live Results</CardTitle>
                  <CardDescription>Real-time match results and scores</CardDescription>
                </div>
              </div>
              <Link href="/analytics">
                <Button variant="outline" className="gaming-button-secondary bg-transparent">
                  View All Results
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : liveScores.length > 0 ? (
              <div className="space-y-4">
                {liveScores.map((score) => (
                  <Card key={score.id} className="gaming-card">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{score.name}</h4>
                          <Badge
                            variant="secondary"
                            className={
                              score.status === "completed"
                                ? "bg-green-500/20 text-green-500"
                                : "bg-blue-500/20 text-blue-500"
                            }
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {score.status === "completed" ? "Completed" : "In Progress"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 rounded bg-blue-500/10 border border-blue-500/20">
                            <div className="font-medium text-sm">{score.team1_captain}</div>
                            <div className="text-2xl font-bold text-blue-500">{score.team1_score}</div>
                            <div className="text-xs text-muted-foreground">Team 1 Score</div>
                          </div>
                          <div className="text-center p-3 rounded bg-red-500/10 border border-red-500/20">
                            <div className="font-medium text-sm">{score.team2_captain}</div>
                            <div className="text-2xl font-bold text-red-500">{score.team2_score}</div>
                            <div className="text-xs text-muted-foreground">Team 2 Score</div>
                          </div>
                        </div>

                        {score.status === "completed" && (
                          <div className="text-center p-3 rounded bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center justify-center gap-2">
                              <Trophy className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600">Winner: {score.winner}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDateEST(score.created_at)}</span>
                          <Link href={`/analytics`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No recent match results</p>
                <Link href="/leagues">
                  <Button className="mt-4 gaming-button-primary">
                    Start New Match
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gaming-card bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl">Top ELO Players</CardTitle>
                  <CardDescription>Highest ranked players on the platform</CardDescription>
                </div>
              </div>
              <Link href="/leaderboard">
                <Button variant="outline" className="gaming-button-secondary bg-transparent">
                  Full Leaderboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {topPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{player.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {player.recent_change > 0 ? "+" : ""}
                          {player.recent_change} recent
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{player.elo_rating}</div>
                      <div
                        className={`text-xs flex items-center gap-1 ${
                          player.recent_change > 0
                            ? "text-green-600"
                            : player.recent_change < 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {player.recent_change > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : player.recent_change < 0 ? (
                          <TrendingUp className="h-3 w-3 rotate-180" />
                        ) : null}
                        ELO
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="gaming-gradient rounded-xl p-8 mb-8 border border-primary/20">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <DollarSign className="h-8 w-8 text-white" />
              <h2 className="text-3xl font-bold text-white">Start Earning Today</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">$25</div>
                <div className="text-sm text-white/80">Starting Balance</div>
                <div className="text-xs text-white/60 mt-1">Free when you sign up</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">$5</div>
                <div className="text-sm text-white/80">Per Game Played</div>
                <div className="text-xs text-white/60 mt-1">Automatic rewards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">∞</div>
                <div className="text-sm text-white/80">Earning Potential</div>
                <div className="text-xs text-white/60 mt-1">No limits on winnings</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href="/auth/sign-up">
                  Get Your $25 Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10 bg-transparent"
              >
                <Link href="/leagues">
                  <Crown className="h-4 w-4 mr-2" />
                  Join ELO Draft
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <QuickStats />
        </Suspense>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="gaming-card group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/40">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Auction Drafts</CardTitle>
                  <CardDescription>Real-time bidding system</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Participate in live auction drafts with dynamic bidding, player pools, and team roster management.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Live</span> drafts available
                </div>
                <Link href="/leagues">
                  <Button
                    size="sm"
                    variant="outline"
                    className="group-hover:bg-primary group-hover:text-primary-foreground gaming-button-secondary bg-transparent"
                  >
                    Join Draft
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="gaming-card group hover:shadow-lg transition-all duration-200 border-2 hover:border-secondary/40">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <CardTitle>Live Betting</CardTitle>
                  <CardDescription>Real-time odds and markets</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bet on games with live odds, player props, and comprehensive betting markets with instant payouts.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Active</span> betting markets
                </div>
                <Link href="/betting">
                  <Button
                    size="sm"
                    variant="outline"
                    className="group-hover:bg-primary group-hover:text-primary-foreground gaming-button-secondary bg-transparent"
                  >
                    Place Bets
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="gaming-card group hover:shadow-lg transition-all duration-200 border-2 hover:border-accent/40">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle>ELO Rankings</CardTitle>
                  <CardDescription>Skill-based matchmaking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Track your skill progression with ELO ratings, compete in ranked matches, and climb the leaderboards.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Ranked</span> matchmaking
                </div>
                <Link href="/leaderboard">
                  <Button
                    size="sm"
                    variant="outline"
                    className="group-hover:bg-primary group-hover:text-primary-foreground gaming-button-secondary bg-transparent"
                  >
                    View Rankings
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="gaming-card group hover:shadow-lg transition-all duration-200 border-2 hover:border-gaming-accent/40">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gaming-accent/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-gaming-accent" />
                </div>
                <div>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>Performance insights</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Deep analytics with CSV imports, player performance charts, and comprehensive statistics tracking.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Advanced</span> analytics
                </div>
                <Link href="/analytics">
                  <Button
                    size="sm"
                    variant="outline"
                    className="group-hover:bg-primary group-hover:text-primary-foreground gaming-button-secondary bg-transparent"
                  >
                    View Analytics
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="gaming-card group hover:shadow-lg transition-all duration-200 border-2 hover:border-gaming-danger/40">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gaming-danger/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-gaming-danger" />
                </div>
                <div>
                  <CardTitle>Scheduling</CardTitle>
                  <CardDescription>Game and event management</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Automated scheduling system with PR announcements, event notifications, and league management.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Automated</span> scheduling
                </div>
                <Link href="/schedule">
                  <Button
                    size="sm"
                    variant="outline"
                    className="group-hover:bg-primary group-hover:text-primary-foreground gaming-button-secondary bg-transparent"
                  >
                    View Schedule
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="gaming-card group hover:shadow-lg transition-all duration-200 border-2 hover:border-gaming-accent/40">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gaming-accent/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-gaming-accent" />
                </div>
                <div>
                  <CardTitle>Player Pools</CardTitle>
                  <CardDescription>Comprehensive player database</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Extensive player database with statistics, performance metrics, and advanced filtering capabilities.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Extensive</span> player database
                </div>
                <Link href="/players">
                  <Button
                    size="sm"
                    variant="outline"
                    className="group-hover:bg-primary group-hover:text-primary-foreground gaming-button-secondary bg-transparent"
                  >
                    Browse Players
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Suspense
              fallback={
                <Card>
                  <CardHeader>
                    <Skeleton className="h-4 w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              }
            >
              <RecentActivity />
            </Suspense>
          </div>

          <div className="space-y-6">
            <Suspense
              fallback={
                <Card>
                  <CardHeader>
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                </Card>
              }
            >
              <UpcomingEvents />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
