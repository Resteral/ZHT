"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, DollarSign, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

const tournamentFormats = [
  {
    value: "4v4_draft",
    label: "4v4 Draft Tournament",
    players: 8,
    description: "Strategic team battles",
    reward: 400,
  },
  {
    value: "3v3_draft",
    label: "3v3 Draft Tournament",
    players: 6,
    description: "Fast-paced squad matches",
    reward: 300,
  },
  {
    value: "6v6_draft",
    label: "6v6 Draft Tournament",
    players: 12,
    description: "Large scale competitions",
    reward: 600,
  },
]

interface TournamentLobbyCreatorProps {
  onTournamentCreated?: (tournamentId: string) => void
}

export function TournamentLobbyCreator({ onTournamentCreated }: TournamentLobbyCreatorProps) {
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    format: "",
    maxParticipants: 8,
    prizePool: 400,
  })

  const router = useRouter()
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const handleFormatChange = (format: string) => {
    const selectedFormat = tournamentFormats.find((f) => f.value === format)
    if (selectedFormat) {
      setFormData((prev) => ({
        ...prev,
        format,
        maxParticipants: selectedFormat.players,
        prizePool: selectedFormat.reward,
      }))
    }
  }

  const createTournamentLobby = async () => {
    if (!isAuthenticated || !user) {
      toast.error("Please log in to create a tournament")
      return
    }

    if (!formData.name || !formData.format) {
      toast.error("Please fill in all required fields")
      return
    }

    setCreating(true)
    try {
      console.log("[v0] Creating tournament lobby...")

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          name: formData.name,
          description: formData.description,
          match_type: formData.format,
          max_participants: formData.maxParticipants,
          prize_pool: formData.prizePool,
          status: "waiting",
          creator_id: user.id,
          game: "Omega Strikers",
          tournament_mode: true, // Flag to identify as tournament
        })
        .select()
        .single()

      if (matchError) throw matchError

      const { error: participantError } = await supabase.from("match_participants").insert({
        match_id: match.id,
        user_id: user.id,
      })

      if (participantError) throw participantError

      console.log("[v0] Created tournament lobby:", match.id)
      toast.success("Tournament lobby created successfully!")

      if (onTournamentCreated) {
        onTournamentCreated(match.id)
      } else {
        router.push(`/tournaments/lobby/${match.id}`)
      }
    } catch (err) {
      console.error("[v0] Error creating tournament lobby:", err)
      toast.error(err instanceof Error ? err.message : "Failed to create tournament lobby")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create Tournament Lobby
        </CardTitle>
        <CardDescription>Create a tournament with player pool and captain draft system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tournament-name">Tournament Name *</Label>
          <Input
            id="tournament-name"
            placeholder="Enter tournament name..."
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tournament-format">Format *</Label>
          <Select value={formData.format} onValueChange={handleFormatChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select tournament format" />
            </SelectTrigger>
            <SelectContent>
              {tournamentFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{format.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {format.players} players
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tournament-description">Description</Label>
          <Textarea
            id="tournament-description"
            placeholder="Describe your tournament..."
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        {formData.format && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Max Players:</span>
              </div>
              <span className="font-medium">{formData.maxParticipants}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Prize Pool:</span>
              </div>
              <span className="font-medium text-green-600">${formData.prizePool}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span>Entry:</span>
              </div>
              <span className="font-medium text-blue-600">FREE</span>
            </div>
          </div>
        )}

        <Button
          onClick={createTournamentLobby}
          disabled={creating || !formData.name || !formData.format}
          className="w-full"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          {creating ? "Creating Tournament..." : "Create Tournament Lobby"}
        </Button>
      </CardContent>
    </Card>
  )
}
