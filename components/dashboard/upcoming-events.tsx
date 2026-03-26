"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Event {
  id: string
  type: string
  title: string
  description: string
  time: string
  status: string
  icon: any
  color: string
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUpcomingEvents()
  }, [])

  const fetchUpcomingEvents = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const eventList: Event[] = []

      // Fetch upcoming tournaments
      const { data: tournaments } = await supabase
        .from("tournaments")
        .select("*")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(3)

      tournaments?.forEach((tournament) => {
        eventList.push({
          id: tournament.id,
          type: "tournament",
          title: tournament.name,
          description: `Tournament starting soon`,
          time: new Date(tournament.start_date).toLocaleString(),
          status: "upcoming",
          icon: Trophy,
          color: "bg-blue-500/10 text-blue-500",
        })
      })

      // Fetch upcoming matches
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .eq("user_id", user.user.id)
        .eq("status", "scheduled")
        .order("scheduled_time", { ascending: true })
        .limit(2)

      matches?.forEach((match) => {
        eventList.push({
          id: match.id,
          type: "match",
          title: `${match.game_type} Match`,
          description: match.description || "Scheduled match",
          time: new Date(match.scheduled_time).toLocaleString(),
          status: "scheduled",
          icon: Calendar,
          color: "bg-green-500/10 text-green-500",
        })
      })

      // Sort by time
      eventList.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      setEvents(eventList.slice(0, 4))
    } catch (error) {
      console.error("Error fetching upcoming events:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Loading upcoming events...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
        <CardDescription>Important dates and deadlines</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No upcoming events</p>
            <p className="text-sm">Check back later for new tournaments and matches!</p>
          </div>
        ) : (
          events.map((event) => {
            const Icon = event.icon
            return (
              <div key={event.id} className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${event.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{event.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {event.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{event.time}</span>
                    </div>
                  </div>
                </div>
                {event.type === "tournament" && (
                  <Button size="sm" className="w-full">
                    View Tournament
                  </Button>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
