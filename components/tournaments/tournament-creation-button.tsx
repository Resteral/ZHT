"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Calendar, DollarSign } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

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
    if (!user) {
      toast.error("Please sign in to create tournaments")
      return
    }

    setIsCreating(true)
    console.log("[v0] Creating tournament for user:", user.id)

    try {
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id, username")
        .eq("id", user.id)
        .single()

      if (userCheckError && userCheckError.code === "PGRST116") {
        // User doesn't exist, create them
        console.log("[v0] Creating user in database:", user.id)
        const { error: userCreateError } = await supabase.from("users").insert({
          id: user.id,
          username: user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`,
          email: user.email || `${user.id}@example.com`,
          elo_rating: 1200,
          wins: 0,
          losses: 0,
          total_games: 0,
        })

        if (userCreateError) {
          console.error("[v0] Error creating user:", userCreateError)
          throw userCreateError
        }
      } else if (userCheckError) {
        console.error("[v0] Error checking user:", userCheckError)
        throw userCheckError
      }

      const tournamentData = {
        name: `${config.title} - ${new Date().toLocaleDateString()}`,
        description: `${config.description} - Join now!`,
        tournament_type: tournamentType,
        game: "Rocket League",
        status: "registration",
        max_participants: 16,
        entry_fee: 10.0,
        prize_pool: 150.0,
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
        created_by: user.id,
        team_based: true,
        max_teams: 8,
      }

      console.log("[v0] Creating tournament with data:", tournamentData)

      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .insert(tournamentData)
        .select()
        .single()

      if (tournamentError) {
        console.error("[v0] Error creating tournament:", tournamentError)
        throw tournamentError
      }

      console.log("[v0] Tournament created successfully:", tournament)
      toast.success(`${config.title} created successfully!`)

      // Redirect to tournament page
      window.location.href = `/tournaments/${tournament.id}`
    } catch (error: any) {
      console.error("[v0] Tournament creation failed:", error)
      toast.error(`Failed to create tournament: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
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

          <Button onClick={handleCreateTournament} disabled={isCreating || !user} className="w-full" size="lg">
            {isCreating ? "Creating..." : `Create ${config.title}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
