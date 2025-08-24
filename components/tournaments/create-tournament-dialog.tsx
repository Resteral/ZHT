"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { tournamentService } from "@/lib/services/tournament-service"
import { useAuth } from "@/lib/auth-context"

interface CreateTournamentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTournamentCreated: () => void
}

export function CreateTournamentDialog({ open, onOpenChange, onTournamentCreated }: CreateTournamentDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tournament_type: "single_elimination",
    max_participants: 16,
    entry_fee: 0,
    prize_pool: 0,
    start_date: "",
    is_team_based: false,
    game: "omega_strikers",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log("[v0] Submitting tournament creation...")
      await tournamentService.createTournament(formData) // No user ID required
      console.log("[v0] Tournament created successfully")
      onTournamentCreated()
      onOpenChange(false)
      setFormData({
        name: "",
        description: "",
        tournament_type: "single_elimination",
        max_participants: 16,
        entry_fee: 0,
        prize_pool: 0,
        start_date: "",
        is_team_based: false,
        game: "omega_strikers",
      })
    } catch (error) {
      console.error("[v0] Error creating tournament:", error)
      setError(error instanceof Error ? error.message : "Failed to create tournament")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Tournament</DialogTitle>
          <DialogDescription>Set up a new tournament with brackets and prizes</DialogDescription>
        </DialogHeader>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter tournament name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your tournament"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tournament_type">Tournament Type</Label>
              <Select
                value={formData.tournament_type}
                onValueChange={(value) => setFormData({ ...formData, tournament_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_elimination">Single Elimination</SelectItem>
                  <SelectItem value="double_elimination">Double Elimination</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_participants">{formData.is_team_based ? "Max Teams" : "Max Players"}</Label>
              <Select
                value={formData.max_participants.toString()}
                onValueChange={(value) => setFormData({ ...formData, max_participants: Number.parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formData.is_team_based ? (
                    <>
                      <SelectItem value="4">4 Teams</SelectItem>
                      <SelectItem value="8">8 Teams</SelectItem>
                      <SelectItem value="16">16 Teams</SelectItem>
                      <SelectItem value="32">32 Teams</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="8">8 Players</SelectItem>
                      <SelectItem value="16">16 Players</SelectItem>
                      <SelectItem value="32">32 Players</SelectItem>
                      <SelectItem value="64">64 Players</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_fee">Entry Fee ($)</Label>
              <Input
                id="entry_fee"
                type="number"
                min="0"
                step="0.01"
                value={formData.entry_fee}
                onChange={(e) => setFormData({ ...formData, entry_fee: Number.parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prize_pool">Prize Pool ($)</Label>
              <Input
                id="prize_pool"
                type="number"
                min="0"
                step="0.01"
                value={formData.prize_pool}
                onChange={(e) => setFormData({ ...formData, prize_pool: Number.parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="game">Game</Label>
              <Select value={formData.game} onValueChange={(value) => setFormData({ ...formData, game: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="omega_strikers">Omega Strikers</SelectItem>
                  <SelectItem value="rocket_league">Rocket League</SelectItem>
                  <SelectItem value="valorant">Valorant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_team_based">Team Tournament</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_team_based"
                  checked={formData.is_team_based}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_team_based: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.is_team_based ? "Teams compete" : "Individual players"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Tournament"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
