"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Users, Clock, DollarSign, Gamepad2, Plus, Trophy, Target } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

const draftFormats = [
  {
    name: "1v1",
    players: 2,
    description: "Head-to-head draft",
    duration: "15-20 min",
    reward: "$10",
    href: "/draft/1v1",
    color: "bg-blue-500",
    matchType: "1v1_draft",
  },
  {
    name: "2v2",
    players: 4,
    description: "Small team tactics",
    duration: "20-25 min",
    reward: "$10",
    href: "/draft/2v2",
    color: "bg-green-500",
    matchType: "2v2_draft",
  },
  {
    name: "3v3",
    players: 6,
    description: "Balanced gameplay",
    duration: "25-30 min",
    reward: "$10",
    href: "/draft/3v3",
    color: "bg-purple-500",
    matchType: "3v3_draft",
  },
  {
    name: "4v4",
    players: 8,
    description: "Strategic depth",
    duration: "30-35 min",
    reward: "$50",
    href: "/draft/4v4",
    color: "bg-orange-500",
    special: "Pass First Pick",
    matchType: "4v4_draft",
  },
  {
    name: "5v5",
    players: 10,
    description: "Full team experience",
    duration: "35-40 min",
    reward: "$10",
    href: "/draft/5v5",
    color: "bg-red-500",
    matchType: "5v5_draft",
  },
  {
    name: "6v6",
    players: 12,
    description: "Large scale battles",
    duration: "40-45 min",
    reward: "$10",
    href: "/draft/6v6",
    color: "bg-indigo-500",
    matchType: "6v6_draft",
  },
]

interface UnifiedDraftSelectorProps {
  buttonText?: string
  buttonVariant?: "default" | "outline" | "secondary"
  buttonSize?: "sm" | "default" | "lg"
  className?: string
  mode?: "browse" | "create" | "both" | "tournament" // Added tournament mode
}

export function UnifiedDraftSelector({
  buttonText = "Join Draft",
  buttonVariant = "default",
  buttonSize = "default",
  className = "",
  mode = "browse",
}: UnifiedDraftSelectorProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState<string | null>(null)
  const [tournamentMode, setTournamentMode] = useState(mode === "tournament") // Added tournament mode state
  const router = useRouter()
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const handleFormatSelect = (format: (typeof draftFormats)[0]) => {
    if (mode === "browse") {
      setOpen(false)
      router.push(format.href)
    }
  }

  const createLobby = async (format: (typeof draftFormats)[0]) => {
    if (!isAuthenticated || !user) {
      toast.error("Please log in to create a lobby")
      return
    }

    setCreating(format.name)
    try {
      console.log(`[v0] Creating ${tournamentMode ? "tournament" : "lobby"} for ${format.name}...`)

      const lobbyName = tournamentMode
        ? `${format.name} Tournament - ${new Date().toLocaleDateString()}`
        : `${format.name} Draft Lobby - ${new Date().toLocaleTimeString()}`

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          name: lobbyName,
          match_type: format.matchType,
          max_participants: format.players,
          prize_pool: tournamentMode ? format.players * 50 : format.players * 10, // Higher prize for tournaments
          status: "waiting",
          creator_id: user.id,
          game: "Omega Strikers",
          tournament_mode: tournamentMode, // Set tournament mode flag
          description: tournamentMode
            ? `Tournament with player pool and ELO-based captain selection. Join the player pool to be drafted!`
            : `Quick ${format.name} draft lobby. Join and play immediately!`,
        })
        .select()
        .single()

      if (matchError) throw matchError

      const { error: participantError } = await supabase.from("match_participants").insert({
        match_id: match.id,
        user_id: user.id,
      })

      if (participantError) throw participantError

      console.log(`[v0] Created ${tournamentMode ? "tournament" : "lobby"}:`, match.id)
      setOpen(false)

      if (tournamentMode) {
        router.push(`/tournaments/lobby/${match.id}`)
        toast.success(`Tournament created! Share the link for others to join the player pool.`)
      } else {
        router.push(`/leagues/lobby/${match.id}`)
        toast.success(`${format.name} lobby created successfully!`)
      }
    } catch (error) {
      console.error("Error creating lobby:", error)
      toast.error(`Failed to create ${format.name} ${tournamentMode ? "tournament" : "lobby"}: ${error.message}`)
    } finally {
      setCreating(null)
    }
  }

  const getButtonText = () => {
    if (mode === "tournament") return "Create Tournament"
    if (mode === "create") return "Create Lobby"
    if (mode === "both") return "Draft Options"
    return buttonText
  }

  const getDialogTitle = () => {
    if (mode === "tournament") return "Create Tournament"
    if (mode === "create") return "Create Draft Lobby"
    if (mode === "both") return "Draft Options"
    return "Select Draft Format"
  }

  const getDialogDescription = () => {
    if (mode === "tournament") return "Create tournaments with player pools and ELO-based captain selection!"
    if (mode === "create") return "Create a new lobby for any draft format. All formats are FREE with rewards!"
    if (mode === "both") return "Browse existing lobbies or create new ones. All formats are FREE with rewards!"
    return "Choose your preferred team format for ELO draft matches. All formats are FREE with rewards!"
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={className}>
          <Gamepad2 className="h-4 w-4 mr-2" />
          {getButtonText()}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {(mode === "create" || mode === "both") && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="tournament-mode" className="text-sm font-medium">
                Tournament Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                {tournamentMode
                  ? "Create tournament with player pool and captain draft system"
                  : "Create quick lobby for immediate play"}
              </p>
            </div>
            <Switch id="tournament-mode" checked={tournamentMode} onCheckedChange={setTournamentMode} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {draftFormats.map((format) => (
            <Card
              key={format.name}
              className="hover:shadow-md transition-all cursor-pointer hover:scale-105"
              onClick={() => (mode === "browse" ? handleFormatSelect(format) : undefined)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-10 w-10 rounded-lg ${format.color} flex items-center justify-center`}>
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="secondary">{format.players} Players</Badge>
                </div>
                <CardTitle className="text-lg">
                  {format.name}{" "}
                  {tournamentMode && (mode === "create" || mode === "both" || mode === "tournament")
                    ? "Tournament"
                    : "Draft"}
                </CardTitle>
                <CardDescription>
                  {tournamentMode && (mode === "create" || mode === "both" || mode === "tournament")
                    ? `Tournament with player pool and captain selection`
                    : format.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{tournamentMode ? "Variable" : format.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span className="text-green-600 font-medium">
                      {tournamentMode ? `$${format.players * 50}` : format.reward}
                    </span>
                  </div>
                </div>

                {tournamentMode && (mode === "create" || mode === "both" || mode === "tournament") && (
                  <div className="space-y-1">
                    <Badge variant="outline" className="w-full justify-center text-xs">
                      <Target className="h-3 w-3 mr-1" />
                      Player Pool System
                    </Badge>
                    <Badge variant="outline" className="w-full justify-center text-xs">
                      <Trophy className="h-3 w-3 mr-1" />
                      ELO-Based Captains
                    </Badge>
                  </div>
                )}

                {format.special && !tournamentMode && (
                  <Badge variant="outline" className="w-full justify-center text-xs">
                    {format.special}
                  </Badge>
                )}

                <div className="space-y-2">
                  {(mode === "create" || mode === "both" || mode === "tournament") && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        createLobby(format)
                      }}
                      disabled={creating === format.name}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {creating === format.name
                        ? "Creating..."
                        : `Create ${tournamentMode ? "Tournament" : format.name}`}
                    </Button>
                  )}

                  {(mode === "browse" || mode === "both") && (
                    <Button
                      size="sm"
                      variant={mode === "both" ? "outline" : "default"}
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFormatSelect(format)
                      }}
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      Browse {format.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">FREE Entry</Badge>
              <span>No cost to join</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {tournamentMode && (mode === "create" || mode === "both" || mode === "tournament")
                  ? "$50-$600 Prize"
                  : "$10-$50 Reward"}
              </Badge>
              <span>Per {tournamentMode ? "tournament" : "player"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                ELO Rating
              </Badge>
              <span>Skill tracking</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
