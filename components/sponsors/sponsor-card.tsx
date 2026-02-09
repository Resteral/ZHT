"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import Image from "next/image"

interface Sponsor {
    id: string
    name: string
    description: string
    imageUrl: string
    link: string
    category: "server" | "platform" | "brand"
}

interface SponsorCardProps {
    sponsor: Sponsor
}

export function SponsorCard({ sponsor }: SponsorCardProps) {
    return (
        <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-colors">
            <div className="relative h-32 w-full">
                <Image
                    src={sponsor.imageUrl}
                    alt={sponsor.name}
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <div className="absolute bottom-2 left-3">
                    <h3 className="font-bold text-lg text-white">{sponsor.name}</h3>
                </div>
            </div>
            <CardContent className="p-3 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{sponsor.description}</p>
                <Button asChild variant="outline" size="sm" className="w-full gap-2">
                    <a href={sponsor.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Join Server
                    </a>
                </Button>
            </CardContent>
        </Card>
    )
}
