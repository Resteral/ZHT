"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, DollarSign, ArrowLeft, Zap } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"

export default function CreateTournamentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tournament_type: "single_elimination",
    max_participants: 16,
    entry_fee: 0,
    prize_pool: 0,
    start_date: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const tournament = await tournamentService.createTournament(formData)
      router.push(`/tournaments/${tournament.id}`)
    } catch (error) {
      console.error("Error creating tournament:", error)
    } finally {
      setLoading(false)
    }
  }

  const tournamentTypes = [
    {
      value: "single_elimination",
      label: "Single Elimination",
      description: "One loss and you're out - fast and intense",
      icon: "⚡",
    },
    {
      value: "double_elimination",
      label: "Double Elimination",
      description: "Second chances - losers bracket for redemption",
      icon: "🔄",
    },
    {
      value: "round_robin",
      label: "Round Robin",
      description: "Everyone plays everyone - most fair format",
      icon: "🔄",
    },
  ]

  const participantOptions = [8, 16, 32, 64]

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Tournament</h1>
          <p className="text-muted-foreground">Set up a new competitive tournament with brackets and prizes</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tournament Details
              </CardTitle>
              <CardDescription>Configure your tournament settings and rules</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tournament Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter an exciting tournament name"
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your tournament, rules, and what makes it special..."
                      rows={4}
                    />
                  </div>
                </div>

                {/* Tournament Type */}
                <div className="space-y-3">
                  <Label>Tournament Format</Label>
                  <div className="grid gap-3">
                    {tournamentTypes.map((type) => (
                      <div
                        key={type.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          formData.tournament_type === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setFormData({ ...formData, tournament_type: type.value })}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{type.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{type.label}</h4>
                              {formData.tournament_type === type.value && <Badge variant="secondary">Selected</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Participants & Timing */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Participants</Label>
                    <Select
                      value={formData.max_participants.toString()}
                      onValueChange={(value) => setFormData({ ...formData, max_participants: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {participantOptions.map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {num} Players
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date & Time</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Prize & Entry */}
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
                      placeholder="0.00"
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
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    "Creating Tournament..."
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Create Tournament
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tournament Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">
                    {tournamentTypes.find((t) => t.value === formData.tournament_type)?.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Players:</span>
                  <span className="font-medium">{formData.max_participants}</span>
                </div>

                {formData.start_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Starts:</span>
                    <span className="font-medium">{new Date(formData.start_date).toLocaleDateString()}</span>
                  </div>
                )}

                {formData.prize_pool > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Prize Pool:</span>
                    <span className="font-medium text-green-600">${formData.prize_pool.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-2xl">🏆</div>
                <p className="text-sm text-muted-foreground">
                  Players earn <strong>$100</strong> for each ELO game played in tournaments!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
