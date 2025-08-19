"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Calendar, Clock } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Game {
  id: string
  name: string
  display_name: string
}

interface Venue {
  id: string
  name: string
  location: string
}

interface Tournament {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
}

export default function CreateGame() {
  const [gameData, setGameData] = useState({
    title: "",
    game: "",
    team1: "",
    team2: "",
    tournament: "",
    venue: "",
    scheduledDate: "",
    scheduledTime: "",
    description: "",
    entryFee: 0,
    prizePool: 0,
  })

  const [games, setGames] = useState<Game[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load games
      const { data: gamesData } = await supabase
        .from("games")
        .select("id, name, display_name")
        .eq("is_active", true)
        .order("display_name")

      // Load venues
      const { data: venuesData } = await supabase
        .from("venues")
        .select("id, name, location")
        .eq("is_active", true)
        .order("name")

      // Load tournaments
      const { data: tournamentsData } = await supabase
        .from("tournaments")
        .select("id, name")
        .eq("status", "active")
        .order("name")

      // Load teams
      const { data: teamsData } = await supabase.from("teams").select("id, name").eq("is_active", true).order("name")

      setGames(gamesData || [])
      setVenues(venuesData || [])
      setTournaments(tournamentsData || [])
      setTeams(teamsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase.from("scheduled_games").insert({
        title: gameData.title,
        game_id: gameData.game,
        team1_id: gameData.team1,
        team2_id: gameData.team2,
        tournament_id: gameData.tournament || null,
        venue_id: gameData.venue,
        scheduled_date: gameData.scheduledDate,
        scheduled_time: gameData.scheduledTime,
        description: gameData.description,
        entry_fee: gameData.entryFee,
        prize_pool: gameData.prizePool,
        status: "scheduled",
      })

      if (error) throw error

      // Redirect to games list
      window.location.href = "/admin/games"
    } catch (error) {
      console.error("Error creating game:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading game creation form...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/games">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Schedule New Game</h1>
          <p className="text-muted-foreground">Create a new game or match</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Details */}
          <Card>
            <CardHeader>
              <CardTitle>Game Details</CardTitle>
              <CardDescription>Basic information about the game</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Game Title</Label>
                <Input
                  id="title"
                  value={gameData.title}
                  onChange={(e) => setGameData({ ...gameData, title: e.target.value })}
                  placeholder="Enter game title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game">Game Type</Label>
                <Select value={gameData.game} onValueChange={(value) => setGameData({ ...gameData, game: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select game type" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game.id} value={game.id}>
                        {game.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tournament">Tournament</Label>
                <Select
                  value={gameData.tournament}
                  onValueChange={(value) => setGameData({ ...gameData, tournament: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Tournament</SelectItem>
                    {tournaments.map((tournament) => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Select value={gameData.venue} onValueChange={(value) => setGameData({ ...gameData, venue: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name} {venue.location && `- ${venue.location}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={gameData.description}
                  onChange={(e) => setGameData({ ...gameData, description: e.target.value })}
                  placeholder="Game description or notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Teams and Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Teams & Schedule</CardTitle>
              <CardDescription>Select teams and set the schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team1">Team 1</Label>
                <Select value={gameData.team1} onValueChange={(value) => setGameData({ ...gameData, team1: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select first team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team2">Team 2</Label>
                <Select value={gameData.team2} onValueChange={(value) => setGameData({ ...gameData, team2: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select second team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      .filter((team) => team.id !== gameData.team1)
                      .map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={gameData.scheduledDate}
                      onChange={(e) => setGameData({ ...gameData, scheduledDate: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={gameData.scheduledTime}
                      onChange={(e) => setGameData({ ...gameData, scheduledTime: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryFee">Entry Fee ($)</Label>
                  <Input
                    id="entryFee"
                    type="number"
                    value={gameData.entryFee}
                    onChange={(e) => setGameData({ ...gameData, entryFee: Number.parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prizePool">Prize Pool ($)</Label>
                  <Input
                    id="prizePool"
                    type="number"
                    value={gameData.prizePool}
                    onChange={(e) => setGameData({ ...gameData, prizePool: Number.parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/games">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Schedule Game
          </Button>
        </div>
      </form>
    </div>
  )
}
