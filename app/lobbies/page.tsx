"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Users, Clock, DollarSign, Crown, Gamepad2, Target, Zap } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"

interface Lobby {
  id: string
  name: string
  game_mode: string
  max_participants: number
  current_participants: number
  entry_fee: number
  prize_pool: number
  status: string
  created_at: string
  type: "lobby" | "tournament"
  tournament_type?: string
}

export default function LobbiesPage() {
  const [lobbies, setLobbies] = useState<Lobby[]>([])
  const [tournaments, setTournaments] = useState<Lobby[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchLiveContent()

    // Set up real-time subscriptions
    const lobbiesSubscription = supabase
      .channel("lobbies-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lobbies" }, () => {
        fetchLiveContent()
      })
      .subscribe()

    const tournamentsSubscription = supabase
      .channel("tournaments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => {
        fetchLiveContent()
      })
      .subscribe()

    return () => {
      lobbiesSubscription.unsubscribe()
      tournamentsSubscription.unsubscribe()
    }
  }, [])

  const fetchLiveContent = async () => {
    try {
      // Fetch lobbies
      const { data: lobbiesData } = await supabase
        .from("lobbies")
        .select("*")
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })

      // Fetch tournaments
      const { data: tournamentsData } = await supabase
        .from("tournaments")
        .select("*")
        .in("status", ["registration", "team_building", "active"])
        .order("created_at", { ascending: false })

      const formattedLobbies = (lobbiesData || []).map((lobby) => ({
        id: lobby.id,
        name: lobby.name || `${lobby.game_mode} Lobby`,
        game_mode: lobby.game_mode,
        max_participants: lobby.max_participants,
        current_participants: lobby.current_participants || 0,
        entry_fee: lobby.entry_fee || 0,
        prize_pool: lobby.prize_pool || 0,
        status: lobby.status,
        created_at: lobby.created_at,
        type: "lobby" as const,
      }))

      const formattedTournaments = (tournamentsData || []).map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        game_mode: tournament.game || "Rocket League",
        max_participants: tournament.max_participants || 32,
        current_participants: tournament.current_participants || 0,
        entry_fee: tournament.entry_fee || 0,
        prize_pool: tournament.prize_pool || 0,
        status: tournament.status,
        created_at: tournament.created_at,
        type: "tournament" as const,
        tournament_type: tournament.tournament_type,
      }))

      setLobbies(formattedLobbies)
      setTournaments(formattedTournaments)
    } catch (error) {
      console.error("Error fetching live content:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
      case "registration":
        return "bg-yellow-500"
      case "active":
      case "team_building":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getGameModeIcon = (gameMode: string) => {
    if (gameMode.includes("1v1")) return <Target className="h-4 w-4" />
    if (gameMode.includes("2v2")) return <Users className="h-4 w-4" />
    if (gameMode.includes("3v3")) return <Crown className="h-4 w-4" />
    if (gameMode.includes("4v4")) return <Trophy className="h-4 w-4" />
    return <Gamepad2 className="h-4 w-4" />
  }

  const LobbyCard = ({ lobby }: { lobby: Lobby }) => (
    <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getGameModeIcon(lobby.game_mode)}
            {lobby.name}
          </CardTitle>
          <Badge className={`${getStatusColor(lobby.status)} text-white`}>
            {lobby.status.charAt(0).toUpperCase() + lobby.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {lobby.current_participants}/{lobby.max_participants} Players
          </span>
          {lobby.type === "tournament" && lobby.tournament_type && (
            <Badge variant="outline" className="text-xs">
              {lobby.tournament_type.replace("_", " ").toUpperCase()}
            </Badge>
          )}
        </div>

        {lobby.entry_fee > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Entry: ${lobby.entry_fee}
            </span>
            <span className="flex items-center gap-1 text-green-600 font-semibold">
              <Trophy className="h-4 w-4" />
              Prize: ${lobby.prize_pool}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Created {new Date(lobby.created_at).toLocaleTimeString()}
        </div>

        <div className="flex gap-2 pt-2">
          <Button asChild size="sm" className="flex-1 bg-primary hover:bg-primary/90">
            <Link href={lobby.type === "tournament" ? `/tournaments/${lobby.id}` : `/lobbies/${lobby.id}`}>
              <Zap className="h-3 w-3 mr-1" />
              Join {lobby.type === "tournament" ? "Tournament" : "Lobby"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading live lobbies...</p>
        </div>
      </div>
    )
  }

  const allContent = [...lobbies, ...tournaments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Live Lobbies & Tournaments</h1>
        <p className="text-muted-foreground">
          Join active lobbies and tournaments from ELO drafts to competitive tournaments
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Live ({allContent.length})</TabsTrigger>
          <TabsTrigger value="lobbies">Lobbies ({lobbies.length})</TabsTrigger>
          <TabsTrigger value="tournaments">Tournaments ({tournaments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {allContent.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Live Content</h3>
                <p className="text-muted-foreground mb-4">There are currently no active lobbies or tournaments.</p>
                <Button asChild>
                  <Link href="/draft">Create New Lobby</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allContent.map((item) => (
                <LobbyCard key={`${item.type}-${item.id}`} lobby={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lobbies" className="mt-6">
          {lobbies.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Active Lobbies</h3>
                <p className="text-muted-foreground mb-4">Create a new lobby to start playing with others.</p>
                <Button asChild>
                  <Link href="/draft">Create Lobby</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lobbies.map((lobby) => (
                <LobbyCard key={lobby.id} lobby={lobby} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tournaments" className="mt-6">
          {tournaments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Active Tournaments</h3>
                <p className="text-muted-foreground mb-4">Check back later for upcoming tournaments.</p>
                <Button asChild>
                  <Link href="/tournaments/create">Create Tournament</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <LobbyCard key={tournament.id} lobby={tournament} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
