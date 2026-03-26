"use client"

import { Button } from "@/components/ui/button"
import { GameQueue } from "@/components/match/game-queue"
import { QueueRakeDisplay } from "@/components/match/queue-rake-display"
import { getAllGames } from "@/lib/game-config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, ExternalLink } from "lucide-react"

import { Hero } from "@/components/lobby/hero"

export default function LobbyPage() {
  const games = getAllGames()

  return (
    <div className="container mx-auto p-4 max-w-7xl pt-8">
      <Hero />
      <QueueRakeDisplay />

      <div className="my-12">
        <a
          href="https://discord.gg/TBV2XxmUkc"
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.05] transition-all duration-500 overflow-hidden relative rounded-[2rem]">
            <div className="absolute -top-12 -right-12 size-48 bg-[#5865F2]/20 blur-[60px] rounded-full group-hover:bg-[#5865F2]/30 transition-all duration-700" />
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-8 text-center md:text-left">
                <div className="size-20 bg-[#5865F2] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#5865F2]/40 group-hover:scale-110 transition-transform duration-500">
                  <MessageSquare className="size-10 text-white" />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1 justify-center md:justify-start">
                        <Badge variant="outline" className="bg-[#5865F2]/10 border-[#5865F2]/30 text-[#5865F2] font-black italic uppercase text-[10px] tracking-widest px-3">COMMUNITY HUB</Badge>
                        <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">JOIN THE SQUAD</span>
                    </div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Community Command</h2>
                  <p className="text-muted-foreground font-medium max-w-md">Sync with the elite. Coordinate strikes, trade intel, and claim rewards in our global Discord community.</p>
                </div>
              </div>
              <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-black uppercase italic tracking-widest gap-2 px-10 h-16 rounded-2xl border-t border-white/20 shadow-xl group/btn">
                Connect Discord
                <ExternalLink className="size-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </a>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All Games</TabsTrigger>
          {games.map((game) => (
            <TabsTrigger key={game.id} value={game.id}>
              <span className="mr-1">{game.icon}</span>
              <span className="hidden sm:inline">{game.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {games.map((game) => (
              <GameQueue key={game.id} game={game} />
            ))}
          </div>
        </TabsContent>

        {games.map((game) => (
          <TabsContent key={game.id} value={game.id}>
            <GameQueue game={game} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
