"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Trophy, Zap, Shield, Star, Crown, Target, TrendingUp, Gavel } from "lucide-react"
import { TeamAuctionCard } from "./team-auction-card"
import { PurchaseableItem } from "./purchaseable-item"
import { AuctionDialog } from "./auction-dialog"

const availableTeams = [
  {
    id: "1",
    name: "Thunder Hawks",
    league: "Premier League",
    currentBid: 850,
    minBid: 900,
    timeLeft: "2h 15m",
    bidders: 7,
    description: "Top-tier team with excellent roster and championship potential",
    logo: "/placeholder.svg?height=64&width=64",
    stats: { wins: 12, losses: 3, winRate: 80 },
  },
  {
    id: "2",
    name: "Storm Riders",
    league: "Elite Division",
    currentBid: 650,
    minBid: 700,
    timeLeft: "4h 32m",
    bidders: 4,
    description: "Solid mid-tier team with growth potential",
    logo: "/placeholder.svg?height=64&width=64",
    stats: { wins: 8, losses: 7, winRate: 53 },
  },
  {
    id: "3",
    name: "Fire Dragons",
    league: "Championship Series",
    currentBid: 1200,
    minBid: 1250,
    timeLeft: "1h 8m",
    bidders: 12,
    description: "Premium championship team with star players",
    logo: "/placeholder.svg?height=64&width=64",
    stats: { wins: 15, losses: 1, winRate: 94 },
  },
]

const purchaseableItems = [
  {
    id: "boost-1",
    name: "Performance Boost",
    description: "Increase your team's stats by 15% for 3 games",
    price: 150,
    category: "power-ups",
    icon: Zap,
    rarity: "common",
    duration: "3 games",
  },
  {
    id: "shield-1",
    name: "Injury Protection",
    description: "Protect your key players from injuries for 1 week",
    price: 200,
    category: "power-ups",
    icon: Shield,
    rarity: "uncommon",
    duration: "1 week",
  },
  {
    id: "scout-1",
    name: "Advanced Scouting",
    description: "Get detailed opponent analysis and predictions",
    price: 100,
    category: "premium",
    icon: Target,
    rarity: "common",
    duration: "1 game",
  },
  {
    id: "crown-1",
    name: "VIP Status",
    description: "Premium features, priority support, and exclusive content",
    price: 500,
    category: "premium",
    icon: Crown,
    rarity: "legendary",
    duration: "1 month",
  },
  {
    id: "star-1",
    name: "Star Player Recruitment",
    description: "Recruit a top-tier player to your roster",
    price: 750,
    category: "roster",
    icon: Star,
    rarity: "epic",
    duration: "Season",
  },
  {
    id: "trend-1",
    name: "Market Insights Pro",
    description: "Advanced analytics and betting market predictions",
    price: 300,
    category: "premium",
    icon: TrendingUp,
    rarity: "rare",
    duration: "1 month",
  },
]

export function LeagueMarketplace() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState("")
  const [userBalance] = useState(1247.5) // This would come from user context/API
  const [activeTab, setActiveTab] = useState("teams")

  const handleBid = (teamId: string, amount: number) => {
    // Handle bidding logic
    console.log(`Bidding $${amount} on team ${teamId}`)
  }

  const handlePurchase = (itemId: string, price: number) => {
    if (userBalance >= price) {
      // Handle purchase logic
      console.log(`Purchasing item ${itemId} for $${price}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Balance Display */}
      <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-green-500">${userBalance.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-muted-foreground">This Week's Earnings</p>
              <span className="text-lg font-semibold text-green-400">+$125.00</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Marketplace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="teams" className="flex items-center space-x-2">
            <Trophy className="h-4 w-4" />
            <span>League Teams</span>
          </TabsTrigger>
          <TabsTrigger value="powerups" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Power-ups</span>
          </TabsTrigger>
          <TabsTrigger value="premium" className="flex items-center space-x-2">
            <Crown className="h-4 w-4" />
            <span>Premium Items</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">League Teams</h2>
              <p className="text-muted-foreground">Bid on teams with your winnings</p>
            </div>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Gavel className="h-3 w-3" />
              <span>{availableTeams.length} Active Auctions</span>
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableTeams.map((team) => (
              <TeamAuctionCard
                key={team.id}
                team={team}
                userBalance={userBalance}
                onBid={handleBid}
                onViewDetails={() => setSelectedTeam(team.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="powerups" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Power-ups & Boosts</h2>
            <p className="text-muted-foreground">Enhance your team's performance</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchaseableItems
              .filter((item) => item.category === "power-ups")
              .map((item) => (
                <PurchaseableItem key={item.id} item={item} userBalance={userBalance} onPurchase={handlePurchase} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="premium" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Premium Features</h2>
            <p className="text-muted-foreground">Unlock exclusive content and advantages</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchaseableItems
              .filter((item) => item.category === "premium" || item.category === "roster")
              .map((item) => (
                <PurchaseableItem key={item.id} item={item} userBalance={userBalance} onPurchase={handlePurchase} />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Auction Dialog */}
      {selectedTeam && (
        <AuctionDialog
          team={availableTeams.find((t) => t.id === selectedTeam)!}
          isOpen={!!selectedTeam}
          onClose={() => setSelectedTeam(null)}
          userBalance={userBalance}
          onBid={handleBid}
        />
      )}
    </div>
  )
}
