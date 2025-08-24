"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Plus } from "lucide-react"
import Link from "next/link"

export default function CreatePlayer() {
  const [playerData, setPlayerData] = useState({
    name: "",
    game: "",
    position: "",
    elo: 1500,
    bio: "",
    country: "",
    team: "",
    achievements: [] as string[],
  })

  const games = ["Team Shooter", "Strategic Shooter", "Tactical FPS", "Zealot Hockey"]

  const positions = {
    "Team Shooter": ["AWPer", "Entry Fragger", "Support", "IGL", "Lurker"],
    "Strategic Shooter": ["Entry Fragger", "Support", "Anchor", "Roamer", "IGL"],
    "Tactical FPS": ["Assault", "Support", "Sniper", "Objective"],
    "Zealot Hockey": ["Forward", "Defender", "Goalie", "Center"],
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle player creation
    console.log("Creating player:", playerData)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/players">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Players
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Player</h1>
          <p className="text-muted-foreground">Add a new player to the platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the player's basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Player Name</Label>
                <Input
                  id="name"
                  value={playerData.name}
                  onChange={(e) => setPlayerData({ ...playerData, name: e.target.value })}
                  placeholder="Enter player name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game">Game</Label>
                <Select
                  value={playerData.game}
                  onValueChange={(value) => setPlayerData({ ...playerData, game: value, position: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game" />
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

              {playerData.game && (
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select
                    value={playerData.position}
                    onValueChange={(value) => setPlayerData({ ...playerData, position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions[playerData.game as keyof typeof positions]?.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={playerData.country}
                  onChange={(e) => setPlayerData({ ...playerData, country: e.target.value })}
                  placeholder="Player's country"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Current Team</Label>
                <Input
                  id="team"
                  value={playerData.team}
                  onChange={(e) => setPlayerData({ ...playerData, team: e.target.value })}
                  placeholder="Current team (optional)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance Data */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Data</CardTitle>
              <CardDescription>Set initial performance statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="elo">Starting ELO Rating</Label>
                <Input
                  id="elo"
                  type="number"
                  value={playerData.elo}
                  onChange={(e) => setPlayerData({ ...playerData, elo: Number.parseInt(e.target.value) })}
                  min="1000"
                  max="3000"
                />
                <p className="text-sm text-muted-foreground">
                  Default: 1500 (Beginner: 1000-1500, Intermediate: 1500-2000, Advanced: 2000+)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Player Bio</Label>
                <Textarea
                  id="bio"
                  value={playerData.bio}
                  onChange={(e) => setPlayerData({ ...playerData, bio: e.target.value })}
                  placeholder="Brief description of the player..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Achievements</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {playerData.achievements.map((achievement, index) => (
                    <Badge key={index} variant="secondary">
                      {achievement}
                      <button
                        type="button"
                        onClick={() => {
                          const newAchievements = [...playerData.achievements]
                          newAchievements.splice(index, 1)
                          setPlayerData({ ...playerData, achievements: newAchievements })
                        }}
                        className="ml-2 text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add achievement..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const input = e.target as HTMLInputElement
                        if (input.value.trim()) {
                          setPlayerData({
                            ...playerData,
                            achievements: [...playerData.achievements, input.value.trim()],
                          })
                          input.value = ""
                        }
                      }
                    }}
                  />
                  <Button type="button" size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/players">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Create Player
          </Button>
        </div>
      </form>
    </div>
  )
}
