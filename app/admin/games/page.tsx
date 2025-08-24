import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, Trophy, Calendar, Clock } from "lucide-react"
import Link from "next/link"

export default function GameManagement() {
  // Mock game data
  const games = [
    {
      id: 1,
      title: "Team Shooter Championship Finals",
      game: "Team Shooter",
      team1: "Team Alpha",
      team2: "Team Beta",
      scheduledDate: "2024-01-15",
      scheduledTime: "19:00",
      status: "scheduled",
      tournament: "Winter Championship",
      venue: "Arena 1",
    },
    {
      id: 2,
      title: "Strategic Shooter Qualifier Match",
      game: "Strategic Shooter",
      team1: "Storm Squad",
      team2: "Lightning Crew",
      scheduledDate: "2024-01-16",
      scheduledTime: "20:30",
      status: "live",
      tournament: "Spring Qualifiers",
      venue: "Arena 2",
    },
    {
      id: 3,
      title: "Tactical FPS League Match",
      game: "Tactical FPS",
      team1: "Fire Hawks",
      team2: "Ice Wolves",
      scheduledDate: "2024-01-14",
      scheduledTime: "18:00",
      status: "completed",
      tournament: "Regular Season",
      venue: "Arena 3",
      score: "16-12",
    },
    {
      id: 4,
      title: "Hockey Showdown",
      game: "Zealot Hockey",
      team1: "Arctic Bears",
      team2: "Desert Eagles",
      scheduledDate: "2024-01-17",
      scheduledTime: "21:00",
      status: "scheduled",
      tournament: "Elite Cup",
      venue: "Main Arena",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "default"
      case "live":
        return "destructive"
      case "completed":
        return "secondary"
      default:
        return "default"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Game Management</h1>
          <p className="text-muted-foreground">Schedule and manage all games and matches</p>
        </div>
        <Link href="/admin/games/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Game
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Now</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Currently playing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45K</div>
            <p className="text-xs text-muted-foreground">From betting</p>
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
              <Input placeholder="Search games by title, teams, or tournament..." className="pl-10" />
            </div>
            <Button variant="outline">Filter by Game</Button>
            <Button variant="outline">Filter by Status</Button>
            <Button variant="outline">Filter by Date</Button>
          </div>
        </CardContent>
      </Card>

      {/* Games Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Games</CardTitle>
          <CardDescription>{games.length} games total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game Details</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Tournament</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{game.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {game.game}
                        </Badge>
                        <span>{game.venue}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{game.team1}</div>
                      <div className="text-xs text-muted-foreground">vs</div>
                      <div className="text-sm font-medium">{game.team2}</div>
                      {game.score && <div className="text-xs text-muted-foreground">Score: {game.score}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium">{game.scheduledDate}</div>
                      <div className="text-xs text-muted-foreground">{game.scheduledTime}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{game.tournament}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(game.status)}>{game.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/games/${game.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      {game.status === "live" && (
                        <Link href={`/admin/games/${game.id}/live`}>
                          <Button size="sm">Live</Button>
                        </Link>
                      )}
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
