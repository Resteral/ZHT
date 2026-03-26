"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Home,
  Users,
  Trophy,
  BarChart3,
  Calendar,
  Target,
  Bell,
  Settings,
  Menu,
  DollarSign,
  TrendingUp,
  Gamepad2,
  HelpCircle,
  MessageSquare,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useLobbyStats } from "@/lib/hooks/use-lobby-stats"
import Image from "next/image"

const navigation = [
  { name: "Lobby", href: "/", icon: Home },
  { name: "How It Works", href: "/guide", icon: HelpCircle },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Wallet", href: "/wallet", icon: DollarSign },
  { name: "Discord", href: "https://discord.gg/TBV2XxmUkc", icon: MessageSquare, external: true },
  { name: "My Matches", href: "/matches", icon: Gamepad2 },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, isLoading } = useAuth()
  const { activeCommandos } = useLobbyStats()

  const isSuperAdmin = user?.username === "Resteral"

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  if (isLoading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Image src="/images/tug-logo.png" alt="TUG Logo" width={40} height={40} className="rounded-lg" />
                <span className="text-xl font-bold text-foreground">TUG Arena</span>
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </div>
      </header>
    )
  }

  if (!user) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Image src="/images/tug-logo.png" alt="TUG Logo" width={40} height={40} className="rounded-lg" />
                <span className="text-xl font-bold text-foreground">TUG Arena</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="gaming-button-primary">
                <Link href="/auth/sign-up">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/images/tug-logo.png" alt="TUG Logo" width={40} height={40} className="rounded-lg" />
              <span className="text-xl font-bold text-foreground">TUG Arena</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.name} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined}>
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    size="sm"
                    className="flex items-center space-x-2 hover:bg-primary/10 hover:text-primary data-[state=open]:bg-primary/10"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1">
                <div className="size-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500 tabular-nums">{activeCommandos} Online</span>
            </div>
            
            <div className="hidden sm:flex items-center space-x-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">${user.balance.toFixed(2)}</span>
            </div>

            {/* Notifications */}
            <Button size="sm" variant="ghost" className="relative hover:bg-primary/10">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-accent text-accent-foreground">
                3
              </Badge>
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || "/placeholder.svg?height=32&width=32"} alt={user.username} />
                    <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">ID: {user.account_id}</p>
                    <p className="text-xs leading-none text-foreground/80">ELO: {user.elo_rating}</p>
                    {isSuperAdmin && <p className="text-xs leading-none text-red-600 font-medium">Super Admin</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.id}`}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin">Admin</Link>
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/tournaments">Tournament Management</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/users">User Management</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive(item.href) ? "bg-secondary text-secondary-foreground" : "hover:bg-secondary/50"
                          }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
