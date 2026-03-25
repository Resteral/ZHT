"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Crown, Trophy, Star, TrendingUp } from "lucide-react"
import { useState } from "react"
import { trackProfileView } from "@/lib/services/profile-tracking-service"

interface User {
  id: string
  username: string
  avatar_url?: string
  elo_rating: number
  total_winnings: number
  tournaments_won: number
  favorite_game: string
  rank_position?: number
  is_captain?: boolean
}

interface ProfileAvatarLinkProps {
  user: User
  size?: "sm" | "md" | "lg"
  showPreview?: boolean
  pageSource?: string
  className?: string
}

export function ProfileAvatarLink({
  user,
  size = "md",
  showPreview = true,
  pageSource = "unknown",
  className = "",
}: ProfileAvatarLinkProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }

  const handleProfileView = async () => {
    if (showPreview) {
      setIsOpen(true)
      await trackProfileView(user.id, pageSource)
    } else {
      window.location.href = `/profile/${user.id}`
      await trackProfileView(user.id, pageSource)
    }
  }

  const getRankBadgeColor = (position?: number) => {
    if (!position) return "secondary"
    if (position <= 3) return "default"
    if (position <= 10) return "secondary"
    return "outline"
  }

  const ProfilePreview = () => (
    <Card className="w-80">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {user.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">{user.username}</h3>
              {user.is_captain && <Crown className="h-4 w-4 text-yellow-500" />}
            </div>
            <div className="flex items-center gap-2">
              {user.rank_position && (
                <Badge variant={getRankBadgeColor(user.rank_position)} className="text-xs">
                  #{user.rank_position}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {user.favorite_game}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">ELO</span>
            </div>
            <p className="text-2xl font-bold text-blue-500">{user.elo_rating}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Wins</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{user.tournaments_won}</p>
          </div>
        </div>

        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Total Winnings</span>
          </div>
          <p className="text-xl font-bold text-yellow-500">${user.total_winnings.toLocaleString()}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-transparent"
            onClick={() => (window.location.href = `/profile/${user.id}`)}
          >
            View Full Profile
          </Button>
          <Button variant="default" size="sm" className="flex-1">
            Challenge
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (showPreview) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className={`relative ${className}`} onClick={handleProfileView}>
            <Avatar
              className={`${sizeClasses[size]} cursor-pointer hover:ring-2 hover:ring-secondary/50 transition-all`}
            >
              <AvatarImage
                src={user.avatar_url || `/placeholder.svg?height=40&width=40&query=${user.username} avatar`}
              />
              <AvatarFallback className="bg-secondary/20 text-secondary font-bold">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {user.is_captain && <Crown className="absolute -top-1 -right-1 h-4 w-4 text-chart-4" />}
          </button>
        </DialogTrigger>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none">
          <ProfilePreview />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <button className={`relative ${className}`} onClick={handleProfileView}>
      <Avatar className={`${sizeClasses[size]} cursor-pointer hover:ring-2 hover:ring-secondary/50 transition-all`}>
        <AvatarImage src={user.avatar_url || `/placeholder.svg?height=40&width=40&query=${user.username} avatar`} />
        <AvatarFallback className="bg-secondary/20 text-secondary font-bold">
          {user.username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {user.is_captain && <Crown className="absolute -top-1 -right-1 h-4 w-4 text-chart-4" />}
    </button>
  )
}
