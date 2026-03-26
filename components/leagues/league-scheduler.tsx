"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Trophy, Plus, Edit, Trash2, Crown } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Team {
  id: string
  name: string
  wins: number
  losses: number
  points: number
}

interface Game {
  id: string
  team1_id: string
  team2_id: string
  team1_name: string
  team2_name: string
  scheduled_date: string
  status: "scheduled" | "in_progress" | "completed"
  team1_score: number
  team2_score: number
  game_type: "regular" | "playoff_semi" | "playoff_final"
  series_info?: {
    series_id: string
    game_number: number
    best_of: number
  }
}

interface LeagueSchedulerProps {
  leagueId: string
  isCreator: boolean
}

export function LeagueScheduler({ leagueId, isCreator }: LeagueSchedulerProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [gameForm, setGameForm] = useState({
    team1_id: "",
    team2_id: "",
    scheduled_date: "",
    game_type: "regular" as "regular" | "playoff_semi" | "playoff_final",
    best_of: 1,
  })

  useEffect(() => {
    loadLeagueData()
  }, [leagueId])

  const loadLeagueData = async () => {
    try {
      // Load teams and games for the league
      // This would connect to your tournament service
      setLoading(false)
    } catch (error) {
      console.error("Error loading league data:", error)
      toast({
        title: "Error",
        description: "Failed to load league data",
        variant: "destructive",
      })
    }
  }

  const handleCreateGame = async () => {
    if (!gameForm.team1_id || !gameForm.team2_id || !gameForm.scheduled_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (gameForm.team1_id === gameForm.team2_id) {
      toast({
        title: "Error",
        description: "Teams cannot play against themselves",
        variant: "destructive",
      })
      return
    }

    try {
      const gameData = {
        league_id: leagueId,
        team1_id: gameForm.team1_id,
        team2_id: gameForm.team2_id,
        scheduled_date: gameForm.scheduled_date,
        game_type: gameForm.game_type,
        series_info:
          gameForm.game_type !== "regular"
            ? {
                best_of: gameForm.game_type === "playoff_semi" ? 3 : 5,
              }
            : undefined,
      }

      console.log("[v0] Creating scheduled game:", gameData)

      // Here you would call your league service to create the game
      // await leagueService.createScheduledGame(gameData)

      setShowCreateGame(false)
      setGameForm({
        team1_id: "",
        team2_id: "",
        scheduled_date: "",
        game_type: "regular",
        best_of: 1,
      })

      toast({
        title: "Success",
        description: "Game scheduled successfully",
      })

      loadLeagueData()
    } catch (error) {
      console.error("Error creating game:", error)
      toast({
        title: "Error",
        description: "Failed to schedule game",
        variant: "destructive",
      })
    }
  }

  const getGameTypeLabel = (gameType: string) => {
    switch (gameType) {
      case "playoff_semi":
        return "Playoff Semi-Final (Best of 3)"
      case "playoff_final":
        return "Playoff Final (Best of 5)"
      default:
        return "Regular Season"
    }
  }

  const getGameTypeColor = (gameType: string) => {
    switch (gameType) {
      case "playoff_semi":
        return "bg-orange-500"
      case "playoff_final":
        return "bg-red-500"
      default:
        return "bg-blue-500"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">League Schedule</h3>
          <p className="text-muted-foreground">Manually scheduled games and playoffs</p>
        </div>

        {isCreator && (
          <Dialog open={showCreateGame} onOpenChange={setShowCreateGame}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Game
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule New Game</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Game Type</Label>
                  <Select
                    value={gameForm.game_type}
                    onValueChange={(value) => setGameForm({ ...gameForm, game_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular Season Game</SelectItem>
                      <SelectItem value="playoff_semi">Playoff Semi-Final (Best of 3)</SelectItem>
                      <SelectItem value="playoff_final">Playoff Final (Best of 5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Team 1</Label>
                    <Select
                      value={gameForm.team1_id}
                      onValueChange={(value) => setGameForm({ ...gameForm, team1_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
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
                    <Label>Team 2</Label>
                    <Select
                      value={gameForm.team2_id}
                      onValueChange={(value) => setGameForm({ ...gameForm, team2_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams
                          .filter((team) => team.id !== gameForm.team1_id)
                          .map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Scheduled Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={gameForm.scheduled_date}
                    onChange={(e) => setGameForm({ ...gameForm, scheduled_date: e.target.value })}
                  />
                </div>

                <Button onClick={handleCreateGame} className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Game
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {games.filter((g) => g.game_type === "regular").length}
            </div>
            <div className="text-sm text-muted-foreground">Regular Season Games</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {games.filter((g) => g.game_type === "playoff_semi").length}
            </div>
            <div className="text-sm text-muted-foreground">Semi-Final Games</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {games.filter((g) => g.game_type === "playoff_final").length}
            </div>
            <div className="text-sm text-muted-foreground">Final Games</div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Games
          </CardTitle>
          <CardDescription>All games are manually scheduled by the league creator</CardDescription>
        </CardHeader>

        <CardContent>
          {games.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">No Games Scheduled</h4>
              <p className="text-muted-foreground">
                {isCreator
                  ? "Start scheduling games for your league using the button above."
                  : "The league creator will schedule games manually."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {games
                .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                .map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Badge className={`${getGameTypeColor(game.game_type)} text-white`}>
                        {game.game_type === "playoff_semi" && <Crown className="h-3 w-3 mr-1" />}
                        {game.game_type === "playoff_final" && <Trophy className="h-3 w-3 mr-1" />}
                        {getGameTypeLabel(game.game_type)}
                      </Badge>

                      <div className="flex items-center gap-2">
                        <span className="font-medium">{game.team1_name}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="font-medium">{game.team2_name}</span>
                      </div>

                      {game.status === "completed" && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {game.team1_score} - {game.team2_score}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{new Date(game.scheduled_date).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(game.scheduled_date).toLocaleTimeString()}
                        </div>
                      </div>

                      <Badge
                        variant={
                          game.status === "completed"
                            ? "default"
                            : game.status === "in_progress"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {game.status === "completed"
                          ? "Completed"
                          : game.status === "in_progress"
                            ? "Live"
                            : "Scheduled"}
                      </Badge>

                      {isCreator && game.status === "scheduled" && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* League Standings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            League Standings
          </CardTitle>
          <CardDescription>Current team rankings based on completed games</CardDescription>
        </CardHeader>

        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">No Teams Yet</h4>
              <p className="text-muted-foreground">Teams will appear here once they join the league.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams
                .sort((a, b) => b.points - a.points || b.wins - a.wins)
                .map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{team.name}</span>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold">{team.wins}</div>
                        <div className="text-muted-foreground">Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{team.losses}</div>
                        <div className="text-muted-foreground">Losses</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-primary">{team.points}</div>
                        <div className="text-muted-foreground">Points</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
