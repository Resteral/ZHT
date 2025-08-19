"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"

export default function CreateStreamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    platform: "",
    streamUrl: "",
    gameId: "",
    tournamentId: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("Creating stream:", formData)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push("/admin/streams")
    } catch (error) {
      console.error("Error creating stream:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/streams">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Streams
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Stream</h1>
          <p className="text-muted-foreground">Set up a new livestream for games and tournaments</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stream Details</CardTitle>
          <CardDescription>Configure your livestream settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Stream Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter stream title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => setFormData({ ...formData, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twitch">Twitch</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your stream"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="streamUrl">Stream URL</Label>
              <Input
                id="streamUrl"
                value={formData.streamUrl}
                onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                placeholder="https://twitch.tv/your-channel or embed URL"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="gameId">Associated Game (Optional)</Label>
                <Select value={formData.gameId} onValueChange={(value) => setFormData({ ...formData, gameId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select game" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cs">Counter Strike</SelectItem>
                    <SelectItem value="r6s">Rainbow Six Siege</SelectItem>
                    <SelectItem value="cod">Call of Duty</SelectItem>
                    <SelectItem value="hockey">Zealot Hockey</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tournamentId">Tournament (Optional)</Label>
                <Select
                  value={formData.tournamentId}
                  onValueChange={(value) => setFormData({ ...formData, tournamentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="winter">Winter Championship</SelectItem>
                    <SelectItem value="spring">Spring Qualifiers</SelectItem>
                    <SelectItem value="elite">Elite Cup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? "Creating..." : "Create Stream"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
