"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Trophy, Settings, Target, Crown, Zap, Cross as Progress } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { TournamentDraftRoom } from "@/components/tournaments/tournament-draft-room"

interface TournamentDraftPageProps {
  params: {
    id: string
  }
}

export default function TournamentDraftPage({ params }: TournamentDraftPageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [tournament, setTournament] = useState<any>(null)
  const [userRole, setUserRole] = useState<"organizer" | "participant" | "spectator">("spectator")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLongTournament, setIsLongTournament] = useState(false)
  const [showScheduleEditor, setShowScheduleEditor] = useState(false)

  const supabase = createClient()

  const calculateTournamentDuration = (tournament: any) => {
    if (!tournament.start_date || !tournament.end_date) return false

    const startDate = new Date(tournament.start_date)
    const endDate = new Date(tournament.end_date)
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)

    return durationHours > 24 || tournament.tournament_type === "month_long_draft"
  }

  useEffect(() => {
    loadTournamentData()
  }, [params.id, user])

  const loadTournamentData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("[v0] Loading tournament draft data for ID:", params.id)

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(`
          *,
          creator:users!tournaments_created_by_fkey(username, id)
        `)
        .eq("id", params.id)
        .single()

      if (tournamentError) {
        console.log("[v0] Tournament load error:", tournamentError)
        throw tournamentError
      }

      console.log("[v0] Tournament loaded:", tournamentData.name, "Type:", tournamentData.tournament_type)
      setTournament(tournamentData)

      const isLong = calculateTournamentDuration(tournamentData)
      setIsLongTournament(isLong)
      console.log("[v0] Tournament duration - Long tournament:", isLong)

      if (user) {
        console.log("[v0] Determining user role for:", user.id)

        if (tournamentData.created_by === user.id) {
          setUserRole("organizer")
          console.log("[v0] User is tournament organizer")
        } else {
          const { data: participation } = await supabase
            .from("tournament_player_pool")
            .select("id, status")
            .eq("tournament_id", params.id)
            .eq("user_id", user.id)
            .single()

          if (participation) {
            setUserRole("participant")
            console.log("[v0] User is participant in player pool")
          } else {
            const { data: teamMembership } = await supabase
              .from("tournament_teams")
              .select("id, team_captain")
              .eq("tournament_id", params.id)
              .or(`team_captain.eq.${user.id},team_members.cs.["${user.id}"]`)
              .single()

            if (teamMembership) {
              setUserRole("participant")
              console.log("[v0] User is team member/captain")
            } else {
              setUserRole("spectator")
              console.log("[v0] User is spectator")
            }
          }
        }
      } else {
        setUserRole("spectator")
        console.log("[v0] No user logged in, defaulting to spectator")
      }

      setLoading(false)
    } catch (err) {
      console.error("[v0] Error loading tournament:", err)
      setError(err instanceof Error ? err.message : "Failed to load tournament")
      setLoading(false)
    }
  }

  const getTournamentTypeInfo = () => {
    const type = tournament?.tournament_type
    switch (type) {
      case "snake_draft":
        return { icon: Target, color: "text-blue-500", name: "Snake Draft Tournament" }
      case "linear_draft":
        return { icon: Users, color: "text-green-500", name: "Linear Draft Tournament" }
      case "auction_draft":
        return { icon: Crown, color: "text-yellow-500", name: "Auction Draft Tournament" }
      case "single_elimination":
        return { icon: Trophy, color: "text-purple-500", name: "Single Elimination Tournament" }
      case "month_long_draft":
        return { icon: Zap, color: "text-orange-500", name: "Month-Long Draft Tournament" }
      default:
        return { icon: Trophy, color: "text-gray-500", name: "Tournament" }
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading tournament draft...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error: {error || "Tournament not found"}</p>
          <Button onClick={() => router.push("/tournaments")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  const typeInfo = getTournamentTypeInfo()
  const TypeIcon = typeInfo.icon

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/tournaments/${params.id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tournament
            </Button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <TypeIcon className={`h-8 w-8 ${typeInfo.color}`} />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
              <p className="text-lg text-muted-foreground">{typeInfo.name} - Draft Room</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            {userRole === "organizer" && "You are the tournament organizer - manage the draft"}
            {userRole === "participant" && "You are participating in this draft - wait for your turn"}
            {userRole === "spectator" && "You are spectating this draft - watch the action unfold"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={userRole === "organizer" ? "default" : userRole === "participant" ? "secondary" : "outline"}>
            {userRole === "organizer" && (
              <>
                <Settings className="h-3 w-3 mr-1" />
                Organizer
              </>
            )}
            {userRole === "participant" && (
              <>
                <Users className="h-3 w-3 mr-1" />
                Participant
              </>
            )}
            {userRole === "spectator" && (
              <>
                <Trophy className="h-3 w-3 mr-1" />
                Spectator
              </>
            )}
          </Badge>
          <Badge variant="outline" className={typeInfo.color}>
            {tournament.status?.toUpperCase() || "ACTIVE"}
          </Badge>
        </div>
      </div>

      <Card className="border-l-4" style={{ borderLeftColor: typeInfo.color.replace("text-", "") }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
            {typeInfo.name} Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Tournament Format</div>
              <div className="capitalize">{tournament.tournament_type?.replace("_", " ")}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Max Participants</div>
              <div>{tournament.max_participants}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Entry Fee</div>
              <div className="text-red-600 font-medium">${tournament.entry_fee || 0}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Prize Pool</div>
              <div className="text-green-600 font-medium">${tournament.prize_pool || 0}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Duration</div>
              <div className="flex items-center gap-1">
                {isLongTournament ? (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      Extended
                    </Badge>
                    <span className="text-xs">Multi-day</span>
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="text-xs">
                      Short
                    </Badge>
                    <span className="text-xs">Single day</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {isLongTournament && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Extended Tournament:</strong> This tournament spans multiple days with scheduled matches and
                extended draft periods.
                {userRole === "organizer" && " As the organizer, you can edit the tournament schedule."}
              </p>
            </div>
          )}

          {!isLongTournament && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Live Tournament:</strong> This tournament features live bracket progression with real-time
                matches and immediate results.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isLongTournament ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Player Pool Management
              </CardTitle>
              <CardDescription>Manage the tournament player pool for extended tournament format</CardDescription>
            </CardHeader>
            <CardContent>
              <TournamentDraftRoom tournamentId={params.id} userRole={userRole} />
            </CardContent>
          </Card>

          {userRole === "organizer" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  Tournament Schedule Management
                </CardTitle>
                <CardDescription>
                  Edit match schedules and tournament phases for this extended tournament
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={() => setShowScheduleEditor(!showScheduleEditor)}
                    variant="outline"
                    className="w-full"
                  >
                    {showScheduleEditor ? "Hide Schedule Editor" : "Edit Tournament Schedule"}
                  </Button>

                  {showScheduleEditor && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-3">Schedule Management</h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Tournament Start</label>
                          <input
                            type="datetime-local"
                            className="w-full mt-1 px-3 py-2 border rounded-md"
                            defaultValue={tournament?.start_date?.slice(0, 16)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Tournament End</label>
                          <input
                            type="datetime-local"
                            className="w-full mt-1 px-3 py-2 border rounded-md"
                            defaultValue={tournament?.end_date?.slice(0, 16)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Draft Phase Duration</label>
                          <select className="w-full mt-1 px-3 py-2 border rounded-md">
                            <option value="24">24 hours</option>
                            <option value="48">48 hours</option>
                            <option value="72">72 hours</option>
                            <option value="168">1 week</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Match Schedule</label>
                          <select className="w-full mt-1 px-3 py-2 border rounded-md">
                            <option value="flexible">Flexible scheduling</option>
                            <option value="weekly">Weekly matches</option>
                            <option value="daily">Daily matches</option>
                          </select>
                        </div>
                      </div>
                      <Button className="mt-4 w-full">Update Tournament Schedule</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Tournament Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Current Phase</span>
                  <Badge variant="secondary">{tournament?.status || "Registration"}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Registered Players</span>
                  <span>
                    {tournament?.current_participants || 0}/{tournament?.max_participants}
                  </span>
                </div>
                <Progress
                  value={((tournament?.current_participants || 0) / (tournament?.max_participants || 1)) * 100}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <TournamentDraftRoom tournamentId={params.id} userRole={userRole} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-500" />
                Live Tournament Bracket
              </CardTitle>
              <CardDescription>Real-time bracket progression with live match updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Live bracket will appear here once teams are formed</p>
                <p className="text-sm mt-2">Teams will be automatically created from the player pool draft</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
