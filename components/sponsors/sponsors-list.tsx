"use client"

import { SponsorCard } from "./sponsor-card"

const MOCK_SPONSORS = [
    {
        id: "1",
        name: "Rustopia Main",
        description: "The #1 Rust server. High performance, active admins, weekly wipes.",
        imageUrl: "/images/sponsors/rust-server.jpg", // Placeholder
        link: "#",
        category: "server" as const,
    },
    {
        id: "2",
        name: "Los Santos RP",
        description: "Immersive GTA V Roleplay. Join the most active community today.",
        imageUrl: "/images/sponsors/gta-server.jpg", // Placeholder
        link: "#",
        category: "server" as const,
    },
    {
        id: "3",
        name: "CS2 Retake Only",
        description: "Practice your retakes on our 128 tick servers. 24/7 active.",
        imageUrl: "/images/sponsors/cs2-server.jpg", // Placeholder
        link: "#",
        category: "server" as const,
    }
]

export function SponsorsList() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Featured Servers</h3>
                <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">Ad</span>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {MOCK_SPONSORS.map((sponsor) => (
                    <SponsorCard key={sponsor.id} sponsor={sponsor} />
                ))}
            </div>
        </div>
    )
}
