"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function GroupNav({
  tabs,
}: {
  tabs: { label: string; href: string; exact?: boolean }[]
}) {
  const pathname = usePathname()

  return (
    <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-0">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
              isActive
                ? "border-primary text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
