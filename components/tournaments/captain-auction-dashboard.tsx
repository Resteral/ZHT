"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Crown,
  Trophy,
  TrendingUp,
  Target,
  DollarSign,
  Users,
  Star,
  Award,
  BarChart3,
  Zap,
  Shield,
  Brain,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

interface CaptainAuctionDashboardProps {
  tournamentId: string
  captainId: string
}

export function CaptainAuctionDashboard({ tournamentId, captainId }: CaptainAuctionDashboardProps) {
  const [captainStats, setCaptainStats] = useState<any>(null)
  const [auctionHistory, setAuctionHistory] = useState<any[]>([])
  const [teamPerformance, setTeamPerformance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    loadCaptainData()
  }, [tournamentId, captainId])

  const loadCaptainData = async () => {
    try {
      setLoading(true)

      // Load captain auction statistics
      const { data: stats } = await supabase
        .from("captain_auction_stats")
        .select("*")
        .eq("captain_id", captainId)
        .single()

      setCaptainStats(stats)

      // Load auction history
      const { data: history } = await supabase
        .from("auction_bid_history")
        .select(`
          *,
          tournament_player_pool(users(username, elo_rating)),
          tournament_teams(team_name)
        `)
        .eq("tournament_id", tournamentId)
        .eq("captain_id", captainId)
        .order("created_at", { ascending: false })
        .limit(10)

      setAuctionHistory(history || [])

      // Load team performance
      const { data: performance } = await supabase
        .from("tournament_teams")
        .select(`
          *,
          tournament_team_members(
            users(username, elo_rating),
            draft_cost
          )
        `)
        .eq("tournament_id", tournamentId)
        .eq("team_captain", captainId)
        .single()

      setTeamPerformance(performance)
    } catch (error) {
      console.error("Error loading captain data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading captain dashboard...</div>
        </CardContent>
      </Card>
    )
  }

  const totalSpent =
    teamPerformance?.tournament_team_members?.reduce((sum: number, member: any) => sum + (member.draft_cost || 0), 0) ||
    0

  const averagePlayerValue =
    teamPerformance?.tournament_team_members?.length > 0
      ? Math.round(totalSpent / teamPerformance.tournament_team_members.length)
      : 0

  const teamEloAverage =
    teamPerformance?.tournament_team_members?.length > 0
      ? Math.round(
          teamPerformance.tournament_team_members.reduce(
            (sum: number, member: any) => sum + (member.users?.elo_rating || 1000),
            0,
          ) / teamPerformance.tournament_team_members.length,
        )
      : 1000

  return (
    <div className="space-y-6">
      {/* Captain Overview */}
      <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-purple-600" />
            Captain Performance Dashboard
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Elite Captain
            </Badge>
          </CardTitle>
          <CardDescription>Your auction performance and team building statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600">{captainStats?.successful_bids || 0}</div>
              <div className="text-sm text-muted-foreground">Players Won</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{captainStats?.win_rate || 0}%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">${captainStats?.average_bid || 0}</div>
              <div className="text-sm text-muted-foreground">Avg Bid</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-purple-600">{captainStats?.total_auctions || 0}</div>
              <div className="text-sm text-muted-foreground">Auctions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team">Team Analysis</TabsTrigger>
          <TabsTrigger value="history">Bid History</TabsTrigger>
          <TabsTrigger value="insights">Captain Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Team Composition - {teamPerformance?.team_name}
              </CardTitle>
              <CardDescription>Your drafted team analysis and value breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">${totalSpent}</div>
                      <div className="text-sm text-muted-foreground">Total Spent</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">{teamEloAverage}</div>
                      <div className="text-sm text-muted-foreground">Avg ELO</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Budget Utilization</span>
                      <span>{Math.round((totalSpent / 1000) * 100)}%</span>
                    </div>
                    <Progress value={(totalSpent / 1000) * 100} className="h-2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Team Roster</div>
                  {teamPerformance?.tournament_team_members?.map((member: any, index: number) => (
                    <div
                      key={member.users?.username}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {member.users?.username?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.users?.username}</span>
                        {index === 0 && <Crown className="h-3 w-3 text-yellow-500" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {member.users?.elo_rating}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          ${member.draft_cost || 0}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                Recent Auction Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auctionHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No auction history yet</p>
                    <p className="text-sm">Your bids will appear here</p>
                  </div>
                ) : (
                  auctionHistory.map((bid, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={bid.won_bid ? "default" : "secondary"}>
                          {bid.won_bid ? <Trophy className="h-3 w-3 mr-1" /> : null}
                          {bid.won_bid ? "Won" : "Lost"}
                        </Badge>
                        <div>
                          <div className="font-medium text-sm">{bid.tournament_player_pool?.users?.username}</div>
                          <div className="text-xs text-muted-foreground">Bid: ${bid.bid_amount}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{bid.tournament_teams?.team_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(bid.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  Captain Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Quick Decision Making</span>
                    <Badge variant="secondary" className="ml-auto">
                      Elite
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Value Recognition</span>
                    <Badge variant="secondary" className="ml-auto">
                      High
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Budget Management</span>
                    <Badge variant="secondary" className="ml-auto">
                      Excellent
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-orange-500" />
                  Captain Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">First Captain to Draft</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Highest Value Team</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Best Win Rate</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
