"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Crown, Medal, Award, Star, DollarSign, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface EloLeagueReward {
  reward_id: string
  season_name: string
  division: string
  final_rank: number
  trophy_title: string
  trophy_description: string
  trophy_icon: string
  trophy_rarity: string
  monetary_reward: number
  achievement_points: number
  awarded_at: string
  status: string
}

interface EloLeagueRewardsProps {
  userId: string
}

export function EloLeagueRewards({ userId }: EloLeagueRewardsProps) {
  const [rewards, setRewards] = useState<EloLeagueReward[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingReward, setClaimingReward] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchEloLeagueRewards()
  }, [userId])

  const fetchEloLeagueRewards = async () => {
    try {
      const { data, error } = await supabase.rpc("get_user_elo_league_rewards", {
        user_id_param: userId,
      })

      if (error) {
        console.error("Error fetching ELO league rewards:", error)
      } else {
        setRewards(data || [])
      }
    } catch (error) {
      console.error("Error fetching ELO league rewards:", error)
    } finally {
      setLoading(false)
    }
  }

  const claimReward = async (rewardId: string) => {
    setClaimingReward(rewardId)
    try {
      const { data, error } = await supabase.rpc("claim_elo_league_reward", {
        reward_id_param: rewardId,
        user_id_param: userId,
      })

      if (error) {
        console.error("Error claiming reward:", error)
      } else if (data) {
        // Refresh rewards list
        await fetchEloLeagueRewards()
      }
    } catch (error) {
      console.error("Error claiming reward:", error)
    } finally {
      setClaimingReward(null)
    }
  }

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "crown":
        return Crown
      case "medal":
        return Medal
      case "award":
        return Award
      case "star":
        return Star
      case "trophy":
        return Trophy
      default:
        return Trophy
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "bg-gray-500/20 text-gray-500 border-gray-500/30"
      case "uncommon":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      case "rare":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30"
      case "epic":
        return "bg-purple-500/20 text-purple-500 border-purple-500/30"
      case "legendary":
        return "bg-orange-500/20 text-orange-500 border-orange-500/30"
      case "mythic":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30"
    }
  }

  const getDivisionColor = (division: string) => {
    switch (division) {
      case "premier":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
      case "championship":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30"
      case "league_one":
        return "bg-green-500/20 text-green-600 border-green-500/30"
      case "league_two":
        return "bg-gray-500/20 text-gray-600 border-gray-500/30"
      default:
        return "bg-gray-500/20 text-gray-600 border-gray-500/30"
    }
  }

  const formatDivisionName = (division: string) => {
    switch (division) {
      case "premier":
        return "Premier"
      case "championship":
        return "Championship"
      case "league_one":
        return "League One"
      case "league_two":
        return "League Two"
      default:
        return division
    }
  }

  const totalEarnings = rewards.reduce((sum, reward) => sum + reward.monetary_reward, 0)
  const totalPoints = rewards.reduce((sum, reward) => sum + reward.achievement_points, 0)
  const pendingRewards = rewards.filter((r) => r.status === "pending")

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              ELO League Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground">Loading ELO league rewards...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Reward Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            ELO League Rewards Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{rewards.length}</div>
              <div className="text-sm text-muted-foreground">Total Rewards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${totalEarnings.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalPoints}</div>
              <div className="text-sm text-muted-foreground">Achievement Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingRewards.length}</div>
              <div className="text-sm text-muted-foreground">Pending Claims</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              ELO League Achievements
            </span>
            <Badge variant="secondary">
              {rewards.length} {rewards.length === 1 ? "Reward" : "Rewards"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No ELO league rewards yet</p>
              <p className="text-sm">Compete in seasonal ELO leagues to earn rewards!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rewards.map((reward) => {
                const IconComponent = getIconComponent(reward.trophy_icon)
                return (
                  <Card
                    key={reward.reward_id}
                    className={`${reward.status === "pending" ? "border-primary/50 bg-primary/5" : "border-border"}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <IconComponent className="h-8 w-8 text-primary mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{reward.trophy_title}</h3>
                              <Badge variant="outline" className={getRarityColor(reward.trophy_rarity)}>
                                {reward.trophy_rarity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{reward.trophy_description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Badge variant="outline" className={getDivisionColor(reward.division)}>
                                  {formatDivisionName(reward.division)}
                                </Badge>
                                Rank #{reward.final_rank}
                              </span>
                              <span>{reward.season_name}</span>
                              <span>{new Date(reward.awarded_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-2">
                            {reward.monetary_reward > 0 && (
                              <Badge variant="outline" className="bg-green-500/20 text-green-600">
                                <DollarSign className="h-3 w-3 mr-1" />${reward.monetary_reward.toFixed(2)}
                              </Badge>
                            )}
                            {reward.achievement_points > 0 && (
                              <Badge variant="outline" className="bg-blue-500/20 text-blue-600">
                                <Zap className="h-3 w-3 mr-1" />
                                {reward.achievement_points} pts
                              </Badge>
                            )}
                          </div>
                          {reward.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => claimReward(reward.reward_id)}
                              disabled={claimingReward === reward.reward_id}
                            >
                              {claimingReward === reward.reward_id ? "Claiming..." : "Claim Reward"}
                            </Button>
                          )}
                          {reward.status === "claimed" && (
                            <Badge variant="outline" className="bg-green-500/20 text-green-600">
                              ✓ Claimed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
