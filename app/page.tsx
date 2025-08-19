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

interface LiveDraft {
  id: string
  name: string
  match_type: string
  status: string
  participants: number
  max_participants: number
  created_at: string
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
  const [liveDrafts, setLiveDrafts] = useState<LiveDraft[]>([])
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([])
  const [activeELOPlayers, setActiveELOPlayers] = useState<ActiveELOPlayer[]>([])
  const [liveScores, setLiveScores] = useState<LiveScore[]>([])
  const [completedMatches, setCompletedMatches] = useState<CompletedMatch[]>([])

  const loadRealTimeData = async () => {
    if (!isSupabaseConfigured) {
      console.log("[v0] Supabase not configured, using mock data")
      setLoading(false)
      return
    }

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
          match_participants!inner(
            users!inner(id, username, elo_rating)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10)

      if (matchesError) {
        console.error("[v0] Error loading matches:", matchesError)
      } else {
        console.log("[v0] Loaded matches:", matchesData?.length || 0)
        console.log("[v0] Matches data:", matchesData)
      }

      // Load players
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
          match_duration,
          validated_at
        `)
        .order("validated_at", { ascending: false })
        .limit(10)

      if (resultsError) {
        console.error("[v0] Error loading match results:", resultsError)
      } else {
        console.log("[v0] Loaded match results:", matchResultsData?.length || 0)
      }

      const formattedDrafts: LiveDraft[] = (matchesData || []).map((match: any) => {
        const participants = match.match_participants || []
        const players = participants.map((p: any) => p.users).filter(Boolean)

        return {
          id: match.id,
          name: match.name,
          match_type: match.match_type,
          status: match.status,
          participants: participants.length,
          max_participants: match.max_participants || 8,
          created_at: match.created_at,
          players: players,
        }
      })

      console.log("[v0] Formatted drafts:", formattedDrafts)

      const activePlayersSet = new Set()
      const activePlayersData: ActiveELOPlayer[] = []

      formattedDrafts.forEach((draft) => {
        draft.players.forEach((player) => {
          if (!activePlayersSet.has(player.id)) {
            activePlayersSet.add(player.id)
            activePlayersData.push({
              id: player.id,
              username: player.username,
              elo_rating: player.elo_rating,
              status: draft.status === "drafting" ? "drafting" : "in_match",
              current_match_id: draft.id,
            })
          }
        })
      })

      // Add other online players not in matches
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

      // Sort by ELO rating
      activePlayersData.sort((a, b) => b.elo_rating - a.elo_rating)

      // Format top players
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
          team1_captain: "Team 1", // Mock data - could be enhanced with actual team data
          team2_captain: "Team 2", // Mock data - could be enhanced with actual team data
          winner: result?.winning_team === 1 ? "Team 1" : result?.winning_team === 2 ? "Team 2" : "TBD",
          created_at: match.created_at,
        }
      })

      console.log("[v0] Formatted live scores:", formattedLiveScores)

      setLiveDrafts(formattedDrafts)
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

    // Set up real-time updates
    const interval = setInterval(loadRealTimeData, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pt-20">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
            TUG E-Sport Lobbies
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Compete in ELO-ranked e-sport lobbies, earn rewards, and climb the leaderboards
          </p>
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
            <TrendingUp className="h-3 w-3 mr-1" />
            ELO Rankings
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-8 relative z-10">
        <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 border border-blue-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Live Draft Rooms</CardTitle>
                  <CardDescription>Join active ELO drafts happening now</CardDescription>
                </div>
              </div>
              <Link href="/leagues">
                <Button variant="outline" className="bg-transparent">
                  View All Drafts
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
            ) : liveDrafts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {liveDrafts.map((draft) => (
                  <Card key={draft.id} className="bg-background/50 border-border/50">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{draft.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {draft.match_type?.replace("_draft", "").toUpperCase() || "DRAFT"}
                            </Badge>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                              <Timer className="h-3 w-3 mr-1" />
                              Live
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            {draft.participants}/{draft.max_participants} players
                          </span>
                          <span>{new Date(draft.created_at).toLocaleTimeString()}</span>
                        </div>
                        {draft.players.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">Top Players:</div>
                            <div className="flex items-center gap-2">
                              {draft.players.slice(0, 2).map((player, index) => (
                                <div key={player.id} className="flex items-center gap-1">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {player.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="text-xs">
                                    <div className="font-medium">{player.username}</div>
                                    <div className="text-muted-foreground">{player.elo_rating}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <Link href={`/leagues/lobby/${draft.id}`}>
                          <Button size="sm" className="w-full">
                            <Eye className="h-3 w-3 mr-1" />
                            Join Lobby
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No live drafts at the moment</p>
                <Link href="/leagues">
                  <Button className="mt-4">
                    Create New Draft
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Active ELO Players</CardTitle>
                  <CardDescription>Players currently online and in matches</CardDescription>
                </div>
              </div>
              <Link href="/leaderboard">
                <Button variant="outline" className="bg-transparent">
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

        <Card className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 border border-orange-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Live Results</CardTitle>
                  <CardDescription>Real-time match results and scores</CardDescription>
                </div>
              </div>
              <Link href="/analytics">
                <Button variant="outline" className="bg-transparent">
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
                  <Card key={score.id} className="bg-background/50 border-border/50">
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
                          <span>{new Date(score.created_at).toLocaleString()}</span>
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
                  <Button className="mt-4">
                    Start New Match
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Top ELO Players</CardTitle>
                  <CardDescription>Highest ranked players on the platform</CardDescription>
                </div>
              </div>
              <Link href="/leaderboard">
                <Button variant="outline" className="bg-transparent">
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

        <div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border border-green-500/20 rounded-xl p-8 mb-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <DollarSign className="h-8 w-8 text-green-500" />
              <h2 className="text-3xl font-bold">Start Earning Today</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500 mb-2">$25</div>
                <div className="text-sm text-muted-foreground">Starting Balance</div>
                <div className="text-xs text-muted-foreground mt-1">Free when you sign up</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500 mb-2">$50</div>
                <div className="text-sm text-muted-foreground">Per Game Played</div>
                <div className="text-xs text-muted-foreground mt-1">Automatic rewards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500 mb-2">∞</div>
                <div className="text-sm text-muted-foreground">Earning Potential</div>
                <div className="text-xs text-muted-foreground mt-1">No limits on winnings</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button asChild size="lg" className="bg-green-500 hover:bg-green-600">
                <Link href="/auth/sign-up">
                  Get Your $25 Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
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
          <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-blue-500" />
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
                    className="group-hover:bg-primary group-hover:text-primary-foreground bg-transparent"
                  >
                    Join Draft
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-green-500" />
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
                    className="group-hover:bg-primary group-hover:text-primary-foreground bg-transparent"
                  >
                    Place Bets
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
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
                    className="group-hover:bg-primary group-hover:text-primary-foreground bg-transparent"
                  >
                    View Rankings
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
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
                    className="group-hover:bg-primary group-hover:text-primary-foreground bg-transparent"
                  >
                    View Analytics
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-red-500" />
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
                    className="group-hover:bg-primary group-hover:text-primary-foreground bg-transparent"
                  >
                    View Schedule
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-cyan-500" />
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
                    className="group-hover:bg-primary group-hover:text-primary-foreground bg-transparent"
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
