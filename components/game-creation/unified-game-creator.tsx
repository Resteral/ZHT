"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, DollarSign, Crown, TrendingUp, Gamepad2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface GameType {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  bgColor: string
  route: string
  playerCount: string
  rewards: string
}

const gameTypes: GameType[] = [
  {
    id: "auction-draft",
    name: "Auction",
    icon: <DollarSign className="h-6 w-6" />,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    route: "/auction-draft", // Updated route to direct auction creation page
    playerCount: "6-10",
    rewards: "$75+",
  },
  {
    id: "create-auction",
    name: "Create Auction",
    icon: <DollarSign className="h-6 w-6" />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    route: "/auction-draft/create",
    playerCount: "Custom",
    rewards: "Host",
  },
  {
    id: "tournament",
    name: "Tournament",
    icon: <Crown className="h-6 w-6" />,
    color: "text-accent",
    bgColor: "bg-accent/10",
    route: "/tournaments",
    playerCount: "16-32",
    rewards: "$500+",
  },
  {
    id: "wager-match",
    name: "Wager",
    icon: <Target className="h-6 w-6" />,
    color: "text-gaming-danger",
    bgColor: "bg-gaming-danger/10",
    route: "/wager",
    playerCount: "2-8",
    rewards: "Custom",
  },
  {
    id: "ranked-match",
    name: "Ranked",
    icon: <TrendingUp className="h-6 w-6" />,
    color: "text-gaming-accent",
    bgColor: "bg-gaming-accent/10",
    route: "/leagues",
    playerCount: "8",
    rewards: "$60+",
  },
]

export function UnifiedGameCreator() {
  const router = useRouter()

  const handleGameTypeSelect = (gameType: GameType) => {
    router.push(gameType.route)
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-center">
          <Gamepad2 className="h-5 w-5 text-primary" />
          Choose Game Type
        </h2>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {" "}
        {/* Updated grid to accommodate 5 items */}
        {gameTypes.map((gameType) => (
          <Card
            key={gameType.id}
            className="gaming-card cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 group border-2 hover:border-primary/50"
            onClick={() => handleGameTypeSelect(gameType)}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`h-12 w-12 rounded-lg ${gameType.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <div className={gameType.color}>{gameType.icon}</div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {gameType.playerCount}
                </Badge>
              </div>
              <CardTitle className="text-sm text-center">{gameType.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center">
                <div className="text-sm font-medium text-green-600">{gameType.rewards}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
