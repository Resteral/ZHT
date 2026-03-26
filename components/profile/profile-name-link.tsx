"use client"

import type React from "react"

import { trackProfileView } from "@/lib/services/profile-tracking-service"

interface ProfileNameLinkProps {
  userId: string
  username: string
  pageSource?: string
  className?: string
  showPreview?: boolean
}

export function ProfileNameLink({
  userId,
  username,
  pageSource = "unknown",
  className = "hover:text-primary cursor-pointer transition-colors",
  showPreview = false,
}: ProfileNameLinkProps) {
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    await trackProfileView(userId, pageSource)

    if (showPreview) {
      // Could open a profile preview modal here
      console.log("Show profile preview for:", username)
    } else {
      window.location.href = `/profile/${userId}`
    }
  }

  return (
    <span className={className} onClick={handleClick}>
      {username}
    </span>
  )
}
