"use client"

import { useState, useEffect } from "react"
import { EnhancedCaptainSelection } from "@/components/tournaments/enhanced-captain-selection"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Crown, Users, Trophy } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function CaptainSelectionPage() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTournaments()
  }, [])

  const loadTournaments = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("team_based", true)
        .in("status", ["registration", "captain_selection"])
        .order("created_at", { ascending: false })

      if (error) throw error
      setTournaments(data || [])
    } catch (error) {
      console.error("Error loading tournaments:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Captain Selection</h1>
            <p className="text-slate-300">Advanced team building and captain selection system</p>
          </div>
        </div>

        {selectedTournament ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      {selectedTournament.name} - Captain Selection
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {selectedTournament.max_teams} teams
                      </Badge>
                      <Badge variant="outline">{selectedTournament.status}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedTournament(null)}>
                    View All Tournaments
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <EnhancedCaptainSelection tournament={selectedTournament} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-slate-700 rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : tournaments.length > 0 ? (
              tournaments.map((tournament) => (
                <Card
                  key={tournament.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/40"
                  onClick={() => setSelectedTournament(tournament)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      {tournament.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{tournament.status}</Badge>
                      <Badge variant="outline">Team-based</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {tournament.description || "Team-based tournament with captain selection"}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        <Trophy className="h-3 w-3 inline mr-1" />
                        {tournament.max_teams} teams
                      </span>
                      <span className="text-green-500 font-medium">${tournament.prize_pool}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Crown className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Team Tournaments Available</h3>
                <p className="text-slate-500">Check back later for team-based tournaments</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
