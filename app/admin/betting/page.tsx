import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, TrendingUp, Target, DollarSign, Users } from "lucide-react"
import Link from "next/link"

export default function BettingMarketManagement() {
  // Mock betting market data
  const markets = [
    {
      id: 1,
      title: "CS Finals - Match Winner",
      game: "Team Alpha vs Team Beta",
      marketType: "Match Winner",
      status: "open",
      totalVolume: 15420,
      totalBets: 89,
      odds: { team1: 1.85, team2: 1.95 },
      createdDate: "2024-01-15",
    },
    {
      id: 2,
      title: "R6S Qualifier - Total Rounds",
      game: "Storm Squad vs Lightning Crew",
      marketType: "Over/Under",
      status: "open",
      totalVolume: 8750,
      totalBets: 45,
      odds: { over: 1.9, under: 1.9 },
      createdDate: "2024-01-16",
    },
    {
      id: 3,
      title: "COD League - First Blood",
      game: "Fire Hawks vs Ice Wolves",
      marketType: "Player Props",
      status: "settled",
      totalVolume: 12300,
      totalBets: 67,
      odds: { player1: 2.1, player2: 1.75 },
      createdDate: "2024-01-14",
    },
    {
      id: 4,
      title: "Hockey Elite Cup - Tournament Winner",
      game: "Elite Cup Tournament",
      marketType: "Futures",
      status: "open",
      totalVolume: 25600,
      totalBets: 156,
      odds: { team1: 3.5, team2: 2.8, team3: 4.2 },
      createdDate: "2024-01-10",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "default"
      case "closed":
        return "secondary"
      case "settled":
        return "outline"
      default:
        return "default"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Betting Market Management</h1>
          <p className="text-muted-foreground">Create and manage all betting markets and odds</p>
        </div>
        <Link href="/admin/betting/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Market
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Currently open</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$62K</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">357</div>
            <p className="text-xs text-muted-foreground">Active bets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.5%</div>
            <p className="text-xs text-muted-foreground">Average margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search markets by title, game, or type..." className="pl-10" />
            </div>
            <Button variant="outline">Filter by Type</Button>
            <Button variant="outline">Filter by Status</Button>
            <Button variant="outline">Filter by Game</Button>
          </div>
        </CardContent>
      </Card>

      {/* Markets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Betting Markets</CardTitle>
          <CardDescription>{markets.length} markets total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market Details</TableHead>
                <TableHead>Game/Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Bets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markets.map((market) => (
                <TableRow key={market.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{market.title}</div>
                      <div className="text-sm text-muted-foreground">Created: {market.createdDate}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{market.game}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{market.marketType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">${market.totalVolume.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{market.totalBets}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(market.status)}>{market.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/betting/${market.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      {market.status === "open" && (
                        <Button size="sm" variant="outline">
                          Close
                        </Button>
                      )}
                      {market.status === "closed" && <Button size="sm">Settle</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
