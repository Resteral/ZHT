import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, DollarSign, Target, Clock, Zap, Trophy } from "lucide-react"
import { LiveBettingMarkets } from "./live-betting-markets"
import { UpcomingBets } from "./upcoming-bets"
import { BettingHistory } from "./betting-history"
import { BetSlip } from "./bet-slip"
import { ELODraftBetting } from "./elo-draft-betting"
import { BettingResults } from "./betting-results"

export function BettingDashboard() {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,247.50</div>
            <p className="text-xs text-muted-foreground">+$125 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">$340 total stake</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Markets</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">5 ending soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Tabs defaultValue="live" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="live" className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Live Markets</span>
                </TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="elo-draft">ELO Draft</TabsTrigger>
                <TabsTrigger value="results" className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>Results</span>
                </TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Real-time odds</Badge>
                <Button size="sm" variant="outline">
                  Refresh Markets
                </Button>
              </div>
            </div>

            <TabsContent value="live" className="space-y-6">
              <LiveBettingMarkets />
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-6">
              <UpcomingBets />
            </TabsContent>

            <TabsContent value="elo-draft" className="space-y-6">
              <ELODraftBetting />
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <BettingResults />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <BettingHistory />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <BetSlip />

          <Card>
            <CardHeader>
              <CardTitle>Hot Tips</CardTitle>
              <CardDescription>Popular bets right now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">No trending bets available</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Betting Limits</CardTitle>
              <CardDescription>Your current limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Daily Limit</span>
                <span>$500 / $1,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Single Bet</span>
                <span>$250 max</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Weekly Limit</span>
                <span>$1,200 / $2,500</span>
              </div>
              <Button size="sm" variant="outline" className="w-full bg-transparent">
                Adjust Limits
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
