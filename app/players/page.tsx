import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Filter, TrendingUp, TrendingDown } from "lucide-react"
import { ProfileNameLink } from "@/components/profile/profile-name-link"

export default function PlayersPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Player Database</h1>
          <p className="text-muted-foreground">Browse and analyze player statistics and performance</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search players..." className="pl-10" />
          </div>
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Player Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">+12% from last season</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,923</div>
            <p className="text-xs text-muted-foreground">Currently in leagues</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Alex Chen</div>
            <p className="text-xs text-muted-foreground">2,156 ELO rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rising Star</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Jordan Kim</div>
            <p className="text-xs text-muted-foreground">+347 ELO this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Players List */}
      <Card>
        <CardHeader>
          <CardTitle>Top Players</CardTitle>
          <CardDescription>Highest rated players in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                name: "Alex Chen",
                rating: 2156,
                change: "+23",
                position: "Mid",
                team: "Team Alpha",
                avatar: "/placeholder.svg?height=40&width=40",
              },
              {
                name: "Sarah Johnson",
                rating: 2089,
                change: "+15",
                position: "ADC",
                team: "Team Beta",
                avatar: "/placeholder.svg?height=40&width=40",
              },
              {
                name: "Mike Rodriguez",
                rating: 2034,
                change: "-8",
                position: "Support",
                team: "Team Gamma",
                avatar: "/placeholder.svg?height=40&width=40",
              },
              {
                name: "Jordan Kim",
                rating: 1987,
                change: "+45",
                position: "Jungle",
                team: "Team Delta",
                avatar: "/placeholder.svg?height=40&width=40",
              },
              {
                name: "Emily Davis",
                rating: 1923,
                change: "+12",
                position: "Top",
                team: "Team Epsilon",
                avatar: "/placeholder.svg?height=40&width=40",
              },
            ].map((player, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                  <Avatar>
                    <AvatarImage src={player.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {player.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">
                      <ProfileNameLink
                        userId={`player-${index + 1}`}
                        username={player.name}
                        pageSource="players-page"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">{player.team}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{player.position}</Badge>
                  <div className="text-right">
                    <div className="font-bold">{player.rating}</div>
                    <div
                      className={`text-sm flex items-center gap-1 ${
                        player.change.startsWith("+") ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {player.change.startsWith("+") ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {player.change}
                    </div>
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
