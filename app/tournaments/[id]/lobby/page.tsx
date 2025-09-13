"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Trophy, Crown, Zap, Timer, Target, Calendar, Brackets, Play } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { tournamentService } from "@/lib/services/tournament-service"
import { useTournamentData } from "@/hooks/use-tournament-data"

interface Player {
  id: string
  username: string
  elo_rating: number
  is_captain?: boolean
}

interface Tournament {
  id: string
  name: string
  description: string
  start_date: string
  max_participants: number
  player_pool_settings: {
    num_teams: number
    players_per_team: number
    bracket_type: string
  }
  status: string
  created_by: string
}

export default function TournamentLobbyPage() {
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string

  const { tournament, participants: players, loading, error, refetch } = useTournamentData(tournamentId)

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [timeUntilStart, setTimeUntilStart] = useState<string>("")
  const [joining, setJoining] = useState(false)
  const [bracket, setBracket] = useState<any[]>([])
  const [draftInfo, setDraftInfo] = useState<any>(null)
  const [tournamentStarted, setTournamentStarted] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (tournament) {
      setTournamentStarted(tournament.status === "in_progress" || tournament.status === "drafting")

      if (tournament.status === "in_progress" || tournament.status === "drafting") {
        loadBracketAndDraftInfo(tournamentId)
      }
    }
  }, [tournament])

  const loadBracketAndDraftInfo = async (tournamentId: string) => {
    try {
      const { data: draftData } = await supabase
        .from("captain_drafts")
        .select(`
          id,
          status,
          current_round,
          max_rounds,
          captain1_id,
          captain2_id,
          tournament_owner,
          created_at,
          captain_draft_participants (
            user_id,
            team,
            is_captain,
            users (username, elo_rating)
          )
        `)
        .eq("match_id", tournamentId)
        .single()

      if (draftData) {
        setDraftInfo(draftData)
      }

      const numTeams = tournament?.player_pool_settings?.num_teams || 4
      const bracketStructure = generateBracketStructure(numTeams)
      setBracket(bracketStructure)
    } catch (error) {
      console.error("[v0] Error loading bracket/draft info:", error)
    }
  }

  const generateBracketStructure = (numTeams: number) => {
    const rounds = Math.ceil(Math.log2(numTeams))
    const bracket = []

    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round)
      const roundMatches = []

      for (let match = 1; match <= matchesInRound; match++) {
        roundMatches.push({
          id: `round-${round}-match-${match}`,
          round,
          match,
          team1: round === 1 ? `Team ${(match - 1) * 2 + 1}` : "TBD",
          team2: round === 1 ? `Team ${(match - 1) * 2 + 2}` : "TBD",
          winner: null,
          status: "pending",
        })
      }

      bracket.push({
        round,
        name: round === rounds ? "Final" : round === rounds - 1 ? "Semi-Final" : `Round ${round}`,
        matches: roundMatches,
      })
    }

    return bracket
  }

  const joinTournament = async () => {
    if (!currentUser || !tournament) return

    setJoining(true)
    try {
      await tournamentService.joinTournament(tournamentId, currentUser.id)
      refetch()
    } catch (error) {
      console.error("[v0] Error joining tournament:", error)
    } finally {
      setJoining(false)
    }
  }

  const startDraft = async () => {
    if (!tournament) return

    try {
      console.log("[v0] Initiating draft phase...")
      const numCaptains = tournament.player_pool_settings.num_teams
      const captains = players.slice(0, numCaptains)

      const totalPlayersNeeded =
        tournament.player_pool_settings.num_teams * tournament.player_pool_settings.players_per_team

      const selectedPlayers = players.slice(0, totalPlayersNeeded)
      const excessPlayers = players.slice(totalPlayersNeeded)

      console.log("[v0] Starting draft with captains:", captains)
      console.log("[v0] Selected players:", selectedPlayers.length)
      console.log("[v0] Removing excess players:", excessPlayers.length)

      await supabase.from("tournaments").update({ status: "drafting" }).eq("id", tournamentId)

      const { data: captainDraft, error: draftError } = await supabase
        .from("captain_drafts")
        .insert({
          match_id: tournamentId,
          captain1_id: captains[0]?.id, // Highest ELO captain
          captain2_id: captains[1]?.id || captains[0]?.id, // Second highest or same if only one team
          format: tournament.player_pool_settings.bracket_type || "tournament",
          max_rounds: Math.ceil(selectedPlayers.length / numCaptains),
          current_round: 1,
          current_pick: 1,
          current_captain: captains[0]?.id,
          status: "drafting",
          tournament_owner: captains[0]?.id,
          tournament_mode: true,
          elo_difference: captains.length > 1 ? captains[0].elo_rating - captains[1].elo_rating : 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (draftError) throw draftError

      const draftParticipants = selectedPlayers.map((player, index) => ({
        draft_id: captainDraft.id,
        user_id: player.id,
        is_captain: index < numCaptains,
        team: null, // Will be assigned during draft
        elo_rating: player.elo_rating,
      }))

      const { error: participantsError } = await supabase.from("captain_draft_participants").insert(draftParticipants)

      if (participantsError) throw participantsError

      await supabase
        .from("tournament_participants")
        .update({ status: "drafting" })
        .eq("tournament_id", tournamentId)
        .in(
          "user_id",
          selectedPlayers.map((p) => p.id),
        )

      if (excessPlayers.length > 0) {
        await supabase
          .from("tournament_participants")
          .update({ status: "removed_excess" })
          .eq("tournament_id", tournamentId)
          .in(
            "user_id",
            excessPlayers.map((p) => p.id),
          )
      }

      setTournamentStarted(true)
      await loadBracketAndDraftInfo(tournamentId)

      console.log("[v0] All players moved to draft system, transitioning to draft page...")
      router.push(`/tournaments/${tournamentId}/draft`)
    } catch (error) {
      console.error("[v0] Error starting draft:", error)
    }
  }

  useEffect(() => {
    if (!tournament?.start_date) return

    const updateTimer = () => {
      const startTime = new Date(tournament.start_date).getTime()
      const now = new Date().getTime()
      const difference = startTime - now

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        setTimeUntilStart(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeUntilStart("Starting now!")
        if (tournament.status === "registration") {
          console.log("[v0] Tournament timer reached zero, automatically starting draft...")
          startDraft()
        }
      }
    }

    const timer = setInterval(updateTimer, 1000)
    updateTimer()

    return () => clearInterval(timer)
  }, [tournament?.start_date, tournament?.status])

  const isUserInTournament = players.some((p) => p.id === currentUser?.id)
  const totalPlayersNeeded =
    tournament.player_pool_settings.num_teams * tournament.player_pool_settings.players_per_team
  const progressPercentage = (players.length / totalPlayersNeeded) * 100

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground">{tournament.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={tournamentStarted ? "default" : "secondary"} className="text-lg px-4 py-2">
              {tournamentStarted ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {tournament.status === "drafting" ? "Drafting" : "In Progress"}
                </>
              ) : (
                <>
                  <Timer className="h-4 w-4 mr-2" />
                  {timeUntilStart}
                </>
              )}
            </Badge>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {tournamentStarted ? "Tournament Progress" : "Players in Pool"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tournamentStarted
                    ? `${tournament.player_pool_settings.num_teams} teams formed`
                    : `${players.length} / ${totalPlayersNeeded} needed`}
                </span>
              </div>
              <Progress value={tournamentStarted ? 100 : progressPercentage} className="h-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {tournament.player_pool_settings.num_teams} teams × {tournament.player_pool_settings.players_per_team}{" "}
                  players each
                </span>
                <span className="font-medium">
                  {tournamentStarted
                    ? "Tournament Active"
                    : `${Math.max(0, totalPlayersNeeded - players.length)} more needed`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pool" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pool" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Player Pool
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Draft Info
          </TabsTrigger>
          <TabsTrigger value="bracket" className="flex items-center gap-2">
            <Brackets className="h-4 w-4" />
            Tournament Bracket
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pool" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Player Pool
                    <Badge variant="outline">{players.length} players</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {players.map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          index < tournament.player_pool_settings.num_teams
                            ? "border-yellow-200 bg-yellow-50"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{player.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{player.username}</span>
                              {index < tournament.player_pool_settings.num_teams && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Captain
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">ELO: {player.elo_rating}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">#{index + 1}</div>
                          <div className="text-xs text-muted-foreground">
                            {index < tournament.player_pool_settings.num_teams ? "Captain" : "Player"}
                          </div>
                        </div>
                      </div>
                    ))}

                    {players.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No players in the pool yet. Be the first to join!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Tournament Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Format:</span>
                      <span className="font-medium">{tournament.player_pool_settings.bracket_type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Teams:</span>
                      <span className="font-medium">{tournament.player_pool_settings.num_teams}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Players per team:</span>
                      <span className="font-medium">{tournament.player_pool_settings.players_per_team}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Start time:</span>
                      <span className="font-medium">{new Date(tournament.start_date).toLocaleString()}</span>
                    </div>
                  </div>

                  {!isUserInTournament && currentUser && !tournamentStarted && (
                    <Button onClick={joinTournament} disabled={joining} className="w-full" size="lg">
                      {joining ? (
                        "Joining..."
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Join Tournament Pool
                        </>
                      )}
                    </Button>
                  )}

                  {isUserInTournament && !tournamentStarted && (
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-green-800 font-medium">✅ You're in the pool!</div>
                      <div className="text-sm text-green-600 mt-1">Wait for the tournament to start</div>
                    </div>
                  )}

                  {currentUser &&
                    tournament.created_by === currentUser.id &&
                    !tournamentStarted &&
                    players.length >= tournament.player_pool_settings.num_teams && (
                      <Button onClick={startDraft} className="w-full" size="lg" variant="default">
                        <Target className="h-4 w-4 mr-2" />
                        Start Draft System ({players.length} players ready)
                      </Button>
                    )}

                  {tournamentStarted && (
                    <div className="space-y-3">
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-blue-800 font-medium">🎯 Draft System Active</div>
                        <div className="text-sm text-blue-600 mt-1">
                          All players have been moved to the draft system
                        </div>
                      </div>
                      <Button
                        onClick={() => router.push(`/tournaments/${tournamentId}/draft`)}
                        className="w-full"
                        size="lg"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Enter Draft Room
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <Crown className="h-5 w-5" />
                    Captain Selection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-yellow-700">
                    <p className="mb-2">
                      The <strong>{tournament.player_pool_settings.num_teams} highest ELO players</strong> will be
                      selected as team captains.
                    </p>
                    <p>Captains will draft teams, then score live bracket games after the tournament.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="draft" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Draft Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {draftInfo ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">{draftInfo.current_round}</div>
                        <div className="text-sm text-blue-600">Current Round</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">{draftInfo.max_rounds}</div>
                        <div className="text-sm text-green-600">Total Rounds</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Draft Progress</span>
                        <span>
                          {draftInfo.current_round}/{draftInfo.max_rounds} rounds
                        </span>
                      </div>
                      <Progress value={(draftInfo.current_round / draftInfo.max_rounds) * 100} className="h-2" />
                    </div>
                    <Badge variant={draftInfo.status === "completed" ? "default" : "secondary"}>
                      {draftInfo.status === "completed" ? "Draft Complete" : "Draft In Progress"}
                    </Badge>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {tournamentStarted ? "Loading draft information..." : "Draft will begin when tournament starts"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Tournament Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Registration</span>
                    <Badge variant="outline">Complete</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Draft Phase</span>
                    <Badge variant={tournamentStarted ? "default" : "secondary"}>
                      {tournamentStarted ? "Active" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Tournament Start</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(tournament.start_date).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bracket" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brackets className="h-5 w-5" />
                Tournament Bracket
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bracket.length > 0 ? (
                <div className="space-y-6">
                  {bracket.map((round) => (
                    <div key={round.round} className="space-y-3">
                      <h3 className="font-semibold text-lg">{round.name}</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {round.matches.map((match) => (
                          <div key={match.id} className="p-4 border rounded-lg bg-muted/50">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">Match {match.match}</span>
                              <Badge variant="outline">{match.status}</Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-2 bg-background rounded">
                                <span>{match.team1}</span>
                                <span className="text-muted-foreground">vs</span>
                                <span>{match.team2}</span>
                              </div>
                              {match.winner && (
                                <div className="text-center text-sm font-medium text-green-600">
                                  Winner: {match.winner}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {tournamentStarted
                    ? "Loading tournament bracket..."
                    : "Bracket will be generated when tournament starts"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
