import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, Target, Plus, Search } from "lucide-react"
import Link from "next/link"

export default function AdminTournamentsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tournament Management</h1>
          <p className="text-muted-foreground">Create and manage tournaments across all games</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/tournaments/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tournament
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>
      </div>

      {/* Tournament Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,847</div>
            <p className="text-xs text-muted-foreground">Across all tournaments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prize Pool</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,200</div>
            <p className="text-xs text-muted-foreground">Total active prizes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ending Soon</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input placeholder="Search tournaments..." className="w-full pl-10 pr-4 py-2 border rounded-md" />
              </div>
            </div>
            <select className="px-3 py-2 border rounded-md">
              <option>All Games</option>
              <option>Counter Strike</option>
              <option>Rainbow Six Siege</option>
              <option>Call of Duty</option>
              <option>Zealot Hockey</option>
            </select>
            <select className="px-3 py-2 border rounded-md">
              <option>All Status</option>
              <option>Active</option>
              <option>Registration</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tournament List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tournaments</CardTitle>
          <CardDescription>Manage existing tournaments and their settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                name: "Winter Championship 2024",
                game: "Counter Strike",
                status: "Active",
                participants: 64,
                prize: "$5,000",
                startDate: "2024-01-20",
                endDate: "2024-02-15",
              },
              {
                name: "Rainbow Six Pro League",
                game: "Rainbow Six Siege",
                status: "Registration",
                participants: 32,
                prize: "$3,000",
                startDate: "2024-02-01",
                endDate: "2024-02-28",
              },
              {
                name: "Call of Duty Masters",
                game: "Call of Duty",
                status: "Active",
                participants: 128,
                prize: "$10,000",
                startDate: "2024-01-15",
                endDate: "2024-03-01",
              },
              {
                name: "Zealot Hockey Cup",
                game: "Zealot Hockey",
                status: "Completed",
                participants: 16,
                prize: "$1,500",
                startDate: "2024-01-01",
                endDate: "2024-01-14",
              },
            ].map((tournament, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Trophy className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">{tournament.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tournament.game} • {tournament.participants} participants • {tournament.startDate} to{" "}
                      {tournament.endDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      tournament.status === "Active"
                        ? "default"
                        : tournament.status === "Registration"
                          ? "secondary"
                          : tournament.status === "Completed"
                            ? "outline"
                            : "destructive"
                    }
                  >
                    {tournament.status}
                  </Badge>
                  <span className="font-semibold text-green-600">{tournament.prize}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
