"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Star, DollarSign, Medal, Crown, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface LeaderboardEntry {
  id: string
  username: string
  elo_rating: number
  total_earnings: number
  fantasy_team_value: number
  fantasy_team_name: string
  division: string
  rank: number
}

export function Leaderboards() {
  const [eloLeaders, setEloLeaders] = useState<LeaderboardEntry[]>([])
  const [fantasyLeaders, setFantasyLeaders] = useState<LeaderboardEntry[]>([])
  const [earningsLeaders, setEarningsLeaders] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadLeaderboards()
  }, [])

  const loadLeaderboards = async () => {
    try {
      // Load highest ELO players
      const { data: eloData } = await supabase
        .from("users")
        .select("id, username, elo_rating")
        .order("elo_rating", { ascending: false })
        .limit(20)

      if (eloData) {
        const eloLeaders = eloData.map((user, index) => ({
          id: user.id,
          username: user.username,
          elo_rating: user.elo_rating,
          total_earnings: 0,
          fantasy_team_value: 0,
          fantasy_team_name: "",
          division: getDivisionFromElo(user.elo_rating),
          rank: index + 1,
        }))
        setEloLeaders(eloLeaders)
      }

      // Load highest fantasy teams
      const { data: fantasyData } = await supabase
        .from("elo_teams")
        .select(`
          id,
          name,
          owner_id,
          total_elo,
          average_elo,
          budget_used,
          users(username, elo_rating)
        `)
        .order("total_elo", { ascending: false })
        .limit(20)

      if (fantasyData) {
        const fantasyLeaders = fantasyData.map((team, index) => ({
          id: team.owner_id,
          username: Array.isArray(team.users) ? (team.users[0] as any)?.username : ((team.users as any)?.username || "Unknown"),
          elo_rating: Array.isArray(team.users) ? (team.users[0] as any)?.elo_rating : ((team.users as any)?.elo_rating || 1200),
          total_earnings: 0,
          fantasy_team_value: team.total_elo,
          fantasy_team_name: team.name,
          division: getDivisionFromElo(team.average_elo),
          rank: index + 1,
        }))
        setFantasyLeaders(fantasyLeaders)
      }

      // Load highest earners
      const { data: earnersProfiles } = await supabase
        .from("users")
        .select("id, username, elo_rating")
        .limit(100)

      if (earnersProfiles) {
        // Fetch all payout transactions for these users
        const { data: payouts } = await supabase
          .from("transactions")
          .select("user_id, amount")
          .eq("type", "tournament_payout")
          .in("user_id", earnersProfiles.map(u => u.id))

        const earningsMap = new Map<string, number>()
        payouts?.forEach(p => {
          earningsMap.set(p.user_id, (earningsMap.get(p.user_id) || 0) + p.amount)
        })

        const earningsLeaders = earnersProfiles.map((user) => ({
          id: user.id,
          username: user.username,
          elo_rating: user.elo_rating,
          total_earnings: earningsMap.get(user.id) || 0,
          fantasy_team_value: 0,
          fantasy_team_name: "",
          division: getDivisionFromElo(user.elo_rating),
          rank: 0, // Will be set after sort
        }))
        
        setEarningsLeaders(
          earningsLeaders
            .sort((a, b) => b.total_earnings - a.total_earnings)
            .slice(0, 20)
            .map((user, index) => ({ ...user, rank: index + 1 }))
        )
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading leaderboards:", error)
      setLoading(false)
    }
  }

  const getDivisionFromElo = (elo: number): string => {
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
        return "Premier"
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Leaderboards
        </h2>
        <p className="text-muted-foreground">Top performers across all categories</p>
      </div>

      <Tabs defaultValue="elo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="elo">Highest ELO</TabsTrigger>
          <TabsTrigger value="fantasy">Highest Fantasy Team</TabsTrigger>
          <TabsTrigger value="earnings">Highest Earners</TabsTrigger>
        </TabsList>

        <TabsContent value="elo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Highest ELO Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eloLeaders.map((player) => (
                  <div key={player.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-12">{getRankIcon(player.rank)}</div>
                    <Avatar>
                      <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{player.username}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={getDivisionColor(player.division)}>{getDivisionName(player.division)}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-600">{player.elo_rating}</p>
                      <p className="text-sm text-muted-foreground">ELO Rating</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fantasy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Highest Fantasy Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fantasyLeaders.map((player) => (
                  <div key={player.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-12">{getRankIcon(player.rank)}</div>
                    <Avatar>
                      <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{player.username}</p>
                      <p className="text-sm text-muted-foreground">{player.fantasy_team_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={getDivisionColor(player.division)}>{getDivisionName(player.division)}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{player.fantasy_team_value}</p>
                      <p className="text-sm text-muted-foreground">Total Team ELO</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Highest Earners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {earningsLeaders.map((player, index) => (
                  <div key={player.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-12">{getRankIcon(index + 1)}</div>
                    <Avatar>
                      <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{player.username}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={getDivisionColor(player.division)}>{getDivisionName(player.division)}</Badge>
                        <span className="text-sm text-muted-foreground">{player.elo_rating} ELO</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">${player.total_earnings.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Earnings</p>
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
