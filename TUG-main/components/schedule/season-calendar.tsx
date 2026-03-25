"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

const calendarData = {
  "2024-03-15": [
    { time: "19:00", teams: "Thunder Hawks vs Fire Dragons", type: "championship" },
    { time: "21:00", teams: "Storm Eagles vs Ice Wolves", type: "regular" },
  ],
  "2024-03-16": [{ time: "18:30", teams: "Solar Titans vs Void Runners", type: "playoff" }],
  "2024-03-18": [{ time: "20:00", teams: "Draft Event", type: "event" }],
  "2024-03-22": [{ time: "19:30", teams: "Championship Final", type: "championship" }],
}

export function SeasonCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 2, 15)) // March 2024

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  const getDateKey = (day: number) => {
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, "0")
    const dayStr = String(day).padStart(2, "0")
    return `${year}-${month}-${dayStr}`
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "championship":
        return "bg-red-500"
      case "playoff":
        return "bg-yellow-500"
      case "event":
        return "bg-blue-500"
      default:
        return "bg-green-500"
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === "next" ? 1 : -1), 1))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="h-20 p-1" />
        ))}
        {days.map((day) => {
          const dateKey = getDateKey(day)
          const events = calendarData[dateKey] || []
          const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth()

          return (
            <div
              key={day}
              className={`h-20 p-1 border rounded-md ${isToday ? "bg-primary/10 border-primary" : "border-border"}`}
            >
              <div className="text-xs font-medium mb-1">{day}</div>
              <div className="space-y-1">
                {events.slice(0, 2).map((event, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${getEventTypeColor(event.type)}`}
                    title={`${event.time} - ${event.teams}`}
                  />
                ))}
                {events.length > 2 && <div className="text-xs text-muted-foreground">+{events.length - 2}</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span>Championship</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <span>Playoff</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>Regular</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span>Event</span>
        </div>
      </div>
    </div>
  )
}
