import { Activity } from "lucide-react"
import { cn } from "cn"

type LogoProps = {
  className?: string
  compact?: boolean
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-violet-500 shadow-[0_0_28px_oklch(0.62_0.16_270/0.45)]">
        <Activity className="size-5 text-white" aria-hidden="true" />
      </span>
      {compact ? null : (
        <span className="text-left leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-foreground">ActiVision AI</span>
          <span className="block text-[11px] tracking-wide text-muted-foreground">Activity recognition</span>
        </span>
      )}
    </span>
  )
}
