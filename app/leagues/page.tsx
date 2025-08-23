"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Users, Calendar, Trophy, DollarSign, Swords, Crown, Play, TrendingUp, Gavel, Zap } from "lucide-react"
import Link from "next/link"
import { UserCreatedTeams } from "@/components/leagues/user-created-teams"
import { UnifiedDraftSelector } from "@/components/draft/unified-draft-selector"
import { SoloQueuePool } from "@/components/leagues/solo-queue-pool"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context" // Fixed import to use existing useAuth instead of non-existent useUser

interface League {
  id: string
  name: string
  description: string
  max_teams: number
  current_teams: number
  team_price: number
  prize_pool: number
  draft_date: string
  status: string
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
  match_type?: string // Added to distinguish between lobbies and drafts
  user_is_participant: boolean // Added to check user participation
  participant_names: string
  created_at: string
  game_number?: number // Added to include game number
}

export default function LeaguesPage() {
  const [availableLeagues, setAvailableLeagues] = useState<League[]>([])
  const [activeWagerMatches, setActiveWagerMatches] = useState<WagerMatch[]>([])
  const [activeCaptainDrafts, setActiveCaptainDrafts] = useState<CaptainDraft[]>([])
  const [activeElos, setActiveElos] = useState<
    Array<{ id: string; username: string; elo_rating: number; status: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { user } = useAuth() // Fixed to use useAuth instead of useUser

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: leagues } = await supabase
        .from("leagues")
        .select("*")
        .eq("status", "registration")
        .order("created_at", { ascending: false })
        .limit(6)

      if (leagues) {
        setAvailableLeagues(
          leagues.map((league) => ({
            id: league.id,
            name: league.name,
            description: league.description || "Fantasy league competition",
            max_teams: league.max_teams || 12,
            current_teams: league.current_teams || 0,
            team_price: league.entry_fee || 50,
            prize_pool: league.prize_pool || 500,
            draft_date: league.draft_date || new Date().toISOString(),
            status: league.status,
          })),
        )
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
            prize_pool: participantCount * 10, // Updated to $10 per participant
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
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
          <p className="text-muted-foreground">Join matches, wager in 1v1 battles, and earn real money</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Join Matches</h3>
              <p className="text-xs text-muted-foreground">Compete for prize pools</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Swords className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Wager Matches</h3>
              <p className="text-xs text-muted-foreground">1v1 battles with stakes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                ELO Draft - Snake Draft Strategy!
                <Badge variant="secondary" className="bg-green-500/20 text-green-700 border-green-500/30">
                  FREE
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">FREE + $10 per game</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Premade Teams</h3>
              <p className="text-xs text-muted-foreground">Skip the draft</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border-green-500/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Gavel className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Month-Long Tournaments</h3>
              <p className="text-xs text-muted-foreground">Host extended tournaments</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border-blue-500/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Solo Queue</h3>
              <p className="text-xs text-muted-foreground">Automatic matchmaking for instant games</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              Active ELOs
            </CardTitle>
            <CardDescription>Players currently online and in matches</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-12"></div>
                  </div>
                ))}
              </div>
            ) : activeElos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active players found</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {activeElos.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{player.username}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${player.status === "online" ? "bg-green-500" : "bg-blue-500"}`}
                        ></div>
                        {player.status === "online" ? "Online" : "In Match"}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-bold">
                      {player.elo_rating}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-4 border-t mt-4">
              <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
                <Link href="/leaderboard">
                  <Trophy className="h-4 w-4 mr-2" />
                  View Full ELO Leaderboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="browse">Browse Matches</TabsTrigger>
            <TabsTrigger value="solo-queue">Solo Queue</TabsTrigger>
            <TabsTrigger value="tournaments">Month-Long Tournaments</TabsTrigger>
            <TabsTrigger value="wager">Wager Matches</TabsTrigger>
            <TabsTrigger value="premade">Premade Teams</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Start Earning Today!</h3>
                  <p className="text-sm text-muted-foreground">
                    Join matches to compete for prize pools • Earn $10 per game played • $25 per tournament • Start with
                    $25 bonus
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-500">$10</div>
                  <div className="text-xs text-muted-foreground">per game played</div>
                </div>
                <Button asChild size="lg">
                  <Link href="/auth/sign-up">Start Earning</Link>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Available Matches</h2>
                <p className="text-muted-foreground">Join a match and start competing</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Available Draft Matches
                </CardTitle>
                <CardDescription>
                  All available draft lobbies and active matches you can join or spectate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeCaptainDrafts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No draft matches available</p>
                      <p className="text-sm">Create a new draft using the selector below!</p>
                    </div>
                  ) : (
                    activeCaptainDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            <div className="font-medium">{draft.name}</div>
                            <Badge variant="outline">{draft.format}</Badge>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-700 border-green-500/30">
                              FREE
                            </Badge>
                          </div>
                          <Badge
                            variant={
                              draft.status === "waiting"
                                ? "secondary"
                                : draft.status === "active" || draft.status === "in_progress"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {draft.status === "waiting"
                              ? "Waiting for Players"
                              : draft.status === "active" || draft.status === "in_progress"
                                ? "In Progress"
                                : draft.status === "drafting"
                                  ? "Drafting"
                                  : draft.status}
                          </Badge>
                          {draft.participant_names && (
                            <div className="text-xs text-muted-foreground max-w-xs truncate">
                              Players: {draft.participant_names}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-green-500">${draft.prize_pool}</div>
                            <div className="text-xs text-muted-foreground">total prize</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {draft.participants}/{draft.max_participants}
                            </div>
                            <div className="text-xs text-muted-foreground">players</div>
                          </div>
                          <Button size="sm" asChild>
                            <Link href={`/leagues/lobby/${draft.id}`}>
                              <Play className="h-3 w-3 mr-1" />
                              {draft.status === "waiting"
                                ? "Join Match"
                                : draft.user_is_participant
                                  ? "Rejoin"
                                  : "Spectate"}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableLeagues.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No league matches available</h3>
                  <p className="text-sm mb-4">Check back later for new league matches!</p>
                </div>
              ) : (
                availableLeagues.map((league) => (
                  <Card key={league.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{league.name}</CardTitle>
                          <CardDescription>{league.description}</CardDescription>
                        </div>
                        <Badge variant={league.status === "registration" ? "secondary" : "outline"}>
                          {league.status === "registration" ? "Open" : "Closed"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {league.current_teams}/{league.max_teams} teams
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${league.team_price} team cost</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <span>${league.prize_pool} prize</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(league.draft_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Spots filled</span>
                          <span>
                            {league.current_teams}/{league.max_teams}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(league.current_teams / league.max_teams) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button asChild className="flex-1" disabled={league.status !== "registration"}>
                          <Link href={`/leagues/${league.id}/signup`}>
                            {league.status === "registration" ? "Join Match" : "View Match"}
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/leagues/${league.id}`}>Details</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Open Lobbies - Join Now!
                </CardTitle>
                <CardDescription>
                  Active lobbies waiting for players. Join instantly and start playing when full!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeCaptainDrafts.filter(
                    (draft) => draft.status === "waiting" && draft.participants < draft.max_participants,
                  ).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No open lobbies available</p>
                      <p className="text-sm">Create a lobby using the draft selector!</p>
                    </div>
                  ) : (
                    activeCaptainDrafts
                      .filter((draft) => draft.status === "waiting" && draft.participants < draft.max_participants)
                      .map((draft) => (
                        <div
                          key={draft.id}
                          className="flex items-center justify-between p-4 border-2 border-green-500/20 bg-green-500/5 rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-yellow-500" />
                              <div className="font-medium">{draft.name}</div>
                              <Badge variant="outline">{draft.format}</Badge>
                              <Badge variant="secondary" className="bg-green-500/20 text-green-700 border-green-500/30">
                                FREE
                              </Badge>
                            </div>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                              {draft.max_participants - draft.participants} spots left
                            </Badge>
                            {draft.participant_names && (
                              <div className="text-xs text-muted-foreground">Current: {draft.participant_names}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-green-500">$10</div>
                              <div className="text-xs text-muted-foreground">per player</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600">
                                {draft.participants}/{draft.max_participants}
                              </div>
                              <div className="text-xs text-muted-foreground">players</div>
                            </div>
                            <Button size="sm" asChild className="bg-green-600 hover:bg-green-700">
                              <Link href={`/leagues/lobby/${draft.id}`}>
                                <Play className="h-3 w-3 mr-1" />
                                Join Now
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    ELO Draft - Snake Draft Strategy!
                    <Badge variant="secondary" className="bg-green-500/20 text-green-700 border-green-500/30">
                      FREE
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Snake draft picks players • Strategic team building • Earn $10 per game played • No entry fees!
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-500">$10</div>
                  <div className="text-xs text-muted-foreground">per game played</div>
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <Card className="max-w-lg mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Crown className="h-6 w-6 text-yellow-500" />
                    Join ELO Draft
                  </CardTitle>
                  <CardDescription>
                    Choose from 1v1 to 6v6 formats. All FREE with $10 rewards per player!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UnifiedDraftSelector buttonText="Select Draft Format" buttonSize="lg" className="w-full" />
                  <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        FREE Entry
                      </Badge>
                      <span>No cost to join</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        $10 Reward
                      </Badge>
                      <span>Per player</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="solo-queue" className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Solo Queue - Automatic Matchmaking</h3>
                  <p className="text-sm text-muted-foreground">
                    Join the pool and get automatically matched • No lobby creation needed • Fair ELO-based matching •
                    Instant games when pool fills
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-500">Auto</div>
                  <div className="text-xs text-muted-foreground">matchmaking</div>
                </div>
              </div>
            </div>
            <SoloQueuePool />
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Month-Long Tournaments</h3>
                  <p className="text-sm text-muted-foreground">
                    Host extended tournaments • Players buy team slots • Auction draft system • Compete over
                    weeks/months • Large prize pools
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-500">$100+</div>
                  <div className="text-xs text-muted-foreground">typical buy-in</div>
                </div>
                <Button asChild>
                  <Link href="/leagues/tournaments/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tournament
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Host Tournament
                  </CardTitle>
                  <CardDescription>Create your own month-long tournament with team purchasing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="text-2xl font-bold text-purple-500">$1000+</div>
                      <div className="text-sm text-muted-foreground">Potential prize pools</div>
                    </div>
                    <Button className="w-full" asChild>
                      <Link href="/leagues/tournaments/create">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Tournament
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="h-5 w-5" />
                    Join Tournament
                  </CardTitle>
                  <CardDescription>Buy team slots and participate in auction drafts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="text-2xl font-bold text-green-500">$100</div>
                      <div className="text-sm text-muted-foreground">Average buy-in</div>
                    </div>
                    <Button className="w-full" variant="secondary" asChild>
                      <Link href="/leagues/tournaments">
                        <Users className="h-4 w-4 mr-2" />
                        Browse Tournaments
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>How Month-Long Tournaments Work</CardTitle>
                <CardDescription>Extended competition format with team ownership and auction drafts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4 border rounded-lg">
                    <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">1. Buy Team</h4>
                    <p className="text-sm text-muted-foreground">Purchase a team slot with buy-in fee</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Gavel className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">2. Auction Draft</h4>
                    <p className="text-sm text-muted-foreground">Bid on players to build your roster</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">3. Compete</h4>
                    <p className="text-sm text-muted-foreground">Play matches over weeks/months</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Trophy className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">4. Win Prizes</h4>
                    <p className="text-sm text-muted-foreground">Top performers share prize pool</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wager" className="space-y-6">
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Swords className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Wager Matches - High Stakes 1v1!</h3>
                  <p className="text-sm text-muted-foreground">
                    Challenge players directly • Winner takes 75% of pot • Quick matches • Instant rewards • Test your
                    skills
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-500">75%</div>
                  <div className="text-xs text-muted-foreground">winner takes pot</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Join Wager Match
                  </CardTitle>
                  <CardDescription>Find and join existing wager matches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Wager Amount</label>
                      <div className="flex gap-2 mt-1">
                        <Button variant="outline" size="sm">
                          $25
                        </Button>
                        <Button variant="outline" size="sm">
                          $50
                        </Button>
                        <Button variant="outline" size="sm">
                          $100
                        </Button>
                        <Button variant="outline" size="sm">
                          Custom
                        </Button>
                      </div>
                    </div>
                    <Button className="w-full bg-transparent" variant="outline">
                      <Swords className="h-4 w-4 mr-2" />
                      Browse Wager Matches
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Quick Wager
                  </CardTitle>
                  <CardDescription>Join the next available wager match automatically</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="text-2xl font-bold text-green-500">$5</div>
                      <div className="text-sm text-muted-foreground">Average wager size</div>
                    </div>
                    <Button className="w-full" variant="secondary">
                      <Users className="h-4 w-4 mr-2" />
                      Find Opponent
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Active Wager Matches</CardTitle>
                <CardDescription>Join open wager matches or watch ongoing battles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeWagerMatches.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Swords className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No active wager matches</p>
                      <p className="text-sm">Create the first wager match!</p>
                    </div>
                  ) : (
                    activeWagerMatches.map((match) => (
                      <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{match.player1}</div>
                            <span className="text-muted-foreground">vs</span>
                            <div className="font-medium">{match.player2 || "Open Slot"}</div>
                          </div>
                          <Badge
                            variant={
                              match.status === "open"
                                ? "secondary"
                                : match.status === "in_progress"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {match.status === "open" ? "Open" : match.status === "in_progress" ? "Live" : "Waiting"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-green-500">${match.pot}</div>
                            <div className="text-xs text-muted-foreground">wager</div>
                          </div>
                          <Button size="sm" variant={match.status === "open" ? "default" : "outline"}>
                            {match.status === "open" ? "Join Wager" : match.status === "in_progress" ? "Watch" : "View"}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="premade" className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Your Teams</h3>
                  <p className="text-sm text-muted-foreground">
                    Compete with teams you've created. Rosters are filled through invitations only - no open
                    registration.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/settings?tab=teams">
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Teams
                  </Link>
                </Button>
              </div>
            </div>
            <UserCreatedTeams />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
