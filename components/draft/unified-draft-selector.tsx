"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, DollarSign, Gamepad2 } from "lucide-react"
import { useRouter } from "next/navigation"

const draftFormats = [
  {
    name: "1v1",
    players: 2,
    description: "Head-to-head draft",
    duration: "15-20 min",
    reward: "$50",
    href: "/draft/1v1",
    color: "bg-blue-500",
  },
  {
    name: "2v2",
    players: 4,
    description: "Small team tactics",
    duration: "20-25 min",
    reward: "$50",
    href: "/draft/2v2",
    color: "bg-green-500",
  },
  {
    name: "3v3",
    players: 6,
    description: "Balanced gameplay",
    duration: "25-30 min",
    reward: "$50",
    href: "/draft/3v3",
    color: "bg-purple-500",
  },
  {
    name: "4v4",
    players: 8,
    description: "Strategic depth",
    duration: "30-35 min",
    reward: "$50",
    href: "/draft/4v4",
    color: "bg-orange-500",
    special: "Pass First Pick",
  },
  {
    name: "5v5",
    players: 10,
    description: "Full team experience",
    duration: "35-40 min",
    reward: "$50",
    href: "/draft/5v5",
    color: "bg-red-500",
  },
  {
    name: "6v6",
    players: 12,
    description: "Large scale battles",
    duration: "40-45 min",
    reward: "$50",
    href: "/draft/6v6",
    color: "bg-indigo-500",
  },
]

interface UnifiedDraftSelectorProps {
  buttonText?: string
  buttonVariant?: "default" | "outline" | "secondary"
  buttonSize?: "sm" | "default" | "lg"
  className?: string
}

export function UnifiedDraftSelector({
  buttonText = "Join Draft",
  buttonVariant = "default",
  buttonSize = "default",
  className = "",
}: UnifiedDraftSelectorProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleFormatSelect = (format: (typeof draftFormats)[0]) => {
    setOpen(false)
    router.push(format.href)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={className}>
          <Gamepad2 className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Select Draft Format
          </DialogTitle>
          <DialogDescription>
            Choose your preferred team format for ELO draft matches. All formats are FREE with $50 rewards!
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {draftFormats.map((format) => (
            <Card
              key={format.name}
              className="hover:shadow-md transition-all cursor-pointer hover:scale-105"
              onClick={() => handleFormatSelect(format)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-10 w-10 rounded-lg ${format.color} flex items-center justify-center`}>
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="secondary">{format.players} Players</Badge>
                </div>
                <CardTitle className="text-lg">{format.name} Draft</CardTitle>
                <CardDescription>{format.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{format.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span className="text-green-600 font-medium">{format.reward}</span>
                  </div>
                </div>

                {format.special && (
                  <Badge variant="outline" className="w-full justify-center text-xs">
                    {format.special}
                  </Badge>
                )}

                <Button size="sm" className="w-full">
                  Join {format.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">FREE Entry</Badge>
              <span>No cost to join</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                $50 Reward
              </Badge>
              <span>Per player</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                ELO Rating
              </Badge>
              <span>Skill tracking</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
