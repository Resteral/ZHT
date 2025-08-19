import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"

export default function PlayerManagement() {
  // Mock player data
  const players = [
    {
      id: 1,
      name: "Alex Chen",
      game: "Counter Strike",
      position: "AWPer",
      elo: 2450,
      winRate: 68.5,
      earnings: 15420,
      status: "active",
      trend: "up",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      game: "Rainbow Six Siege",
      position: "Entry Fragger",
      elo: 2380,
      winRate: 72.1,
      earnings: 12850,
      status: "active",
      trend: "up",
    },
    {
      id: 3,
      name: "Mike Rodriguez",
      game: "Call of Duty",
      position: "Support",
      elo: 2290,
      winRate: 64.3,
      earnings: 8930,
      status: "inactive",
      trend: "down",
    },
    {
      id: 4,
      name: "Emma Wilson",
      game: "Zealot Hockey",
      position: "Goalie",
      elo: 2520,
      winRate: 75.8,
      earnings: 18750,
      status: "active",
      trend: "up",
    },
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Player Management</h1>
          <p className="text-muted-foreground">Manage all players and their statistics</p>
        </div>
        <Link href="/admin/players/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Player
          </Button>
        </Link>
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
              <Input placeholder="Search players by name, game, or position..." className="pl-10" />
            </div>
            <Button variant="outline">Filter by Game</Button>
            <Button variant="outline">Filter by Status</Button>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>{players.length} players total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>ELO</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        {player.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">ID: {player.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{player.game}</Badge>
                  </TableCell>
                  <TableCell>{player.position}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{player.elo}</span>
                      {player.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{player.winRate}%</TableCell>
                  <TableCell>${player.earnings.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={player.status === "active" ? "default" : "secondary"}>{player.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
