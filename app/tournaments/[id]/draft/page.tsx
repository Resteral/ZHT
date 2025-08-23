"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Trophy, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
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

  const supabase = createClient()

  useEffect(() => {
    loadTournamentData()
  }, [params.id, user])

  const loadTournamentData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(`
          *,
          creator:users!tournaments_created_by_fkey(username)
        `)
        .eq("id", params.id)
        .single()

      if (tournamentError) throw tournamentError

      setTournament(tournamentData)

      // Determine user role
      if (user) {
        if (tournamentData.created_by === user.id) {
          setUserRole("organizer")
        } else {
          // Check if user is a participant
          const { data: participation } = await supabase
            .from("tournament_player_pool")
            .select("id")
            .eq("tournament_id", params.id)
            .eq("user_id", user.id)
            .single()

          if (participation) {
            setUserRole("participant")
          } else {
            // Check if user is a team captain
            const { data: captainship } = await supabase
              .from("tournament_teams")
              .select("id")
              .eq("tournament_id", params.id)
              .eq("team_captain", user.id)
              .single()

            if (captainship) {
              setUserRole("participant")
            }
          }
        }
      }

      setLoading(false)
    } catch (err) {
      console.error("Error loading tournament:", err)
      setError(err instanceof Error ? err.message : "Failed to load tournament")
      setLoading(false)
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/tournaments/${params.id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tournament
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{tournament.name} - Draft Room</h1>
          <p className="text-muted-foreground">
            {userRole === "organizer" && "You are the tournament organizer"}
            {userRole === "participant" && "You are participating in this draft"}
            {userRole === "spectator" && "You are spectating this draft"}
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
        </div>
      </div>

      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Tournament Type</div>
              <div className="capitalize">{tournament.tournament_type?.replace("_", " ")}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Max Participants</div>
              <div>{tournament.max_participants}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Entry Fee</div>
              <div>${tournament.entry_fee}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Prize Pool</div>
              <div className="text-green-600 font-medium">${tournament.prize_pool}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Draft Room */}
      <TournamentDraftRoom tournamentId={params.id} userRole={userRole} />
    </div>
  )
}
