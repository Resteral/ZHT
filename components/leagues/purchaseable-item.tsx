"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Clock } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface PurchaseableItemProps {
  item: {
    id: string
    name: string
    description: string
    price: number
    category: string
    icon: LucideIcon
    rarity: string
    duration: string
  }
  userBalance: number
  onPurchase: (itemId: string, price: number) => void
}

const rarityColors = {
  common: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  uncommon: "bg-green-500/10 text-green-500 border-green-500/20",
  rare: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  epic: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  legendary: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
}

export function PurchaseableItem({ item, userBalance, onPurchase }: PurchaseableItemProps) {
  const canAfford = userBalance >= item.price
  const Icon = item.icon
  const rarityClass = rarityColors[item.rarity as keyof typeof rarityColors] || rarityColors.common

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{item.name}</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={rarityClass}>
                  {item.rarity}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="font-bold text-green-500">{item.price}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription>{item.description}</CardDescription>

        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Duration: {item.duration}</span>
        </div>

        <Button
          onClick={() => onPurchase(item.id, item.price)}
          disabled={!canAfford}
          className="w-full"
          variant={canAfford ? "default" : "secondary"}
        >
          {canAfford ? `Purchase for $${item.price}` : "Insufficient Funds"}
        </Button>

        {!canAfford && (
          <p className="text-xs text-red-500 text-center">Need ${(item.price - userBalance).toFixed(2)} more</p>
        )}
      </CardContent>
    </Card>
  )
}
