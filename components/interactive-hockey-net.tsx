"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trophy, Users, Zap, Target, Crown, Gamepad2 } from "lucide-react"

interface GameMode {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  route: string
  color: string
  participants: string
}

const gameModes: GameMode[] = [
  {
    id: "elo-draft",
    name: "ELO Draft",
    description: "Competitive ranked matches with skill-based matchmaking",
    icon: <Zap className="w-6 h-6" />,
    route: "/lobbies?filter=elo",
    color: "from-yellow-400 to-orange-500",
    participants: "1v1 to 6v6",
  },
  {
    id: "tournaments",
    name: "Tournaments",
    description: "Join player pools and compete in organized tournaments",
    icon: <Trophy className="w-6 h-6" />,
    route: "/tournaments/snake-draft",
    color: "from-purple-400 to-pink-500",
    participants: "Team Drafts",
  },
  {
    id: "casual-lobby",
    name: "Casual Lobby",
    description: "Quick matches with friends or random players",
    icon: <Users className="w-6 h-6" />,
    route: "/lobbies?filter=casual",
    color: "from-blue-400 to-cyan-500",
    participants: "2v2 to 6v6",
  },
  {
    id: "team-auction",
    name: "Leagues",
    description: "Join league tournaments and compete with organized teams",
    icon: <Crown className="w-6 h-6" />,
    route: "/leagues",
    color: "from-green-400 to-emerald-500",
    participants: "League Teams",
  },
]

export function InteractiveHockeyNet() {
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const router = useRouter()

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode.id)
    setIsAnimating(true)

    // Animate the puck going into the net
    setTimeout(() => {
      router.push(mode.route)
    }, 1500)
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto p-8">
      {/* Hockey Net SVG */}
      <div className="relative mb-8">
        <motion.svg
          viewBox="0 0 400 200"
          className="w-full h-48 mx-auto"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Net Frame */}
          <motion.path
            d="M50 150 L50 50 Q50 30 70 30 L330 30 Q350 30 350 50 L350 150"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

          {/* Net Mesh */}
          {Array.from({ length: 15 }, (_, i) => (
            <motion.line
              key={`vertical-${i}`}
              x1={70 + i * 18}
              y1={30}
              x2={70 + i * 18}
              y2={150}
              stroke="#d1d5db"
              strokeWidth="1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
            />
          ))}

          {Array.from({ length: 8 }, (_, i) => (
            <motion.line
              key={`horizontal-${i}`}
              x1={70}
              y1={40 + i * 15}
              x2={330}
              y2={40 + i * 15}
              stroke="#d1d5db"
              strokeWidth="1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.3 }}
            />
          ))}

          {/* Animated Puck */}
          <AnimatePresence>
            {isAnimating && (
              <motion.circle
                cx={200}
                cy={180}
                r={8}
                fill="#1f2937"
                initial={{ cx: 200, cy: 180, scale: 1 }}
                animate={{
                  cx: 200,
                  cy: 90,
                  scale: [1, 1.2, 0.8, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>

          {/* Goal Light */}
          <motion.circle
            cx={200}
            cy={15}
            r={6}
            fill={isAnimating ? "#ef4444" : "#6b7280"}
            animate={
              isAnimating
                ? {
                    fill: ["#ef4444", "#fbbf24", "#ef4444"],
                    scale: [1, 1.3, 1],
                  }
                : {}
            }
            transition={{
              duration: 0.5,
              repeat: isAnimating ? 3 : 0,
              ease: "easeInOut",
            }}
          />
        </motion.svg>
      </div>

      {/* Game Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {gameModes.map((mode, index) => (
          <motion.div
            key={mode.id}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <Card
              className={`p-6 cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                selectedMode === mode.id
                  ? "border-blue-500 shadow-lg shadow-blue-500/25"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => handleModeSelect(mode)}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${mode.color}`}>{mode.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">{mode.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{mode.description}</p>
                  <div className="flex items-center space-x-2">
                    <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{mode.participants}</span>
                  </div>
                </div>
              </div>

              <motion.div className="mt-4 flex justify-end" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="sm" className={`bg-gradient-to-r ${mode.color} text-white border-0`}>
                  Select Mode
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Instructions */}
      <motion.div
        className="text-center text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <Target className="w-5 h-5 inline-block mr-2" />
        <span className="text-sm">Select your game mode to shoot the puck and enter the arena!</span>
      </motion.div>

      {/* Loading State */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
              />
              <p className="text-sm text-muted-foreground">Entering the arena...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
