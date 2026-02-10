"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, X, Minimize2 } from "lucide-react"

interface Message {
    id: string
    senderId: string
    text: string
    timestamp: Date
}

export function ChatWindow() {
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", senderId: "other", text: "Yo, you down for some Apex ranked?", timestamp: new Date(Date.now() - 1000 * 60 * 5) },
        { id: "2", senderId: "me", text: "Yeah give me 5 mins", timestamp: new Date(Date.now() - 1000 * 60 * 2) },
    ])
    const [input, setInput] = useState("")
    const [isOpen, setIsOpen] = useState(true)
    const [isMinimized, setIsMinimized] = useState(false)

    const handleSend = () => {
        if (!input.trim()) return
        setMessages([...messages, {
            id: Date.now().toString(),
            senderId: "me",
            text: input,
            timestamp: new Date()
        }])
        setInput("")
    }

    if (!isOpen) return null

    if (isMinimized) {
        return (
            <Button
                className="fixed bottom-4 right-4 w-60 justify-between"
                onClick={() => setIsMinimized(false)}
            >
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src="/avatars/hal.jpg" />
                        <AvatarFallback>IH</AvatarFallback>
                    </Avatar>
                    <span>ImperialHal</span>
                </div>
            </Button>
        )
    }

    return (
        <Card className="fixed bottom-4 right-4 w-80 h-96 shadow-xl flex flex-col z-50">
            <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatars/hal.jpg" />
                        <AvatarFallback>IH</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-sm">ImperialHal</CardTitle>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="block h-2 w-2 rounded-full bg-green-500" /> Online
                        </p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(true)}>
                        <Minimize2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.senderId === 'me'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-3 border-t mt-auto flex gap-2">
                    <Input
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="flex-1 h-9"
                    />
                    <Button size="icon" className="h-9 w-9" onClick={handleSend}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
