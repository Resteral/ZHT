"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

const Navigation = () => {
  const pathname = usePathname()

  return (
    <nav>
      {/* Adding Stats link to navigation */}
      <Link
        href="/stats"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/stats" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Stats
      </Link>
      {/* rest of code here */}
    </nav>
  )
}

export default Navigation
