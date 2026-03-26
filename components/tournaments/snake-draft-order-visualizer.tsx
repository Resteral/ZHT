"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowRight, ArrowLeft, Crown, Users } from "lucide-react"

interface SnakeDraftOrderVisualizerProps {
  teams: Array<{
    id: string
    name: string
    captain_name: string
    draft_order: number
  }>
  currentRound: number
  currentPick: number
  totalRounds?: number
}

export function SnakeDraftOrderVisualizer({
  teams,
  currentRound,
  currentPick,
  totalRounds = 6,
}: SnakeDraftOrderVisualizerProps) {
  const generateDraftOrder = () => {
    const rounds = []

    for (let round = 1; round <= totalRounds; round++) {
      const roundTeams =
        round % 2 === 1
          ? [...teams].sort((a, b) => a.draft_order - b.draft_order)
          : [...teams].sort((a, b) => b.draft_order - a.draft_order)

      rounds.push({
        round,
        teams: roundTeams,
        isReversed: round % 2 === 0,
      })
    }

    return rounds
  }

  const draftRounds = generateDraftOrder()
  const currentPickInRound = ((currentPick - 1) % teams.length) + 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Snake Draft Order Visualization
        </CardTitle>
        <CardDescription>
          Shows the picking order for each round. Order reverses each round (snake pattern).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {draftRounds.map((round) => (
            <div
              key={round.round}
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                round.round === currentRound
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : round.round < currentRound
                    ? "border-green-300 bg-green-50 opacity-75"
                    : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      round.round === currentRound ? "default" : round.round < currentRound ? "secondary" : "outline"
                    }
                    className={
                      round.round === currentRound ? "bg-blue-600" : round.round < currentRound ? "bg-green-600" : ""
                    }
                  >
                    Round {round.round}
                  </Badge>
                  {round.isReversed && (
                    <Badge variant="outline" className="text-xs">
                      <ArrowLeft className="h-3 w-3 mr-1" />
                      Reversed
                    </Badge>
                  )}
                  {!round.isReversed && (
                    <Badge variant="outline" className="text-xs">
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Normal
                    </Badge>
                  )}
                </div>
                {round.round === currentRound && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Pick {currentPickInRound} of {teams.length}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {round.teams.map((team, index) => {
                  const isCurrentPick = round.round === currentRound && index + 1 === currentPickInRound
                  const pickNumber = (round.round - 1) * teams.length + index + 1

                  return (
                    <div
                      key={team.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                        isCurrentPick
                          ? "border-yellow-400 bg-yellow-100 shadow-md animate-pulse"
                          : round.round < currentRound ||
                              (round.round === currentRound && index + 1 < currentPickInRound)
                            ? "border-green-300 bg-green-100"
                            : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold min-w-[2rem] ${
                            isCurrentPick ? "border-yellow-600 text-yellow-800" : ""
                          }`}
                        >
                          #{pickNumber}
                        </Badge>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{team.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{team.captain_name}</div>
                        </div>
                      </div>
                      {isCurrentPick && <Crown className="h-4 w-4 text-yellow-600 animate-bounce" />}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Draft Pattern Explanation */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Snake Draft Pattern</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>
              • <strong>Odd rounds (1, 3, 5...):</strong> Normal order (1st → 2nd → 3rd → 4th)
            </p>
            <p>
              • <strong>Even rounds (2, 4, 6...):</strong> Reverse order (4th → 3rd → 2nd → 1st)
            </p>
            <p>• This ensures fair distribution of high-value picks across all teams</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
