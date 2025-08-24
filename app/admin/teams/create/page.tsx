"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function CreateTeam() {
  const [teamData, setTeamData] = useState({
    name: "",
    description: "",
    game: "",
    league: "",
    owner: "",
    maxPlayers: 5,
    budget: 10000,
    players: [] as Array<{ name: string; position: string; salary: number }>,
  })

  const games = ["Team Shooter", "Strategic Shooter", "Tactical FPS", "Zealot Hockey"]
  const leagues = ["Winter Championship", "Spring Qualifiers", "Tactical FPS Elite League", "Hockey Pro Season"]
  const owners = ["AlexChen", "SarahGamer", "MikeRod", "EmmaWilson"]

  const positions = {
    "Team Shooter": ["AWPer", "Entry Fragger", "Support", "IGL", "Lurker"],
    "Strategic Shooter": ["Entry Fragger", "Support", "Anchor", "Roamer", "IGL"],
    "Tactical FPS": ["Assault", "Support", "Sniper", "Objective"],
    "Zealot Hockey": ["Forward", "Defender", "Goalie", "Center"],
  }

  const addPlayer = () => {
    setTeamData({
      ...teamData,
      players: [...teamData.players, { name: "", position: "", salary: 1000 }],
    })
  }

  const removePlayer = (index: number) => {
    const newPlayers = teamData.players.filter((_, i) => i !== index)
    setTeamData({ ...teamData, players: newPlayers })
  }

  const updatePlayer = (index: number, field: string, value: string | number) => {
    const newPlayers = [...teamData.players]
    newPlayers[index] = { ...newPlayers[index], [field]: value }
    setTeamData({ ...teamData, players: newPlayers })
  }

  const totalSalary = teamData.players.reduce((sum, player) => sum + player.salary, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Creating team:", teamData)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/teams">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Team</h1>
          <p className="text-muted-foreground">Set up a new team with roster</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Details */}
          <Card>
            <CardHeader>
              <CardTitle>Team Details</CardTitle>
              <CardDescription>Basic team information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={teamData.name}
                  onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                  placeholder="Enter team name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game">Game</Label>
                <Select value={teamData.game} onValueChange={(value) => setTeamData({ ...teamData, game: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game} value={game}>
                        {game}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="league">League</Label>
                <Select value={teamData.league} onValueChange={(value) => setTeamData({ ...teamData, league: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select league" />
                  </SelectTrigger>
                  <SelectContent>
                    {leagues.map((league) => (
                      <SelectItem key={league} value={league}>
                        {league}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner">Team Owner</Label>
                <Select value={teamData.owner} onValueChange={(value) => setTeamData({ ...teamData, owner: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={teamData.description}
                  onChange={(e) => setTeamData({ ...teamData, description: e.target.value })}
                  placeholder="Team description..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Team Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Team Settings</CardTitle>
              <CardDescription>Configure team parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxPlayers">Maximum Players</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  value={teamData.maxPlayers}
                  onChange={(e) => setTeamData({ ...teamData, maxPlayers: Number.parseInt(e.target.value) })}
                  min="3"
                  max="15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Team Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={teamData.budget}
                  onChange={(e) => setTeamData({ ...teamData, budget: Number.parseFloat(e.target.value) })}
                  min="1000"
                  step="100"
                />
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Budget Summary</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Total Budget: ${teamData.budget.toLocaleString()}</div>
                  <div>Used: ${totalSalary.toLocaleString()}</div>
                  <div>Remaining: ${(teamData.budget - totalSalary).toLocaleString()}</div>
                  <div>
                    Players: {teamData.players.length}/{teamData.maxPlayers}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player Roster */}
        <Card>
          <CardHeader>
            <CardTitle>Player Roster</CardTitle>
            <CardDescription>Add players to the team roster</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamData.players.map((player, index) => (
              <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor={`player-${index}`}>Player Name</Label>
                  <Input
                    id={`player-${index}`}
                    value={player.name}
                    onChange={(e) => updatePlayer(index, "name", e.target.value)}
                    placeholder="Enter player name"
                  />
                </div>
                <div className="w-40">
                  <Label htmlFor={`position-${index}`}>Position</Label>
                  <Select value={player.position} onValueChange={(value) => updatePlayer(index, "position", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamData.game &&
                        positions[teamData.game as keyof typeof positions]?.map((position) => (
                          <SelectItem key={position} value={position}>
                            {position}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label htmlFor={`salary-${index}`}>Salary ($)</Label>
                  <Input
                    id={`salary-${index}`}
                    type="number"
                    value={player.salary}
                    onChange={(e) => updatePlayer(index, "salary", Number.parseFloat(e.target.value))}
                    min="500"
                    step="100"
                  />
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => removePlayer(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addPlayer}
              className="w-full bg-transparent"
              disabled={teamData.players.length >= teamData.maxPlayers}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Player ({teamData.players.length}/{teamData.maxPlayers})
            </Button>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/teams">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Create Team
          </Button>
        </div>
      </form>
    </div>
  )
}
