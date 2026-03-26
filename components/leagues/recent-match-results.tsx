"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface MatchResult {
  id: string
  match_name: string
  winner_id: string
  winner_username: string
  winner_elo_change: number
  loser_id: string
  loser_username: string
  loser_elo_change: number
  final_score: string
  completed_at: string
}

export function RecentMatchResults() {
  const [results, setResults] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentResults()
  }, [])

  const loadRecentResults = async () => {
    try {
      const supabase = createClient()

      const { data: matches } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          description,
          updated_at,
          match_participants!inner(
            users!inner(id, username),
            final_score,
            elo_change
          )
        `)
        .eq("status", "completed")
        .eq("match_type", "captain_draft")
        .order("updated_at", { ascending: false })
        .limit(10)

      if (matches) {
        const formattedResults = matches
          .map((match) => {
            const participants = match.match_participants || []
            if (participants.length < 2) return null

            // Find winner and loser based on ELO change
            const winner = participants.find((p) => (p.elo_change || 0) > 0)
            const loser = participants.find((p) => (p.elo_change || 0) < 0)

            if (!winner || !loser) return null

            return {
              id: match.id,
              match_name: match.name,
              winner_id: winner.users.id,
              winner_username: winner.users.username,
              winner_elo_change: winner.elo_change || 0,
              loser_id: loser.users.id,
              loser_username: loser.users.username,
              loser_elo_change: loser.elo_change || 0,
              final_score: winner.final_score || "4-0",
              completed_at: match.updated_at,
            }
          })
          .filter(Boolean)
          .slice(0, 5)

        setResults(formattedResults as MatchResult[])
      }
    } catch (error) {
      console.error("Error loading recent results:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-3 border rounded-lg animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="w-24 h-4 bg-muted rounded" />
              <div className="w-16 h-4 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-muted rounded-full" />
              <div className="w-20 h-3 bg-muted rounded" />
              <div className="w-8 h-3 bg-muted rounded" />
              <div className="w-6 h-6 bg-muted rounded-full" />
              <div className="w-20 h-3 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No recent match results</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <div key={result.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">{result.match_name}</div>
            <Badge variant="outline" className="text-xs">
              {result.final_score}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{result.winner_username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium text-green-600">{result.winner_username}</div>
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />+{result.winner_elo_change}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">vs</div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-right">
                <div className="font-medium text-red-600">{result.loser_username}</div>
                <div className="text-xs text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {result.loser_elo_change}
                </div>
              </div>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{result.loser_username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">{new Date(result.completed_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}
