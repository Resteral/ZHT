"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Crown, Trophy, Medal, Star, TrendingUp, TrendingDown, Zap, Target } from "lucide-react"
import { ProfileNameLink } from "@/components/profile/profile-name-link"
import { createClient } from "@/lib/supabase/client"

interface Player {
  id: string
  username: string
  elo_rating: number
  total_games: number
  wins: number
  losses: number
  recent_change: number
  rank: number
  badge: string
  tier: string
  goals: number
  assists: number
  saves: number
  shots: number
  avg_rating: number
}

interface Earner {
  id: string
  username: string
  total_earnings: number
  monthly_earnings: number
  rank: number
}

export default function LeaderboardPage() {
  const [eloPlayers, setEloPlayers] = useState<Player[]>([])
  const [topEarners, setTopEarners] = useState<Earner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboardData()
  }, [])

  const loadLeaderboardData = async () => {
    try {
      const supabase = createClient()

      const { data: players } = await supabase
        .from("users")
        .select(`
          id,
          username,
          elo_rating,
          total_games,
          wins,
          losses
        `)
        .not("elo_rating", "is", null)
        .order("elo_rating", { ascending: false })
        .limit(50)

      const { data: csvStats } = await supabase
        .from("match_results")
        .select(`
          csv_code,
          match_id,
          matches!inner(
            match_participants!inner(
              user_id,
              users!inner(username)
            )
          )
        `)
        .not("csv_code", "is", null)

      const { data: recentChanges } = await supabase
        .from("elo_history")
        .select("user_id, rating_change, created_at")
        .order("created_at", { ascending: false })

      const { data: earners } = await supabase
        .from("financial_transactions")
        .select(`
          user_id,
          users!inner(id, username),
          amount,
          created_at
        `)
        .eq("transaction_type", "reward")
        .order("amount", { ascending: false })

      if (players) {
        const formattedPlayers = players.map((player, index) => {
          const recentChange = recentChanges?.find((change) => change.user_id === player.id)?.rating_change || 0

          let totalGoals = 0,
            totalAssists = 0,
            totalSaves = 0,
            totalShots = 0,
            gameCount = 0

          csvStats?.forEach((match) => {
            if (match.csv_code) {
              const lines = match.csv_code.split("\n").filter((line) => line.trim())
              lines.forEach((line) => {
                const values = line.split(",")
                if (values.length >= 14) {
                  const playerId = values[1]?.split("-").pop()
                  if (playerId && player.username.toLowerCase().includes(playerId.slice(-4))) {
                    totalGoals += Number.parseInt(values[3]) || 0
                    totalAssists += Number.parseInt(values[4]) || 0
                    totalSaves += Number.parseInt(values[6]) || 0
                    totalShots += Number.parseInt(values[7]) || 0
                    gameCount++
                  }
                }
              })
            }
          })

          return {
            id: player.id,
            username: player.username,
            elo_rating: player.elo_rating || 1200,
            total_games: player.total_games || 0,
            wins: player.wins || 0,
            losses: player.losses || 0,
            recent_change: recentChange,
            rank: index + 1,
            badge: getELOBadge(player.elo_rating || 1200),
            tier: getELOTier(player.elo_rating || 1200),
            goals: totalGoals,
            assists: totalAssists,
            saves: totalSaves,
            shots: totalShots,
            avg_rating: gameCount > 0 ? ((totalGoals + totalAssists) / gameCount).toFixed(1) : 0,
          }
        })
        setEloPlayers(formattedPlayers)
      }

      if (earners) {
        const earningsMap = new Map()
        earners.forEach((transaction) => {
          const userId = transaction.user_id
          const existing = earningsMap.get(userId) || {
            id: userId,
            username: transaction.users.username,
            total_earnings: 0,
            monthly_earnings: 0,
          }
          existing.total_earnings += transaction.amount

          const transactionDate = new Date(transaction.created_at)
          const now = new Date()
          if (transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear()) {
            existing.monthly_earnings += transaction.amount
          }

          earningsMap.set(userId, existing)
        })

        const sortedEarners = Array.from(earningsMap.values())
          .sort((a, b) => b.total_earnings - a.total_earnings)
          .slice(0, 10)
          .map((earner, index) => ({ ...earner, rank: index + 1 }))

        setTopEarners(sortedEarners)
      }
    } catch (error) {
      console.error("Error loading leaderboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getELOBadge = (elo: number) => {
    if (elo >= 2400) return "Legendary"
    if (elo >= 2200) return "Grandmaster"
    if (elo >= 2000) return "Master"
    if (elo >= 1800) return "Diamond"
    if (elo >= 1600) return "Platinum"
    if (elo >= 1400) return "Gold"
    if (elo >= 1200) return "Silver"
    return "Bronze"
  }

  const getELOTier = (elo: number) => {
    if (elo >= 2400) return "legendary"
    if (elo >= 2200) return "grandmaster"
    if (elo >= 2000) return "master"
    if (elo >= 1800) return "diamond"
    if (elo >= 1600) return "platinum"
    if (elo >= 1400) return "gold"
    if (elo >= 1200) return "silver"
    return "bronze"
  }

  const getBadgeColor = (tier: string) => {
    switch (tier) {
      case "legendary":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
      case "grandmaster":
        return "bg-gradient-to-r from-red-500 to-orange-500 text-white"
      case "master":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
      case "diamond":
        return "bg-gradient-to-r from-cyan-400 to-blue-400 text-white"
      case "platinum":
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
      case "gold":
        return "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black"
      case "silver":
        return "bg-gradient-to-r from-gray-300 to-gray-400 text-black"
      default:
        return "bg-gradient-to-r from-amber-600 to-amber-700 text-white"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            TugLobbies Rankings
          </h1>
          <p className="text-muted-foreground">Elite ELO-based competitive rankings and leaderboards</p>
        </div>
      </div>

      <Tabs defaultValue="elo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="elo" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            ELO Rankings
          </TabsTrigger>
          <TabsTrigger value="earnings">Top Earners</TabsTrigger>
          <TabsTrigger value="tournaments">Tournament Winners</TabsTrigger>
          <TabsTrigger value="betting">Betting Leaders</TabsTrigger>
        </TabsList>

        <TabsContent value="elo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{eloPlayers.filter((p) => p.elo_rating >= 2200).length}</div>
                    <div className="text-sm text-muted-foreground">Grandmaster+</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {eloPlayers.filter((p) => p.elo_rating >= 1800 && p.elo_rating < 2200).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Master/Diamond</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {eloPlayers.filter((p) => p.elo_rating >= 1400 && p.elo_rating < 1800).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Plat/Gold</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {eloPlayers.length > 0
                        ? Math.round(eloPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / eloPlayers.length)
                        : 1200}
                    </div>
                    <div className="text-sm text-muted-foreground">Average ELO</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                ELO Rankings
              </CardTitle>
              <CardDescription>Elite competitive rankings based on skill rating</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                        <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                          <div className="w-24 h-3 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-16 h-6 bg-muted rounded animate-pulse" />
                        <div className="w-12 h-4 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {eloPlayers.map((player) => (
                    <div
                      key={player.rank}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                          {player.rank <= 3 ? (
                            player.rank === 1 ? (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            ) : player.rank === 2 ? (
                              <Medal className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Medal className="h-4 w-4 text-amber-600" />
                            )
                          ) : (
                            player.rank
                          )}
                        </div>
                        <Avatar>
                          <AvatarImage src="/placeholder.svg?height=40&width=40" />
                          <AvatarFallback>
                            {player.username
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">
                            <ProfileNameLink
                              userId={player.id}
                              username={player.username}
                              pageSource="leaderboard-elo"
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {player.total_games} games • {player.wins}W-{player.losses}L •{" "}
                            {player.total_games > 0 ? Math.round((player.wins / player.total_games) * 100) : 0}% win
                            rate
                            {player.goals > 0 && (
                              <span className="ml-2">
                                • {player.goals}G {player.assists}A {player.saves}S
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={`${getBadgeColor(player.tier)} border-0`}>{player.badge}</Badge>
                        <div className="text-right">
                          <div className="font-bold text-lg">{player.elo_rating}</div>
                          <div
                            className={`text-sm flex items-center gap-1 ${
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
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            {player.recent_change > 0 ? "+" : ""}
                            {player.recent_change || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-500" />
                Top Earners
              </CardTitle>
              <CardDescription>Players with highest total winnings</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                        <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                          <div className="w-24 h-3 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-16 h-6 bg-muted rounded animate-pulse" />
                        <div className="w-12 h-4 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {topEarners.map((player) => (
                    <div key={player.rank} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                          {player.rank}
                        </div>
                        <Avatar>
                          <AvatarImage src="/placeholder.svg?height=40&width=40" />
                          <AvatarFallback>
                            {player.username
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">
                            <ProfileNameLink
                              userId={player.id}
                              username={player.username}
                              pageSource="leaderboard-earnings"
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            This month: +${player.monthly_earnings.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-green-600">${player.total_earnings.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Total earnings</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-500" />
                Tournament Champions
              </CardTitle>
              <CardDescription>Recent tournament winners and champions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    tournament: "Championship Finals 2024",
                    winner: "Alex Chen",
                    prize: "$5,000",
                    date: "2 days ago",
                    participants: 128,
                  },
                  {
                    tournament: "Pro League Season 3",
                    winner: "Sarah Johnson",
                    prize: "$3,500",
                    date: "1 week ago",
                    participants: 64,
                  },
                  {
                    tournament: "Winter Cup",
                    winner: "Jordan Kim",
                    prize: "$2,000",
                    date: "2 weeks ago",
                    participants: 32,
                  },
                  {
                    tournament: "Amateur Championship",
                    winner: "Emily Davis",
                    prize: "$1,000",
                    date: "3 weeks ago",
                    participants: 96,
                  },
                ].map((tournament, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">{tournament.tournament}</div>
                      <div className="text-sm text-muted-foreground">
                        Winner:{" "}
                        <ProfileNameLink
                          userId={`winner-${index}`}
                          username={tournament.winner}
                          pageSource="leaderboard-tournaments"
                          className="hover:text-primary cursor-pointer transition-colors font-medium"
                        />{" "}
                        • {tournament.participants} participants
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-purple-600">{tournament.prize}</div>
                      <div className="text-sm text-muted-foreground">{tournament.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="betting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Betting Leaders
              </CardTitle>
              <CardDescription>Most successful bettors by profit and accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    name: "Mike Rodriguez",
                    profit: "$4,567",
                    accuracy: "78%",
                    totalBets: 234,
                    avatar: "/placeholder.svg?height=40&width=40",
                  },
                  {
                    name: "Lisa Zhang",
                    profit: "$3,890",
                    accuracy: "82%",
                    totalBets: 156,
                    avatar: "/placeholder.svg?height=40&width=40",
                  },
                  {
                    name: "Chris Wilson",
                    profit: "$3,234",
                    accuracy: "75%",
                    totalBets: 289,
                    avatar: "/placeholder.svg?height=40&width=40",
                  },
                  {
                    name: "David Brown",
                    profit: "$2,876",
                    accuracy: "71%",
                    totalBets: 198,
                    avatar: "/placeholder.svg?height=40&width=40",
                  },
                ].map((bettor, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                        {index + 1}
                      </div>
                      <Avatar>
                        <AvatarImage src={bettor.avatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {bettor.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">
                          <ProfileNameLink
                            userId={`bettor-${index + 1}`}
                            username={bettor.name}
                            pageSource="leaderboard-betting"
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">{bettor.totalBets} total bets</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{bettor.accuracy} accuracy</Badge>
                      <div className="text-right">
                        <div className="font-bold text-lg text-blue-600">{bettor.profit}</div>
                        <div className="text-sm text-muted-foreground">Total profit</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
