"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Star, DollarSign, Medal, Crown, Target, Shield } from "lucide-react"
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

interface Clan {
  id: string
  name: string
  tag: string
  level: number
  rating: number
  members_count: number
  rank: number
}

const MOCK_CLANS: Clan[] = [
  { id: "1", name: "Team Solomid", tag: "TSM", level: 15, rating: 2450, members_count: 42, rank: 1 },
  { id: "2", name: "Cloud9", tag: "C9", level: 14, rating: 2380, members_count: 38, rank: 2 },
  { id: "3", name: "FaZe Clan", tag: "FAZE", level: 16, rating: 2350, members_count: 48, rank: 3 },
  { id: "4", name: "100 Thieves", tag: "100T", level: 13, rating: 2290, members_count: 35, rank: 4 },
  { id: "5", name: "Team Liquid", tag: "TL", level: 14, rating: 2250, members_count: 40, rank: 5 },
]

export function Leaderboards() {
  const [eloLeaders, setEloLeaders] = useState<LeaderboardEntry[]>([])
  const [fantasyLeaders, setFantasyLeaders] = useState<LeaderboardEntry[]>([])
  const [earningsLeaders, setEarningsLeaders] = useState<LeaderboardEntry[]>([])
  const [clans, setClans] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadLeaderboards()
  }, [])

  const loadLeaderboards = async () => {
    try {
      // Load highest ELO players
      setClans(MOCK_CLANS)
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
        const fantasyLeaders = fantasyData.map((team, index) => {
          const user = Array.isArray(team.users) ? team.users[0] : team.users
          return {
            id: team.owner_id,
            username: user?.username || "Unknown",
            elo_rating: user?.elo_rating || 1200,
            total_earnings: 0,
            fantasy_team_value: team.total_elo,
            fantasy_team_name: team.name,
            division: getDivisionFromElo(team.average_elo),
            rank: index + 1,
          }
        })
        setFantasyLeaders(fantasyLeaders)
      }

      // Load highest earners (mock data for now)
      const { data: earningsData } = await supabase
        .from("users")
        .select("id, username, elo_rating")
        .order("elo_rating", { ascending: false })
        .limit(20)

      if (earningsData) {
        const earningsLeaders = earningsData.map((user, index) => ({
          id: user.id,
          username: user.username,
          elo_rating: user.elo_rating,
          // Mock earnings based on ELO for demonstration
          total_earnings: Math.floor((user.elo_rating - 1200) * 10 + Math.random() * 5000),
          fantasy_team_value: 0,
          fantasy_team_name: "",
          division: getDivisionFromElo(user.elo_rating),
          rank: index + 1,
        }))
        setEarningsLeaders(earningsLeaders.sort((a, b) => b.total_earnings - a.total_earnings))
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
          <TabsTrigger value="clans">Top Clans</TabsTrigger>
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

        <TabsContent value="clans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                Top Clans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clans.map((clan, index) => (
                  <div key={clan.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-12">{getRankIcon(index + 1)}</div>
                    <Avatar>
                      <AvatarFallback>{clan.tag}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium flex items-center gap-2">
                        [{clan.tag}] {clan.name}
                        <Badge variant="outline" className="text-xs">Lvl {clan.level}</Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">{clan.members_count} members</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-500">{clan.rating}</p>
                      <p className="text-sm text-muted-foreground">Clan Rating</p>
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
