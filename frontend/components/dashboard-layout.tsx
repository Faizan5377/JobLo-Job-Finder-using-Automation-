"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Home, LogOut, Menu, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Resume Analysis", href: "/resume-analysis", icon: FileText },
    { name: "Job Search", href: "/job-search", icon: Search },
  ]

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 border-r">
          <div className="flex h-full flex-col">
            <div className="border-b px-6 py-4">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-xl font-bold gradient-heading">Resume Analyzer</span>
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn("nav-link", pathname === item.href ? "nav-link-active" : "nav-link-inactive")}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t p-4">
              <Button variant="ghost" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-3 h-5 w-5" />
                Sign out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r">
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="border-b px-6 py-4">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-xl font-bold gradient-heading">Resume Analyzer</span>
              </Link>
            </div>
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn("nav-link", pathname === item.href ? "nav-link-active" : "nav-link-inactive")}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t p-4">
              <Button variant="ghost" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-3 h-5 w-5" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-64">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b bg-background/95 backdrop-blur">
          <div className="flex flex-1 items-center justify-between px-4 md:px-6">
            <div className="flex items-center md:hidden">
              {/* SheetTrigger moved to be inside the Sheet component above */}
            </div>
            <div className="ml-auto flex items-center space-x-4">
              <ModeToggle />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="hidden text-sm font-medium md:block">{user?.name}</span>
                  <Avatar>
                    <AvatarImage src="" alt={user?.name || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto px-4 sm:px-6 md:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}

