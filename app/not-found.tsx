"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertCircle, Home, ChevronLeft } from "lucide-react"

export default function NotFound() {
    const router = useRouter()

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <AlertCircle className="w-24 h-24 text-primary relative z-10 mx-auto" />
            </div>

            <h1 className="text-6xl font-black mb-2 tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
                404
            </h1>
            <h2 className="text-2xl font-bold mb-4 text-white">Arena Not Found</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
                The page you're looking for has been moved, deleted, or never existed in this arena. Let's get you back to the action.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" onClick={() => router.back()} className="gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Go Back
                </Button>
                <Button onClick={() => router.push("/")} className="gap-2">
                    <Home className="w-4 h-4" />
                    Return to Lobby
                </Button>
            </div>
        </div>
    )
}
