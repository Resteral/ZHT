import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Gavel, Users, Calendar } from "lucide-react"
import Link from "next/link"

const myLeagues = [
  {
    id: "1",
    name: "Zealot Hockey Championship",
    game: "zealot_hockey",
    role: "bidder",
    status: "auction_scheduled",
    auctionDate: "2024-03-25T19:00:00Z",
    teamSize: 5,
    myTeam: ["Player1", "Player2", "Player3"],
    elo: 1847,
  },
  {
    id: "2",
    name: "Call of Duty Pro League",
    game: "call_of_duty",
    role: "player",
    status: "in_progress",
    bidder: "ProGamer123",
    teamName: "Alpha Squad",
    elo: 1654,
  },
]

const gameIcons = {
  zealot_hockey: "🏒",
  call_of_duty: "🎯",
  rainbow_six_siege: "🛡️",
  counter_strike: "💥",
}

export function AuctionDraftDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My League Matches</h2>
        <p className="text-muted-foreground">Your active matches and auction status</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {myLeagues.map((league) => (
          <Card key={league.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-xl">{gameIcons[league.game as keyof typeof gameIcons]}</span>
                    {league.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {league.role === "bidder" ? (
                      <Badge variant="default" className="gap-1">
                        <Gavel className="h-3 w-3" />
                        Bidder
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Player</Badge>
                    )}
                    <Badge variant="outline">ELO: {league.elo}</Badge>
                  </div>
                </div>
                <Badge variant={league.status === "auction_scheduled" ? "secondary" : "default"}>
                  {league.status === "auction_scheduled" ? "Auction Pending" : "In Progress"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {league.role === "bidder" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Auction: {new Date(league.auctionDate!).toLocaleString()}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Team Progress</span>
                      <span>
                        {league.myTeam!.length}/{league.teamSize} players
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(league.myTeam!.length / league.teamSize) * 100}%` }}
                      />
                    </div>
                  </div>

                  {league.myTeam!.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Current Team:</p>
                      <div className="flex flex-wrap gap-1">
                        {league.myTeam!.map((player, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {player}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">B</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">Bidder: {league.bidder}</p>
                      <p className="text-xs text-muted-foreground">Team: {league.teamName}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href={`/auction-draft/${league.id}`}>
                    {league.role === "bidder" && league.status === "auction_scheduled" ? "Start Auction" : "View Match"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {myLeagues.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No League Matches Yet</h3>
            <p className="text-muted-foreground mb-4">Join a league match to start competing</p>
            <Button asChild>
              <Link href="/auction-draft">Browse Matches</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
