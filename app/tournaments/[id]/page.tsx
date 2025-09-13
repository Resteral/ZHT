"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Trophy, Users, Calendar, DollarSign, Crown, Settings, Gavel } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { UnifiedTournamentJoin } from "@/components/tournaments/unified-tournament-join"
import { PlayerPoolManagement } from "@/components/tournaments/player-pool-management"
import { RoundRobinBracket } from "@/components/tournaments/round-robin-bracket"
import { TournamentBettingInterface } from "@/components/tournaments/tournament-betting-interface"
import { TournamentStartButton } from "@/components/tournaments/tournament-start-button"
import TournamentAuctionRoom from "@/components/tournaments/tournament-auction-room"
import { CaptainTeamCustomization } from "@/components/tournaments/captain-team-customization"
import { useAuth } from "@/lib/auth-context"

interface TournamentPageProps {
  params: {
    id: string
  }
}

interface Tournament {
  id: string
  name: string
  description: string
  sport: string
  status: string
  max_teams: number
  entry_fee: number
  prize_pool: number
  created_at: string
  created_by: string
  league_mode: string
  participant_count?: number
  start_date?: string
  creator?: {
    username: string
    id: string
  }
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function TournamentPage({ params }: TournamentPageProps) {
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [auctionSession, setAuctionSession] = useState<any>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!isValidUUID(params.id)) {
      router.push("/tournaments")
      return
    }

    fetchTournament()
    checkAuctionSession()
  }, [params.id, router])

  const fetchTournament = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase.from("tournaments").select("*").eq("id", params.id).single()

      if (error) {
        console.error("Error fetching tournament:", error)
        router.push("/tournaments")
        return
      }

      if (data) {
        let creator = null
        if (data.created_by) {
          const { data: userData } = await supabase
            .from("users")
            .select("username, id")
            .eq("id", data.created_by)
            .single()

          if (userData) {
            creator = userData
          }
        }

        const { data: participantData } = await supabase
          .from("tournament_participants")
          .select("id")
          .eq("tournament_id", params.id)

        setTournament({
          ...data,
          creator, // Add the separately fetched creator data
          sport: data.game || "fantasy_football",
          league_mode: data.tournament_type || "tournament",
          max_teams: data.max_participants || data.max_teams || 0,
          participant_count: participantData?.length || 0,
        })

        if (data.status === "registration") {
          setActiveTab("join")
        }
      }
    } catch (error) {
      console.error("Error fetching tournament:", error)
      router.push("/tournaments")
    } finally {
      setLoading(false)
    }
  }

  const checkAuctionSession = async () => {
    try {
      const response = await fetch(`/api/tournaments/${params.id}/auction`)
      if (response.ok) {
        const data = await response.json()
        setAuctionSession(data.auctionSession)
      } else {
        console.log("[v0] No active auction session found")
      }
    } catch (error) {
      console.log("[v0] No auction session available:", error)
    }
  }

  if (!isValidUUID(params.id)) {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tournament Not Found</h3>
            <p className="text-muted-foreground mb-4">The tournament you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/tournaments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tournaments
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
        return "bg-blue-500"
      case "team_building":
        return "bg-yellow-500"
      case "draft":
      case "drafting":
        return "bg-purple-500"
      case "active":
      case "in_progress":
        return "bg-green-500"
      case "completed":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "registration":
        return "Registration Open"
      case "team_building":
        return "Team Building"
      case "draft":
      case "drafting":
        return "Draft Phase"
      case "active":
      case "in_progress":
        return "Live Tournament"
      case "completed":
        return "Completed"
      default:
        return status
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tournaments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Link>
        </Button>
        <Badge className={getStatusColor(tournament.status)}>{getStatusText(tournament.status)}</Badge>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{tournament.name}</h1>
            <p className="text-muted-foreground">{tournament.description}</p>
            {tournament.creator && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Host: {tournament.creator.username}
                </Badge>
                {(user?.id === tournament.created_by || user?.username === "Resteral") && (
                  <Badge variant="secondary" className="text-xs">
                    You are the host or super admin
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-500">${tournament.prize_pool.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Prize Pool</div>
            {(user?.id === tournament.created_by || user?.username === "Resteral") && (
              <Button asChild variant="outline" size="sm" className="mt-2 bg-transparent">
                <Link href={`/tournaments/${tournament.id}/manage`}>
                  <Settings className="h-3 w-3 mr-1" />
                  Manage Tournament
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {tournament.participant_count}/{tournament.max_teams} participants
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">${tournament.entry_fee} entry fee</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{tournament.sport.replace("_", " ")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{new Date(tournament.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {(user?.id === tournament.created_by || user?.username === "Resteral") && (
        <div className="mb-6 space-y-4">
          <TournamentStartButton
            tournament={{
              id: tournament.id,
              name: tournament.name,
              status: tournament.status,
              max_participants: tournament.max_teams,
              created_by: tournament.created_by,
              start_date: tournament.start_date,
              tournament_type: tournament.league_mode,
            }}
            participantCount={tournament.participant_count || 0}
            onStatusChange={(newStatus) => {
              setTournament((prev) => (prev ? { ...prev, status: newStatus } : null))
              // Refresh tournament data to get updated info
              fetchTournament()
            }}
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="join">Join Tournament</TabsTrigger>
          <TabsTrigger value="pools">Player Pools</TabsTrigger>
          <TabsTrigger value="auction" disabled={tournament.status !== "drafting" && !auctionSession}>
            Auction Draft
          </TabsTrigger>
          <TabsTrigger value="bracket">Live Bracket</TabsTrigger>
          <TabsTrigger value="betting">Betting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Overview</CardTitle>
              <CardDescription>Tournament details and current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold">Tournament Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(tournament.status)}>{getStatusText(tournament.status)}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Game:</span>
                      <span>{tournament.sport.replace("_", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Draft Start:</span>
                      <div className="text-right">
                        <div className="font-medium">
                          {tournament.start_date
                            ? new Date(tournament.start_date).toLocaleString()
                            : new Date(tournament.created_at).toLocaleString()}
                        </div>
                        {tournament.status === "registration" && tournament.start_date && (
                          <div className="text-xs text-blue-600 mt-1">
                            {(() => {
                              const startTime = new Date(tournament.start_date).getTime()
                              const now = new Date().getTime()
                              const difference = startTime - now

                              if (difference > 0) {
                                const days = Math.floor(difference / (1000 * 60 * 60 * 24))
                                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

                                if (days > 0) {
                                  return `Starts in ${days}d ${hours}h ${minutes}m`
                                } else if (hours > 0) {
                                  return `Starts in ${hours}h ${minutes}m`
                                } else {
                                  return `Starts in ${minutes}m`
                                }
                              } else {
                                return "Starting now!"
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tournament Duration:</span>
                      <span>{tournament.league_mode === "league" ? "League (30+ days)" : "Tournament (1-7 days)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Teams:</span>
                      <span>{tournament.max_teams}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entry Fee:</span>
                      <span>${tournament.entry_fee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prize Pool:</span>
                      <span className="font-semibold text-green-600">${tournament.prize_pool.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Participation</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Registered:</span>
                      <span>
                        {tournament.participant_count}/{tournament.max_teams}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(tournament.participant_count! / tournament.max_teams) * 100}%` }}
                      />
                    </div>
                    {tournament.status === "registration" && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900 dark:text-blue-100">Registration Open</span>
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          Draft starts:{" "}
                          {tournament.start_date
                            ? new Date(tournament.start_date).toLocaleString()
                            : new Date(tournament.created_at).toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Games begin immediately after draft completion
                        </div>
                      </div>
                    )}
                    {tournament.status === "drafting" && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-900 dark:text-yellow-100">Draft in Progress</span>
                        </div>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                          Players are currently drafting teams
                        </div>
                        <Button
                          onClick={() => router.push(`/tournaments/${tournament.id}/draft`)}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          View Draft Room
                        </Button>
                      </div>
                    )}
                    {(tournament.status === "registration" || tournament.status === "active") && (
                      <div className="pt-4">
                        <UnifiedTournamentJoin tournamentId={tournament.id} tournament={tournament} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="join" className="space-y-6">
          <UnifiedTournamentJoin tournamentId={tournament.id} tournament={tournament} />
        </TabsContent>

        <TabsContent value="pools" className="space-y-6">
          <PlayerPoolManagement
            tournamentId={tournament.id}
            tournament={tournament}
            isOrganizer={user?.id === tournament.created_by || user?.username === "Resteral"}
          />

          {(tournament.status === "team_building" || tournament.status === "drafting") && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Team Customization
                  </CardTitle>
                  <CardDescription>
                    Customize your team's name, logo, colors, and draft strategy as a team captain.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CaptainTeamCustomization
                    tournamentId={tournament.id}
                    tournament={tournament}
                    onCustomizationSaved={() => {
                      // Refresh tournament data when customization is saved
                      fetchTournament()
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bracket" className="space-y-6">
          <RoundRobinBracket tournamentId={tournament.id} />
        </TabsContent>

        <TabsContent value="betting" className="space-y-6">
          <TournamentBettingInterface tournamentId={tournament.id} tournamentName={tournament.name} participants={[]} />
        </TabsContent>

        <TabsContent value="auction" className="space-y-6">
          {tournament.status === "drafting" || auctionSession ? (
            <div className="space-y-6">
              <TournamentAuctionRoom
                tournamentId={tournament.id}
                currentUserId={user?.id || ""}
                isOwner={user?.id === tournament.created_by || user?.username === "Resteral"}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tournament Formation</h3>
                <p className="text-muted-foreground mb-4">
                  {tournament.status === "registration"
                    ? "Complete registration and select captains in the Player Pools tab to begin tournament formation."
                    : "The tournament formation will be available when ready."}
                </p>
                {tournament.status === "registration" &&
                  (user?.id === tournament.created_by || user?.username === "Resteral") && (
                    <div className="mt-6">
                      <Button onClick={() => setActiveTab("pools")} variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        Go to Player Pools
                      </Button>
                    </div>
                  )}
                {(user?.id === tournament.created_by || user?.username === "Resteral") && (
                  <Button
                    onClick={() => router.push(`/tournaments/${tournament.id}/manage`)}
                    variant="outline"
                    className="ml-2"
                  >
                    Manage Tournament
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
