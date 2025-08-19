import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Star, Target, Zap, Crown, Shield, Sword, Award } from "lucide-react"

interface ProfileAchievementsProps {
  userId: string
}

export function ProfileAchievements({ userId }: ProfileAchievementsProps) {
  // Mock achievements data - in real app, fetch from Supabase
  const achievements = [
    {
      id: 1,
      title: "First Victory",
      description: "Win your first match",
      icon: Trophy,
      unlocked: true,
      rarity: "Common",
      unlockedAt: "2023-06-16",
    },
    {
      id: 2,
      title: "Winning Streak",
      description: "Win 5 matches in a row",
      icon: Star,
      unlocked: true,
      rarity: "Uncommon",
      unlockedAt: "2023-07-02",
    },
    {
      id: 3,
      title: "Tournament Champion",
      description: "Win a tournament",
      icon: Crown,
      unlocked: true,
      rarity: "Rare",
      unlockedAt: "2023-08-15",
    },
    {
      id: 4,
      title: "High Roller",
      description: "Win $1000 in betting",
      icon: Target,
      unlocked: true,
      rarity: "Epic",
      unlockedAt: "2023-09-10",
    },
    {
      id: 5,
      title: "Diamond Rank",
      description: "Reach Diamond rank",
      icon: Shield,
      unlocked: true,
      rarity: "Epic",
      unlockedAt: "2023-10-05",
    },
    {
      id: 6,
      title: "Perfect Game",
      description: "Win without losing a unit",
      icon: Sword,
      unlocked: false,
      rarity: "Legendary",
      unlockedAt: null,
    },
    {
      id: 7,
      title: "Grand Master",
      description: "Reach Grand Master rank",
      icon: Award,
      unlocked: false,
      rarity: "Legendary",
      unlockedAt: null,
    },
    {
      id: 8,
      title: "Ultimate Champion",
      description: "Win 10 tournaments",
      icon: Zap,
      unlocked: false,
      rarity: "Mythic",
      unlockedAt: null,
    },
  ]

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "Common":
        return "bg-gray-500/20 text-gray-500 border-gray-500/30"
      case "Uncommon":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      case "Rare":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30"
      case "Epic":
        return "bg-purple-500/20 text-purple-500 border-purple-500/30"
      case "Legendary":
        return "bg-orange-500/20 text-orange-500 border-orange-500/30"
      case "Mythic":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30"
    }
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const totalCount = achievements.length

  return (
    <div className="space-y-6">
      {/* Achievement Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Achievement Progress
            </span>
            <Badge variant="secondary">
              {unlockedCount}/{totalCount}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">
            {((unlockedCount / totalCount) * 100).toFixed(1)}% Complete
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Achievement Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {achievements.map((achievement) => (
          <Card
            key={achievement.id}
            className={`relative transition-all duration-200 ${
              achievement.unlocked ? "border-primary/30 bg-primary/5" : "opacity-60 grayscale"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <achievement.icon
                  className={`h-8 w-8 ${achievement.unlocked ? "text-primary" : "text-muted-foreground"}`}
                />
                <Badge variant="outline" className={getRarityColor(achievement.rarity)}>
                  {achievement.rarity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <h3 className="font-semibold mb-1">{achievement.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
              {achievement.unlocked && achievement.unlockedAt && (
                <div className="text-xs text-muted-foreground">
                  Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                </div>
              )}
              {!achievement.unlocked && <div className="text-xs text-muted-foreground">🔒 Locked</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
