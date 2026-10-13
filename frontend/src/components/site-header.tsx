import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import type { ApiStatus } from "@/lib/api-status"
import { scrollToSection } from "@/lib/scroll"
import { cn } from "cn"

const LINKS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "recognize", label: "Recognize Activity" },
  { id: "about", label: "About Project" },
] as const

const STATUS_COPY: Record<ApiStatus, { label: string; dot: string }> = {
  demo: { label: "Demonstration mode", dot: "bg-violet-300" },
  connected: { label: "API connected", dot: "bg-emerald-400" },
  unavailable: { label: "Inference unavailable", dot: "bg-amber-300" },
}

type SiteHeaderProps = {
  status: ApiStatus
}

export function SiteHeader({ status }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const statusCopy = STATUS_COPY[status]

  function go(id: string) {
    setOpen(false)
    scrollToSection(id)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070d1c]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
          aria-label="ActiVision AI, back to dashboard"
          onClick={() => go("dashboard")}
        >
          <Logo />
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <Button
              key={link.id}
              type="button"
              variant="ghost"
              className="h-9 px-3 text-muted-foreground hover:text-foreground"
              onClick={() => go(link.id)}
            >
              {link.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <p
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground sm:inline-flex"
            role="status"
          >
            <span className={cn("size-2 rounded-full", statusCopy.dot)} aria-hidden="true" />
            {statusCopy.label}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" className="border-t border-white/10 px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Button
                key={link.id}
                type="button"
                variant="ghost"
                className="justify-start"
                onClick={() => go(link.id)}
              >
                {link.label}
              </Button>
            ))}
            <p className="mt-2 inline-flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground" role="status">
              <span className={cn("size-2 rounded-full", statusCopy.dot)} aria-hidden="true" />
              {statusCopy.label}
            </p>
          </div>
        </nav>
      ) : null}
    </header>
  )
}
