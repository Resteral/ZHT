"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Settings } from "lucide-react"

interface DraftSchedulerProps {
  leagueId?: string
  tournamentId?: string
  onScheduled?: () => void
}

export function DraftScheduler({ leagueId, tournamentId, onScheduled }: DraftSchedulerProps) {
  const [draftData, setDraftData] = useState({
    draft_type: "auction",
    scheduled_date: "",
    duration_minutes: 120,
    settings: {
      budget: 200,
      nomination_time: 30,
      bidding_time: 10,
      auto_draft: false,
    },
  })

  const handleScheduleDraft = async () => {
    try {
      // API call to schedule draft
      console.log("Scheduling draft:", draftData)
      onScheduled?.()
    } catch (error) {
      console.error("Error scheduling draft:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Draft Day
        </CardTitle>
        <CardDescription>Set up your {leagueId ? "league" : "tournament"} draft with custom settings</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="draft-type">Draft Type</Label>
            <Select
              value={draftData.draft_type}
              onValueChange={(value) => setDraftData({ ...draftData, draft_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auction">Auction Draft</SelectItem>
                <SelectItem value="snake">Snake Draft</SelectItem>
                <SelectItem value="linear">Linear Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select
              value={draftData.duration_minutes.toString()}
              onValueChange={(value) => setDraftData({ ...draftData, duration_minutes: Number.parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="draft-date">Draft Date & Time</Label>
          <Input
            id="draft-date"
            type="datetime-local"
            value={draftData.scheduled_date}
            onChange={(e) => setDraftData({ ...draftData, scheduled_date: e.target.value })}
          />
        </div>

        {draftData.draft_type === "auction" && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Auction Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget per Team</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={draftData.settings.budget}
                    onChange={(e) =>
                      setDraftData({
                        ...draftData,
                        settings: { ...draftData.settings, budget: Number.parseInt(e.target.value) },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomination-time">Nomination Time (seconds)</Label>
                  <Input
                    id="nomination-time"
                    type="number"
                    value={draftData.settings.nomination_time}
                    onChange={(e) =>
                      setDraftData({
                        ...draftData,
                        settings: { ...draftData.settings, nomination_time: Number.parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bidding-time">Bidding Time (seconds)</Label>
                <Input
                  id="bidding-time"
                  type="number"
                  value={draftData.settings.bidding_time}
                  onChange={(e) =>
                    setDraftData({
                      ...draftData,
                      settings: { ...draftData.settings, bidding_time: Number.parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Draft Preview</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{draftData.duration_minutes} min</span>
              </div>
              <Badge variant="outline">{draftData.draft_type}</Badge>
            </div>
          </div>

          <Button onClick={handleScheduleDraft} disabled={!draftData.scheduled_date}>
            Schedule Draft
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
