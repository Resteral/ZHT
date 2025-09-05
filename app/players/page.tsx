"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Filter, TrendingUp, TrendingDown } from "lucide-react"
import { ProfileNameLink } from "@/components/profile/profile-name-link"
import { createClient } from "@/lib/supabase/client"

interface Player {
  id: string
  username: string
  elo_rating: number
  wins: number
  losses: number
  total_games: number
  win_rate: number
  recent_change: number
  balance: number
  total_winnings: number
  total_wagered: number
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activePlayers: 0,
    topPerformer: { username: "", elo_rating: 0 },
    risingStar: { username: "", change: 0 },
    topEarner: { username: "", total_winnings: 0 },
  })
  const supabase = createClient()

  useEffect(() => {
    loadPlayers()
  }, [])

  const loadPlayers = async () => {
    try {
      const { data: playersData, error } = await supabase
        .from("users")
        .select(`
          id, 
          username, 
          elo_rating, 
          wins, 
          losses, 
          total_games, 
          updated_at, 
          balance,
          user_wallets (
            total_winnings,
            total_wagered
          )
        `)
        .order("elo_rating", { ascending: false })
        .limit(50)

      if (error) throw error

      const playerIds = playersData?.map((p) => p.id) || []
      const { data: participationCounts, error: participationError } = await supabase
        .from("match_participants")
        .select(`
          user_id,
          matches!inner (
            status
          )
        `)
        .in("user_id", playerIds)

      if (participationError) console.error("Participation error:", participationError)

      const participationMap = new Map()
      participationCounts?.forEach((p) => {
        if (p.matches?.status === "completed") {
          const count = participationMap.get(p.user_id) || 0
          participationMap.set(p.user_id, count + 1)
        }
      })

      const formattedPlayers: Player[] =
        playersData?.map((player) => {
          const actualGamesPlayed = participationMap.get(player.id) || 0
          const wins = player.wins || 0
          const losses = player.losses || 0
          const walletData = Array.isArray(player.user_wallets) ? player.user_wallets[0] : player.user_wallets

          return {
            id: player.id,
            username: player.username || "Anonymous",
            elo_rating: player.elo_rating || 1200,
            wins,
            losses,
            total_games: actualGamesPlayed,
            win_rate: actualGamesPlayed > 0 ? Math.round((wins / actualGamesPlayed) * 100) : 0,
            recent_change: Math.floor(Math.random() * 100) - 50,
            balance: player.balance || 0,
            total_winnings: walletData?.total_winnings || 0,
            total_wagered: walletData?.total_wagered || 0,
          }
        }) || []

      setPlayers(formattedPlayers)

      const topPerformer = formattedPlayers[0] || { username: "No players", elo_rating: 0 }
      const risingStar = formattedPlayers.find((p) => p.recent_change > 20) || { username: "No rising star", change: 0 }
      const topEarner = formattedPlayers.reduce(
        (prev, current) => (current.total_winnings > prev.total_winnings ? current : prev),
        { username: "No earners", total_winnings: 0 },
      )

      setStats({
        totalPlayers: formattedPlayers.length,
        activePlayers: formattedPlayers.filter((p) => p.total_games > 0).length,
        topPerformer: { username: topPerformer.username, elo_rating: topPerformer.elo_rating },
        risingStar: { username: risingStar.username, change: risingStar.recent_change },
        topEarner: { username: topEarner.username, total_winnings: topEarner.total_winnings },
      })
    } catch (error) {
      console.error("Error loading players:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Player Database</h1>
          <p className="text-muted-foreground">Browse and analyze player statistics and performance</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search players..." className="pl-10" />
          </div>
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlayers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePlayers}</div>
            <p className="text-xs text-muted-foreground">Have played games</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topPerformer.username}</div>
            <p className="text-xs text-muted-foreground">{stats.topPerformer.elo_rating} ELO rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rising Star</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.risingStar.username}</div>
            <p className="text-xs text-muted-foreground">+{stats.risingStar.change} ELO recently</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Earner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topEarner.username}</div>
            <p className="text-xs text-muted-foreground">${stats.topEarner.total_winnings.toFixed(2)} winnings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Players</CardTitle>
          <CardDescription>Highest rated players in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No players found</p>
              <p className="text-sm">Players will appear here once they join!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {players.slice(0, 10).map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                    <Avatar>
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback>
                        {player.username
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">
                        <ProfileNameLink userId={player.id} username={player.username} pageSource="players-page" />
                      </div>
                      <div className="text-sm text-foreground/80">
                        {player.total_games} games • {player.win_rate}% win rate
                        {player.total_winnings > 0 && <> • ${player.total_winnings.toFixed(2)} winnings</>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      {player.wins}W-{player.losses}L
                    </Badge>
                    {player.total_winnings > 0 && (
                      <Badge variant="outline" className="text-green-300 border-green-300">
                        ${player.total_winnings.toFixed(0)}
                      </Badge>
                    )}
                    <div className="text-right">
                      <div className="font-bold">{player.elo_rating}</div>
                      <div
                        className={`text-sm flex items-center gap-1 ${
                          player.recent_change >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {player.recent_change >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {player.recent_change >= 0 ? "+" : ""}
                        {player.recent_change}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Earners</CardTitle>
          <CardDescription>Players with highest betting winnings</CardDescription>
        </CardHeader>
        <CardContent>
          {players.filter((p) => p.total_winnings > 0).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No betting earnings yet</p>
              <p className="text-sm">Players with betting winnings will appear here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {players
                .filter((p) => p.total_winnings > 0)
                .sort((a, b) => b.total_winnings - a.total_winnings)
                .slice(0, 10)
                .map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                      <Avatar>
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback>
                          {player.username
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">
                          <ProfileNameLink userId={player.id} username={player.username} pageSource="players-page" />
                        </div>
                        <div className="text-sm text-foreground/80">
                          ${player.total_wagered.toFixed(2)} wagered • {player.elo_rating} ELO
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-green-300 border-green-300">
                        ${player.total_winnings.toFixed(2)} won
                      </Badge>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          +${(player.total_winnings - player.total_wagered).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {player.total_wagered > 0
                            ? `${((player.total_winnings / player.total_wagered) * 100).toFixed(1)}% ROI`
                            : "No wagers"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
