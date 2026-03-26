"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Activity {
  id: string
  type: string
  title: string
  description: string
  amount?: string
  time: string
  icon: any
  iconColor: string
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      // Fetch recent match participations instead of matches by user_id
      const { data: matchParticipations } = await supabase
        .from("match_participants")
        .select(`
          match_id,
          created_at,
          matches!inner(
            id,
            name,
            match_type,
            status,
            description
          )
        `)
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      let transactions = null
      try {
        const { data: transactionData } = await supabase
          .from("user_transactions")
          .select("*")
          .eq("user_id", user.user.id)
          .order("created_at", { ascending: false })
          .limit(5)
        transactions = transactionData
      } catch (error) {
        console.error("Error fetching transactions:", error)
      }

      if (!transactions) {
        console.log("[v0] No transactions available")
        transactions = []
      }

      // Convert to activity format
      const activityList: Activity[] = []

      matchParticipations?.forEach((participation) => {
        const match = participation.matches
        activityList.push({
          id: match.id,
          type: "match_joined",
          title: `Joined ${match.match_type.replace("_", " ").toUpperCase()}`,
          description: match.name || match.description || "Draft Match",
          amount: match.status === "completed" ? "+$25.00" : undefined,
          time: new Date(participation.created_at).toLocaleString(),
          icon: match.status === "completed" ? CheckCircle : Trophy,
          iconColor: match.status === "completed" ? "text-green-500" : "text-blue-500",
        })
      })

      transactions?.forEach((transaction) => {
        activityList.push({
          id: transaction.id,
          type: transaction.type,
          title: `${transaction.type === "credit" ? "Earned" : "Spent"} $${Math.abs(transaction.amount).toFixed(2)}`,
          description: transaction.description || "Transaction",
          amount: `${transaction.type === "credit" ? "+" : "-"}$${Math.abs(transaction.amount).toFixed(2)}`,
          time: new Date(transaction.created_at).toLocaleString(),
          icon: transaction.type === "credit" ? CheckCircle : XCircle,
          iconColor: transaction.type === "credit" ? "text-green-500" : "text-red-500",
        })
      })

      // Sort by time and limit to 5
      activityList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setActivities(activityList.slice(0, 5))
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Loading your latest actions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-start space-x-3">
                <div className="w-4 h-4 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
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
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest actions and results</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Start playing to see your activity here!</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`mt-1 ${activity.iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{activity.title}</p>
                    {activity.amount && (
                      <Badge
                        variant="secondary"
                        className={
                          activity.amount.startsWith("+")
                            ? "bg-green-500/10 text-green-500"
                            : activity.amount.startsWith("-")
                              ? "bg-red-500/10 text-red-500"
                              : "bg-blue-500/10 text-blue-500"
                        }
                      >
                        {activity.amount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
