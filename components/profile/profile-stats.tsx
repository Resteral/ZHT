import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, DollarSign, TrendingUp, Award } from "lucide-react"

interface ProfileStatsProps {
  user: {
    wins: number
    losses: number
    winRate: number
    totalGames: number
    wallet_balance: number
    elo_rating: number
    level: number
    rank: string
  }
}

export function ProfileStats({ user }: ProfileStatsProps) {
  const stats = [
    {
      title: "Games Played",
      value: user.totalGames.toString(),
      icon: Target,
      color: "text-blue-500",
      progress: Math.min((user.totalGames / 100) * 100, 100),
    },
    {
      title: "Win Rate",
      value: `${user.winRate}%`,
      icon: Trophy,
      color: "text-green-500",
      progress: user.winRate,
    },
    {
      title: "Total Games",
      value: user.totalGames.toString(),
      icon: Target,
      color: "text-blue-500",
      progress: Math.min((user.totalGames / 500) * 100, 100),
    },
    {
      title: "Current Balance",
      value: `$${user.wallet_balance.toFixed(2)}`,
      icon: DollarSign,
      color: "text-yellow-500",
      progress: Math.min((user.wallet_balance / 2000) * 100, 100),
    },
    {
      title: "ELO Rating",
      value: user.elo_rating.toString(),
      icon: TrendingUp,
      color: "text-purple-500",
      progress: Math.min(((user.elo_rating - 1000) / 1000) * 100, 100),
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{stat.value}</div>
            <Progress value={stat.progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{stat.progress.toFixed(1)}% progress</p>
          </CardContent>
        </Card>
      ))}

      {/* Detailed Stats Card */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Wins</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                  {user.wins}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Losses</span>
                <Badge variant="secondary" className="bg-red-500/20 text-red-500">
                  {user.losses}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Current Rank</span>
                <Badge variant="outline" className="border-primary text-primary">
                  {user.rank}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium mb-2">Recent Performance</div>
              <div className="flex gap-1">
                {/* Mock recent game results */}
                {["W", "W", "L", "W", "W", "L", "W", "W"].map((result, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      result === "W" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Level Progress</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Level {user.level}</span>
                  <span>87.5%</span>
                </div>
                <Progress value={87.5} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
