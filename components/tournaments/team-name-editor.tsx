"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Edit3, X, Check, RefreshCw, Type } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface TeamNameEditorProps {
  teamId: string
  currentName: string
  onNameUpdated?: (newName: string) => void
  allowEdit?: boolean
  showHistory?: boolean
}

interface NameHistory {
  id: string
  old_name: string
  new_name: string
  changed_at: string
  changed_by: string
}

export function TeamNameEditor({
  teamId,
  currentName,
  onNameUpdated,
  allowEdit = true,
  showHistory = false,
}: TeamNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [nameHistory, setNameHistory] = useState<NameHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setNewName(currentName)
  }, [currentName])

  useEffect(() => {
    if (showHistory && isEditing) {
      loadNameHistory()
    }
  }, [showHistory, isEditing])

  const loadNameHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from("team_name_history")
        .select(`
          id,
          old_name,
          new_name,
          changed_at,
          changed_by,
          users (username)
        `)
        .eq("team_id", teamId)
        .order("changed_at", { ascending: false })
        .limit(10)

      if (error) throw error

      setNameHistory(data || [])
    } catch (error) {
      console.error("Error loading name history:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return "Team name cannot be empty"
    }
    if (name.length < 2) {
      return "Team name must be at least 2 characters"
    }
    if (name.length > 50) {
      return "Team name must be less than 50 characters"
    }
    if (!/^[a-zA-Z0-9\s\-_']+$/.test(name)) {
      return "Team name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes"
    }
    return null
  }

  const saveName = async () => {
    const trimmedName = newName.trim()

    if (trimmedName === currentName) {
      setIsEditing(false)
      return
    }

    const validationError = validateName(trimmedName)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    try {
      // Check if name is already taken by another team in the same tournament
      const { data: existingTeam, error: checkError } = await supabase
        .from("tournament_teams")
        .select("id")
        .eq("team_name", trimmedName)
        .neq("id", teamId)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingTeam) {
        toast.error("This team name is already taken in this tournament")
        return
      }

      // Save name history if enabled
      if (showHistory) {
        await supabase.from("team_name_history").insert({
          team_id: teamId,
          old_name: currentName,
          new_name: trimmedName,
          changed_by: (await supabase.auth.getUser()).data.user?.id,
        })
      }

      // Update team name
      const { error } = await supabase
        .from("tournament_teams")
        .update({
          team_name: trimmedName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId)

      if (error) throw error

      toast.success("Team name updated successfully!")
      onNameUpdated?.(trimmedName)
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving team name:", error)
      toast.error("Failed to update team name. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setNewName(currentName)
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveName()
    } else if (e.key === "Escape") {
      cancelEdit()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          Team Name
        </CardTitle>
        <CardDescription>Manage your team's display name and view change history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name Editor */}
        <div className="space-y-3">
          {!isEditing ? (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div>
                  <p className="font-semibold text-lg">{currentName}</p>
                  <p className="text-sm text-muted-foreground">Current team name</p>
                </div>
              </div>
              {allowEdit && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Name
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="teamName">New Team Name</Label>
                <Input
                  id="teamName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter team name"
                  maxLength={50}
                  autoFocus
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>2-50 characters, letters, numbers, spaces, hyphens, underscores, apostrophes</span>
                  <span>{newName.length}/50</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={saveName} disabled={saving || newName.trim() === currentName} size="sm">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Name
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={cancelEdit} disabled={saving} size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Name History */}
        {showHistory && isEditing && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Name History</Label>
                <Button variant="ghost" size="sm" onClick={loadNameHistory} disabled={loadingHistory}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingHistory ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {loadingHistory ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading history...</p>
                </div>
              ) : nameHistory.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {nameHistory.map((entry, index) => (
                    <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{nameHistory.length - index}
                        </Badge>
                        <span className="line-through text-muted-foreground">{entry.old_name}</span>
                        <span>→</span>
                        <span className="font-medium">{entry.new_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.changed_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">No name changes recorded</div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
