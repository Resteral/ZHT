import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, Calendar, Trophy, Users, Clock } from "lucide-react"
import Link from "next/link"

export default function SeasonManagement() {
  // Mock season data
  const seasons = [
    {
      id: 1,
      name: "Winter Championship 2024",
      game: "Counter Strike",
      status: "active",
      startDate: "2024-01-01",
      endDate: "2024-03-31",
      teams: 16,
      gamesPlayed: 45,
      totalGames: 120,
      currentWeek: 8,
      totalWeeks: 16,
    },
    {
      id: 2,
      name: "Spring Qualifiers",
      game: "Rainbow Six Siege",
      status: "upcoming",
      startDate: "2024-04-01",
      endDate: "2024-06-30",
      teams: 12,
      gamesPlayed: 0,
      totalGames: 66,
      currentWeek: 0,
      totalWeeks: 12,
    },
    {
      id: 3,
      name: "COD Elite League",
      game: "Call of Duty",
      status: "active",
      startDate: "2024-02-01",
      endDate: "2024-05-31",
      teams: 20,
      gamesPlayed: 78,
      totalGames: 190,
      currentWeek: 12,
      totalWeeks: 20,
    },
    {
      id: 4,
      name: "Hockey Pro Season",
      game: "Zealot Hockey",
      status: "completed",
      startDate: "2023-10-01",
      endDate: "2023-12-31",
      teams: 14,
      gamesPlayed: 91,
      totalGames: 91,
      currentWeek: 14,
      totalWeeks: 14,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "upcoming":
        return "secondary"
      case "completed":
        return "outline"
      default:
        return "default"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Season Management</h1>
          <p className="text-muted-foreground">Create and manage seasons, schedules, and standings</p>
        </div>
        <Link href="/admin/seasons/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Season
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Seasons</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">62</div>
            <p className="text-xs text-muted-foreground">Across all seasons</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">467</div>
            <p className="text-xs text-muted-foreground">This season</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Championships</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Completed</p>
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
              <Input placeholder="Search seasons by name or game..." className="pl-10" />
            </div>
            <Button variant="outline">Filter by Game</Button>
            <Button variant="outline">Filter by Status</Button>
            <Button variant="outline">Filter by Date</Button>
          </div>
        </CardContent>
      </Card>

      {/* Seasons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Seasons</CardTitle>
          <CardDescription>{seasons.length} seasons total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Season Details</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{season.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Week {season.currentWeek} of {season.totalWeeks}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{season.game}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{season.startDate}</div>
                      <div className="text-muted-foreground">to {season.endDate}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {season.gamesPlayed}/{season.totalGames} games
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${(season.gamesPlayed / season.totalGames) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{season.teams}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(season.status)}>{season.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/seasons/${season.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/seasons/${season.id}/edit`}>
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
