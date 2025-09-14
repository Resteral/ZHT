"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Trophy, Users, Clock, DollarSign } from "lucide-react"

interface EnhancedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "premium" | "tournament" | "captain"
  glowEffect?: boolean
  hoverScale?: boolean
  children: React.ReactNode
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant = "default", glowEffect = false, hoverScale = true, children, ...props }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false)

    const variants = {
      default: "border-border bg-card",
      premium: "border-amber-500/50 bg-gradient-to-br from-amber-50/10 to-orange-50/5 shadow-amber-500/20",
      tournament: "border-cyan-500/50 bg-gradient-to-br from-cyan-50/10 to-blue-50/5 shadow-cyan-500/20",
      captain: "border-purple-500/50 bg-gradient-to-br from-purple-50/10 to-pink-50/5 shadow-purple-500/20",
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative rounded-xl border transition-all duration-300",
          variants[variant],
          glowEffect && "shadow-lg",
          isHovered && glowEffect && "shadow-2xl",
          className,
        )}
        whileHover={hoverScale ? { scale: 1.02, y: -4 } : {}}
        whileTap={{ scale: 0.98 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        {...props}
      >
        {glowEffect && (
          <div
            className={cn(
              "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
              variant === "premium" && "bg-gradient-to-r from-amber-400/20 to-orange-400/20",
              variant === "tournament" && "bg-gradient-to-r from-cyan-400/20 to-blue-400/20",
              variant === "captain" && "bg-gradient-to-r from-purple-400/20 to-pink-400/20",
              isHovered && "opacity-100",
            )}
          />
        )}
        <div className="relative z-10">{children}</div>
      </motion.div>
    )
  },
)
EnhancedCard.displayName = "EnhancedCard"

interface TournamentStatsCardProps {
  title: string
  description?: string
  entryFee: number
  prizePool: number
  participants: number
  maxParticipants: number
  startTime: Date
  status: "upcoming" | "live" | "completed"
  onJoin?: () => void
  onView?: () => void
}

const TournamentStatsCard = ({
  title,
  description,
  entryFee,
  prizePool,
  participants,
  maxParticipants,
  startTime,
  status,
  onJoin,
  onView,
}: TournamentStatsCardProps) => {
  const statusColors = {
    upcoming: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    live: "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse",
    completed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  }

  const timeUntilStart = startTime.getTime() - Date.now()
  const isStartingSoon = timeUntilStart > 0 && timeUntilStart < 3600000 // 1 hour

  return (
    <EnhancedCard variant="tournament" glowEffect={status === "live"} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-balance">{title}</CardTitle>
            {description && <CardDescription className="text-sm text-muted-foreground">{description}</CardDescription>}
          </div>
          <Badge className={cn("text-xs font-medium", statusColors[status])}>
            {status === "live" && <Sparkles className="w-3 h-3 mr-1" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Entry Fee
            </div>
            <div className="text-lg font-semibold text-green-400">${entryFee.toLocaleString()}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="w-4 h-4" />
              Prize Pool
            </div>
            <div className="text-lg font-semibold text-amber-400">${prizePool.toLocaleString()}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              Participants
            </div>
            <span className="font-medium">
              {participants}/{maxParticipants}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(participants / maxParticipants) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {status === "upcoming" && (
            <span>
              Starts {startTime.toLocaleDateString()} at {startTime.toLocaleTimeString()}
              {isStartingSoon && (
                <Badge variant="outline" className="ml-2 text-xs animate-pulse">
                  Starting Soon!
                </Badge>
              )}
            </span>
          )}
          {status === "live" && <span className="text-green-400 font-medium">Live Now!</span>}
          {status === "completed" && <span>Tournament Completed</span>}
        </div>
      </CardContent>

      <CardFooter className="pt-4 gap-2">
        <AnimatePresence>
          {status === "upcoming" && participants < maxParticipants && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1"
            >
              <Button
                onClick={onJoin}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                Join Tournament
              </Button>
            </motion.div>
          )}

          {status === "live" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
              <Button
                onClick={onView}
                variant="outline"
                className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10 bg-transparent"
              >
                Watch Live
              </Button>
            </motion.div>
          )}

          {status === "completed" && (
            <Button onClick={onView} variant="outline" className="flex-1 bg-transparent">
              View Results
            </Button>
          )}
        </AnimatePresence>
      </CardFooter>
    </EnhancedCard>
  )
}

export { EnhancedCard, TournamentStatsCard }
