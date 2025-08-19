"use client"

import { Suspense } from "react"
import { TournamentDashboard } from "@/components/tournaments/tournament-dashboard"
import { LeagueMarketplace } from "@/components/leagues/league-marketplace"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, DollarSign, Users, ArrowRight, Plus, Gavel, User, Clock } from "lucide-react"
import Link from "next/link"

const tournamentLeagues = [
  {
    id: "1",
    name: "Championship League Tournament",
    game: "zealot_hockey",
    max_teams: 16,
    current_teams: 12,
    entry_fee: 50,
    prize_pool: 800,
    start_date: "2024-03-28T19:00:00Z",
    status: "registration",
    format: "bracket",
    betting_enabled: true,
    total_bets: 2400,
  },
  {
    id: "2",
    name: "Pro League Elimination",
    game: "call_of_duty",
    max_teams: 8,
    current_teams: 6,
    entry_fee: 75,
    prize_pool: 600,
    start_date: "2024-03-29T20:00:00Z",
    status: "team_building",
    format: "single_elimination",
    betting_enabled: true,
    total_bets: 1800,
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

export default function TournamentsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments & Leagues</h1>
          <p className="text-muted-foreground">
            Choose between team tournaments (3 days) or solo leagues (extended play)
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Tournament & League Rewards</h3>
            <p className="text-sm text-muted-foreground">
              Choose team tournaments or solo leagues • Earn $50 per game played • Win massive prize pools • Team
              tournaments last 3 days, leagues run longer
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-lg font-bold text-green-500">$50</div>
                <div className="text-xs text-muted-foreground">Per Game Played</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-500">3 Days</div>
                <div className="text-xs text-muted-foreground">Tournament Duration</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-500">Prize Pools</div>
                <div className="text-xs text-muted-foreground">Winners</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button asChild>
            <Link href="/auth/sign-up">
              <DollarSign className="h-4 w-4 mr-2" />
              Start with $25
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/draft/3v3">
              <Users className="h-4 w-4 mr-2" />
              Join Draft
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="team-tournaments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="team-tournaments">Team Tournaments</TabsTrigger>
          <TabsTrigger value="solo-leagues">Solo Leagues</TabsTrigger>
          <TabsTrigger value="marketplace">Team Marketplace</TabsTrigger>
          <TabsTrigger value="brackets">Live Brackets</TabsTrigger>
        </TabsList>

        <TabsContent value="team-tournaments" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Team Tournaments</h2>
              <p className="text-muted-foreground">3-day tournaments with team building and competitive brackets</p>
            </div>
            <Button asChild>
              <Link href="/tournaments/create?type=team">
                <Plus className="h-4 w-4 mr-2" />
                Create Team Tournament
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournamentLeagues.map((tournament) => (
              <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-2xl">{gameIcons[tournament.game as keyof typeof gameIcons]}</span>
                        {tournament.name}
                      </CardTitle>
                      <CardDescription>{gameNames[tournament.game as keyof typeof gameNames]}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={
                          tournament.status === "registration"
                            ? "secondary"
                            : tournament.status === "team_building"
                              ? "default"
                              : "outline"
                        }
                      >
                        {tournament.status === "registration"
                          ? "Open"
                          : tournament.status === "team_building"
                            ? "Team Building"
                            : "Live"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        Team
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {tournament.current_teams}/{tournament.max_teams} teams
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      <span>{tournament.format}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${tournament.prize_pool} prize</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>3 days</span>
                    </div>
                  </div>

                  {tournament.betting_enabled && (
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-green-600 font-medium">
                          <DollarSign className="h-3 w-3 inline mr-1" />
                          Betting Available
                        </p>
                        <span className="text-xs text-muted-foreground">${tournament.total_bets} wagered</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Teams registered</span>
                      <span>
                        {tournament.current_teams}/{tournament.max_teams}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(tournament.current_teams / tournament.max_teams) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/tournaments/${tournament.id}`}>
                        {tournament.status === "registration"
                          ? "Join Tournament"
                          : tournament.status === "team_building"
                            ? "Build Team"
                            : "View Bracket"}
                      </Link>
                    </Button>
                    {tournament.betting_enabled && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/betting?tournament=${tournament.id}`}>
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

        <TabsContent value="solo-leagues" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Solo Leagues</h2>
              <p className="text-muted-foreground">Extended league play for individual competition</p>
            </div>
            <Button asChild>
              <Link href="/tournaments/create?type=solo">
                <Plus className="h-4 w-4 mr-2" />
                Create Solo League
              </Link>
            </Button>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Solo League Play</h3>
                <p className="text-sm text-muted-foreground">
                  Individual competition • Extended seasons • ELO-based matchmaking • $50 per game played
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-500">Extended</div>
                <div className="text-xs text-muted-foreground">League Duration</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Solo ELO League
                    </CardTitle>
                    <CardDescription>Individual competitive play with ELO rankings</CardDescription>
                  </div>
                  <Badge variant="secondary">Open</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Extended season • $50 per game • ELO matchmaking</div>
                  <Button asChild>
                    <Link href="/draft/1v1">Join Solo League</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Tournament Team Marketplace</h3>
                <p className="text-sm text-muted-foreground">
                  Build championship teams • Spend tournament winnings • Premium players and power-ups • Live auctions
                  for tournament preparation
                </p>
              </div>
            </div>
          </div>
          <Suspense fallback={<div>Loading marketplace...</div>}>
            <LeagueMarketplace />
          </Suspense>
        </TabsContent>

        <TabsContent value="brackets">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <TournamentDashboard />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
