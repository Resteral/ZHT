"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { playJoinSound } from "@/components/global/sound"

export default function RouteSoundListener() {
  const pathname = usePathname()
  const prev = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    if (prev.current === pathname) return

    const shouldPlay = ["/leagues/lobby/", "/draft/room/", "/leagues/match/"]
      .some((p) => pathname.includes(p))

    if (shouldPlay) {
      try {
        playJoinSound()
      } catch (e) {
        // ignore
      }
    }

    prev.current = pathname
  }, [pathname])

  return null
}
