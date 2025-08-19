import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, Users, Trophy, Target, DollarSign } from "lucide-react"
import Link from "next/link"

export default function TeamManagement() {
  // Mock team data
  const teams = [
    {
      id: 1,
      name: "Team Alpha",
      game: "Counter Strike",
      owner: "AlexChen",
      players: 5,
      maxPlayers: 5,
      wins: 12,
      losses: 3,
      winRate: 80.0,
      value: 15420,
      league: "Winter Championship",
      status: "active",
    },
    {
      id: 2,
      name: "Storm Squad",
      game: "Rainbow Six Siege",
      owner: "SarahGamer",
      players: 4,
      maxPlayers: 5,
      wins: 8,
      losses: 4,
      winRate: 66.7,
      value: 12850,
      league: "Spring Qualifiers",
      status: "active",
    },
    {
      id: 3,
      name: "Fire Hawks",
      game: "Call of Duty",
      owner: "MikeRod",
      players: 6,
      maxPlayers: 6,
      wins: 15,
      losses: 8,
      winRate: 65.2,
      value: 18750,
      league: "COD Elite League",
      status: "inactive",
    },
    {
      id: 4,
      name: "Arctic Bears",
      game: "Zealot Hockey",
      owner: "EmmaWilson",
      players: 8,
      maxPlayers: 10,
      wins: 20,
      losses: 5,
      winRate: 80.0,
      value: 22300,
      league: "Hockey Pro Season",
      status: "active",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      case "disbanded":
        return "outline"
      default:
        return "default"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground">Manage teams, rosters, and team performance</p>
        </div>
        <Link href="/admin/teams/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">Across all leagues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">Currently competing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4M</div>
            <p className="text-xs text-muted-foreground">Combined team values</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Championships</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Titles won</p>
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
              <Input placeholder="Search teams by name, owner, or league..." className="pl-10" />
            </div>
            <Button variant="outline">Filter by Game</Button>
            <Button variant="outline">Filter by League</Button>
            <Button variant="outline">Filter by Status</Button>
          </div>
        </CardContent>
      </Card>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teams</CardTitle>
          <CardDescription>{teams.length} teams shown</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Details</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Roster</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-muted-foreground">{team.league}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{team.game}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{team.owner}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        {team.players}/{team.maxPlayers} players
                      </div>
                      <div className="text-muted-foreground">
                        {team.maxPlayers - team.players > 0 ? `${team.maxPlayers - team.players} spots open` : "Full"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        {team.wins}-{team.losses}
                      </div>
                      <div className="text-muted-foreground">{team.winRate}% win rate</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">${team.value.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(team.status)}>{team.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/teams/${team.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/teams/${team.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
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
