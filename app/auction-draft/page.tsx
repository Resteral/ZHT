import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Calendar, Trophy, Gavel, DollarSign } from "lucide-react"
import { AuctionDraftDashboard } from "@/components/auction-draft/auction-draft-dashboard"
import { LeagueMarketplace } from "@/components/leagues/league-marketplace"
import Link from "next/link"

const availableAuctionLeagues = [
  {
    id: "1",
    name: "Zealot Hockey Championship",
    game: "zealot_hockey",
    max_teams: 8,
    current_teams: 6,
    players_per_team: 5,
    entry_fee: 25,
    prize_pool: 200,
    auction_date: "2024-03-25T19:00:00Z",
    status: "registration",
    betting_enabled: true,
    total_bets: 1250,
  },
  {
    id: "2",
    name: "Call of Duty Pro League",
    game: "call_of_duty",
    max_teams: 6,
    current_teams: 4,
    players_per_team: 6,
    entry_fee: 50,
    prize_pool: 300,
    auction_date: "2024-03-26T20:00:00Z",
    status: "auction_in_progress",
    betting_enabled: true,
    total_bets: 2100,
  },
  {
    id: "3",
    name: "Rainbow Six Siege Tournament",
    game: "rainbow_six_siege",
    max_teams: 8,
    current_teams: 8,
    players_per_team: 5,
    entry_fee: 30,
    prize_pool: 240,
    auction_date: "2024-03-24T18:00:00Z",
    status: "completed",
    betting_enabled: true,
    total_bets: 890,
  },
]

const gameIcons = {
  zealot_hockey: "🏒",
  call_of_duty: "🎯",
  rainbow_six_siege: "🛡️",
  counter_strike: "💥",
}

const gameNames = {
  zealot_hockey: "Zealot Hockey",
  call_of_duty: "Call of Duty",
  rainbow_six_siege: "Rainbow Six Siege",
  counter_strike: "Counter Strike",
}

export default function AuctionDraftPage() {
  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">League</h1>
          <p className="text-muted-foreground">Bid on players, buy teams from marketplace, and build your dream team</p>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse Matches</TabsTrigger>
            <TabsTrigger value="marketplace">Team Marketplace</TabsTrigger>
            <TabsTrigger value="my-leagues">My Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Gavel className="h-6 w-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">How League Works</h3>
                  <p className="text-sm text-muted-foreground">
                    Bid on players to build your team. Earn $100 per ELO match, compete for match prizes, and bet on
                    auction outcomes!
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-500">$100</div>
                  <div className="text-xs text-muted-foreground">Per ELO Game</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Available Matches</h2>
                <p className="text-muted-foreground">Join a match and start bidding on players</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableAuctionLeagues.map((league) => (
                <Card key={league.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-2xl">{gameIcons[league.game as keyof typeof gameIcons]}</span>
                          {league.name}
                        </CardTitle>
                        <CardDescription>{gameNames[league.game as keyof typeof gameNames]}</CardDescription>
                      </div>
                      <Badge
                        variant={
                          league.status === "registration"
                            ? "secondary"
                            : league.status === "auction_in_progress"
                              ? "default"
                              : "outline"
                        }
                      >
                        {league.status === "registration"
                          ? "Open"
                          : league.status === "auction_in_progress"
                            ? "Live Auction"
                            : "Completed"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {league.current_teams}/{league.max_teams} teams
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gavel className="h-4 w-4 text-muted-foreground" />
                        <span>{league.players_per_team} per team</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <span>${league.prize_pool} prize</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(league.auction_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {league.betting_enabled && (
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-green-600 font-medium">
                            <DollarSign className="h-3 w-3 inline mr-1" />
                            Betting Available
                          </p>
                          <span className="text-xs text-muted-foreground">${league.total_bets} wagered</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Teams filled</span>
                        <span>
                          {league.current_teams}/{league.max_teams}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(league.current_teams / league.max_teams) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild className="flex-1" disabled={league.status === "completed"}>
                        <Link href={`/auction-draft/${league.id}`}>
                          {league.status === "registration"
                            ? "Join Match"
                            : league.status === "auction_in_progress"
                              ? "View Auction"
                              : "View Results"}
                        </Link>
                      </Button>
                      {league.betting_enabled && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/betting?league=${league.id}`}>
                            <DollarSign className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="marketplace" className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Gavel className="h-6 w-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Team Marketplace - Spend Your Winnings</h3>
                  <p className="text-sm text-muted-foreground">
                    Bid on premium teams • Buy power-ups and boosts • Use earnings from matches • Live auctions with
                    real-time bidding
                  </p>
                </div>
              </div>
            </div>
            <Suspense fallback={<div>Loading marketplace...</div>}>
              <LeagueMarketplace />
            </Suspense>
          </TabsContent>

          <TabsContent value="my-leagues">
            <Suspense fallback={<div>Loading your matches...</div>}>
              <AuctionDraftDashboard />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
