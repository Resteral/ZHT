"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Crown, Trophy, Medal, Star, TrendingUp, TrendingDown } from "lucide-react"
import { ProfileNameLink } from "@/components/profile/profile-name-link"
import { createClient } from "@/lib/supabase/client"

interface Player {
  id: string
  username: string
  elo_rating: number
  games_played: number
  wins: number
  losses: number
  recent_change: number
  rank: number
  badge: string
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
          games_played,
          wins,
          losses,
          elo_history!inner(
            elo_change,
            created_at
          )
        `)
        .not("elo_rating", "is", null)
        .order("elo_rating", { ascending: false })
        .limit(20)

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
        const formattedPlayers = players.map((player, index) => ({
          id: player.id,
          username: player.username,
          elo_rating: player.elo_rating || 1000,
          games_played: player.games_played || 0,
          wins: player.wins || 0,
          losses: player.losses || 0,
          recent_change: player.elo_history?.[0]?.elo_change || 0,
          rank: index + 1,
          badge: getELOBadge(player.elo_rating || 1000),
        }))
        setEloPlayers(formattedPlayers)
      }

      if (earners) {
        // Group earnings by user
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

          // Check if transaction is from this month
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
    if (elo >= 2000) return "Grandmaster"
    if (elo >= 1800) return "Master"
    if (elo >= 1600) return "Diamond"
    if (elo >= 1400) return "Platinum"
    if (elo >= 1200) return "Gold"
    return "Silver"
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboards</h1>
          <p className="text-muted-foreground">Top performers across all categories</p>
        </div>
      </div>

      <Tabs defaultValue="elo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="elo">ELO Rankings</TabsTrigger>
          <TabsTrigger value="earnings">Top Earners</TabsTrigger>
          <TabsTrigger value="tournaments">Tournament Winners</TabsTrigger>
          <TabsTrigger value="betting">Betting Leaders</TabsTrigger>
        </TabsList>

        <TabsContent value="elo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                ELO Rankings
              </CardTitle>
              <CardDescription>Highest rated players in the system</CardDescription>
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
                            {player.games_played} games •{" "}
                            {player.games_played > 0 ? Math.round((player.wins / player.games_played) * 100) : 0}% win
                            rate
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          variant={
                            player.badge === "Grandmaster"
                              ? "default"
                              : player.badge === "Master"
                                ? "secondary"
                                : player.badge === "Diamond"
                                  ? "outline"
                                  : "secondary"
                          }
                        >
                          {player.badge}
                        </Badge>
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
