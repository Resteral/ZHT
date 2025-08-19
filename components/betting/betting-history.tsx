import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react"

const bettingHistory = [
  {
    id: "1",
    game: {
      homeTeam: { name: "Thunder Hawks", avatar: "/placeholder.svg?height=24&width=24" },
      awayTeam: { name: "Fire Dragons", avatar: "/placeholder.svg?height=24&width=24" },
      finalScore: { home: 31, away: 28 },
    },
    bet: {
      type: "moneyline",
      selection: "Thunder Hawks",
      odds: "+150",
      stake: 50,
      payout: 125,
      status: "won",
    },
    placedAt: "2024-03-15T14:30:00Z",
    settledAt: "2024-03-15T22:45:00Z",
  },
  {
    id: "2",
    game: {
      homeTeam: { name: "Storm Eagles", avatar: "/placeholder.svg?height=24&width=24" },
      awayTeam: { name: "Ice Wolves", avatar: "/placeholder.svg?height=24&width=24" },
      finalScore: { home: 24, away: 27 },
    },
    bet: {
      type: "spread",
      selection: "Storm Eagles -3.5",
      odds: "-110",
      stake: 75,
      payout: 0,
      status: "lost",
    },
    placedAt: "2024-03-14T16:20:00Z",
    settledAt: "2024-03-14T21:30:00Z",
  },
  {
    id: "3",
    game: {
      homeTeam: { name: "Solar Titans", avatar: "/placeholder.svg?height=24&width=24" },
      awayTeam: { name: "Void Runners", avatar: "/placeholder.svg?height=24&width=24" },
    },
    bet: {
      type: "total",
      selection: "Over 48.5",
      odds: "-110",
      stake: 100,
      payout: 190.91,
      status: "pending",
    },
    placedAt: "2024-03-16T12:00:00Z",
  },
  {
    id: "4",
    player: { name: "Marcus Johnson", team: "Thunder Hawks" },
    bet: {
      type: "player_prop",
      selection: "Over 285.5 Passing Yards",
      odds: "-115",
      stake: 60,
      payout: 112.17,
      status: "won",
    },
    placedAt: "2024-03-13T18:45:00Z",
    settledAt: "2024-03-13T22:15:00Z",
  },
]

export function BettingHistory() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "won":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "lost":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "won":
        return "default"
      case "lost":
        return "destructive"
      case "pending":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getProfitLoss = (bet: any) => {
    if (bet.status === "won") {
      return bet.payout - bet.stake
    } else if (bet.status === "lost") {
      return -bet.stake
    }
    return 0
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">68%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Wagered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,847</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500 flex items-center">
              +$342
              <TrendingUp className="h-4 w-4 ml-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bet History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Bets</h3>
        {bettingHistory.map((bet) => (
          <Card key={bet.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(bet.bet.status)}
                  <Badge variant={getStatusVariant(bet.bet.status)}>
                    {bet.bet.status.charAt(0).toUpperCase() + bet.bet.status.slice(1)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{new Date(bet.placedAt).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  {bet.bet.status !== "pending" && (
                    <div
                      className={`text-sm font-medium ${
                        getProfitLoss(bet.bet) > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {getProfitLoss(bet.bet) > 0 ? "+" : ""}${getProfitLoss(bet.bet).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {bet.game && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={bet.game.awayTeam.avatar || "/placeholder.svg"} alt={bet.game.awayTeam.name} />
                      <AvatarFallback>{bet.game.awayTeam.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{bet.game.awayTeam.name}</span>
                    {bet.game.finalScore && <span className="text-sm font-medium">{bet.game.finalScore.away}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">@</span>
                  <div className="flex items-center space-x-3">
                    {bet.game.finalScore && <span className="text-sm font-medium">{bet.game.finalScore.home}</span>}
                    <span className="text-sm">{bet.game.homeTeam.name}</span>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={bet.game.homeTeam.avatar || "/placeholder.svg"} alt={bet.game.homeTeam.name} />
                      <AvatarFallback>{bet.game.homeTeam.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              )}

              {bet.player && (
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {bet.player.name} - {bet.player.team}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{bet.bet.selection}</p>
                  <p className="text-xs text-muted-foreground">
                    {bet.bet.type.replace("_", " ").toUpperCase()} • {bet.bet.odds}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${bet.bet.stake}</p>
                  <p className="text-xs text-muted-foreground">
                    {bet.bet.status === "pending" ? `To win $${(bet.bet.payout - bet.bet.stake).toFixed(2)}` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button variant="outline">Load More History</Button>
      </div>
    </div>
  )
}
