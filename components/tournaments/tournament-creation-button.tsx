"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Calendar, DollarSign } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { createBrowserClient } from "@supabase/ssr"

interface TournamentCreationButtonProps {
  tournamentType: "snake_draft" | "auction" | "linear"
  className?: string
}

export function TournamentCreationButton({ tournamentType, className }: TournamentCreationButtonProps) {
  const [isCreating, setIsCreating] = useState(false)
  const { user } = useAuth()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const tournamentConfig = {
    snake_draft: {
      title: "Snake Draft Tournament",
      description: "Captains draft players in snake order",
      icon: Trophy,
      color: "from-emerald-500 to-teal-600",
    },
    auction: {
      title: "Auction Tournament",
      description: "Bid on players with virtual currency",
      icon: DollarSign,
      color: "from-yellow-500 to-orange-600",
    },
    linear: {
      title: "Linear Draft Tournament",
      description: "Draft players in linear order",
      icon: Users,
      color: "from-blue-500 to-indigo-600",
    },
  }

  const config = tournamentConfig[tournamentType]
  const IconComponent = config.icon

  const handleCreateTournament = async () => {
    window.location.href = `/tournaments/create`
  }

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 ${className}`}>
      <CardHeader className={`bg-gradient-to-r ${config.color} text-white rounded-t-lg`}>
        <div className="flex items-center gap-3">
          <IconComponent className="h-6 w-6" />
          <div>
            <CardTitle className="text-lg">{config.title}</CardTitle>
            <CardDescription className="text-white/90 text-sm">{config.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>16 Players</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>$10 Entry</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span>$150 Prize</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>7 Days</span>
            </div>
          </div>

          <Button onClick={handleCreateTournament} disabled={isCreating} className="w-full" size="lg">
            {isCreating ? "Creating..." : `Create ${config.title}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
