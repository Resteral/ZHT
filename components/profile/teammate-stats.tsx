"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Users } from "lucide-react"

interface TeammateStat {
  teammate_id: string
  teammate_username: string
  teammate_avatar: string
  matches_together: number
  wins_together: number
  losses_together: number
  win_rate: number
}

export function TeammateStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState<TeammateStat[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadStats() {
      const { data, error } = await supabase
        .from("teammate_stats")
        .select("*")
        .eq("player_id", userId)
        .order("win_rate", { ascending: false })

      if (data) {
        setStats(data)
      }
      setLoading(false)
    }
    loadStats()
  }, [userId, supabase])

  if (loading) return <div className="animate-pulse h-48 bg-white/5 rounded-2xl" />
  if (stats.length === 0) return null

  const bestTeammates = stats.filter(s => s.matches_together >= 2).slice(0, 3)
  const worstTeammates = [...stats].reverse().filter(s => s.matches_together >= 2).slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-2">
        <Users className="size-5 text-primary" />
        <h3 className="text-lg font-black text-white uppercase italic tracking-wider">Combat Synergies</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Best Teammates */}
        <Card className="border-green-500/20 bg-green-500/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-green-400">
              <TrendingUp className="size-4" /> ELITE SYNERGY (BEST)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bestTeammates.length > 0 ? bestTeammates.map((s) => (
              <div key={s.teammate_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border border-green-500/30">
                    <AvatarImage src={s.teammate_avatar} />
                    <AvatarFallback>{s.teammate_username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-white">{s.teammate_username}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{s.matches_together} ENGAGEMENTS</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-green-400">{s.win_rate.toFixed(0)}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase">WIN RATE</p>
                </div>
              </div>
            )) : <p className="text-xs text-muted-foreground p-4 text-center">Insufficient data for synergy analysis.</p>}
          </CardContent>
        </Card>

        {/* Worst Teammates */}
        <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-400">
              <TrendingDown className="size-4" /> CRITICAL FRICTION (WORST)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {worstTeammates.length > 0 ? worstTeammates.map((s) => (
              <div key={s.teammate_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border border-red-500/30">
                    <AvatarImage src={s.teammate_avatar} />
                    <AvatarFallback>{s.teammate_username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-white">{s.teammate_username}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{s.matches_together} ENGAGEMENTS</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-red-400">{s.win_rate.toFixed(0)}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase">WIN RATE</p>
                </div>
              </div>
            )) : <p className="text-xs text-muted-foreground p-4 text-center">No critical friction detected.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
