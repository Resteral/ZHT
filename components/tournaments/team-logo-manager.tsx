"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, Save, RefreshCw, ImageIcon, Trash2, Download, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface TeamLogoManagerProps {
  teamId: string
  teamName: string
  currentLogoUrl?: string
  teamColor?: string
  onLogoUpdated?: (logoUrl: string) => void
  allowDelete?: boolean
  showPreview?: boolean
}

interface LogoPreset {
  id: string
  name: string
  url: string
  category: "sports" | "gaming" | "abstract" | "animals"
}

const LOGO_PRESETS: LogoPreset[] = [
  { id: "1", name: "Lightning Bolt", url: "/lightning-bolt-logo.png", category: "sports" },
  { id: "2", name: "Dragon", url: "/dragon-head-logo.jpg", category: "gaming" },
  { id: "3", name: "Shield", url: "/shield-emblem-logo.jpg", category: "sports" },
  { id: "4", name: "Phoenix", url: "/phoenix-bird-logo.png", category: "gaming" },
  { id: "5", name: "Wolf", url: "/wolf-head-logo.jpg", category: "animals" },
  { id: "6", name: "Crown", url: "/crown-royal-logo.jpg", category: "abstract" },
  { id: "7", name: "Sword", url: "/crossed-swords-logo.jpg", category: "gaming" },
  { id: "8", name: "Eagle", url: "/eagle-head-logo.jpg", category: "animals" },
]

export function TeamLogoManager({
  teamId,
  teamName,
  currentLogoUrl,
  teamColor = "#10b981",
  onLogoUpdated,
  allowDelete = true,
  showPreview = true,
}: TeamLogoManagerProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl || null)
  const [uploading, setUploading] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file")
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB")
      return
    }

    setLogoFile(file)
    setSelectedPreset(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handlePresetSelection = (preset: LogoPreset) => {
    setSelectedPreset(preset.id)
    setLogoPreview(preset.url)
    setLogoFile(null)
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null

    try {
      // In a real implementation, upload to Vercel Blob or Supabase Storage
      // For now, we'll simulate the upload and return the preview URL
      const fileName = `team-${teamId}-${Date.now()}.${logoFile.name.split(".").pop()}`

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Return the preview URL as the uploaded URL
      return logoPreview
    } catch (error) {
      console.error("Error uploading logo:", error)
      throw error
    }
  }

  const saveLogo = async () => {
    if (!logoPreview) {
      toast.error("Please select a logo first")
      return
    }

    setUploading(true)
    try {
      let logoUrl = logoPreview

      // Upload file if it's a new file
      if (logoFile) {
        const uploadedUrl = await uploadLogo()
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        }
      }

      // Update team logo in database
      const { error } = await supabase
        .from("tournament_teams")
        .update({
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId)

      if (error) throw error

      toast.success("Team logo updated successfully!")
      onLogoUpdated?.(logoUrl)

      // Reset form
      setLogoFile(null)
      setSelectedPreset(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error saving logo:", error)
      toast.error("Failed to save logo. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const deleteLogo = async () => {
    if (!currentLogoUrl) return

    try {
      const { error } = await supabase
        .from("tournament_teams")
        .update({
          logo_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId)

      if (error) throw error

      toast.success("Team logo removed successfully!")
      setLogoPreview(null)
      onLogoUpdated?.("")
    } catch (error) {
      console.error("Error deleting logo:", error)
      toast.error("Failed to remove logo. Please try again.")
    }
  }

  const resetPreview = () => {
    setLogoPreview(currentLogoUrl || null)
    setLogoFile(null)
    setSelectedPreset(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Team Logo Manager
        </CardTitle>
        <CardDescription>Upload a custom logo or choose from preset designs for {teamName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Logo Preview */}
        {showPreview && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarImage src={logoPreview || currentLogoUrl} alt={teamName} />
              <AvatarFallback className="text-white font-bold text-xl" style={{ backgroundColor: teamColor }}>
                {teamName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{teamName}</h3>
              <p className="text-sm text-muted-foreground">
                {logoPreview || currentLogoUrl ? "Custom logo" : "Default avatar"}
              </p>
              {logoPreview !== currentLogoUrl && (
                <Badge variant="outline" className="mt-1">
                  Preview - Not saved
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Upload Custom Logo</Label>
            <div className="flex items-center gap-2">
              <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="flex-1" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 2MB. Recommended size: 256x256px</p>
          </div>

          <Separator />

          {/* Preset Logos Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Choose from Presets</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowPresets(!showPresets)}>
                {showPresets ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Presets
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Presets
                  </>
                )}
              </Button>
            </div>

            {showPresets && (
              <div className="grid grid-cols-4 gap-3">
                {LOGO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelection(preset)}
                    className={`p-3 border-2 rounded-lg hover:border-primary transition-colors ${
                      selectedPreset === preset.id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="space-y-2">
                      <Avatar className="h-12 w-12 mx-auto">
                        <AvatarImage src={preset.url || "/placeholder.svg"} alt={preset.name} />
                        <AvatarFallback>{preset.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <p className="text-xs font-medium">{preset.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {preset.category}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetPreview} disabled={!logoPreview || logoPreview === currentLogoUrl}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            {allowDelete && currentLogoUrl && (
              <Button variant="destructive" onClick={deleteLogo} size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Logo
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {logoPreview && (
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement("a")
                  link.href = logoPreview
                  link.download = `${teamName}-logo.png`
                  link.click()
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button onClick={saveLogo} disabled={uploading || !logoPreview || logoPreview === currentLogoUrl}>
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Logo
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
