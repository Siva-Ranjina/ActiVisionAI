import { useEffect, useState } from "react"
import { checkHealth, isApiConfigured } from "@/lib/api"

export type ApiStatus = "demo" | "connected" | "unavailable"

export function useApiStatus() {
  const configured = isApiConfigured()
  const [status, setStatus] = useState<ApiStatus>(configured ? "unavailable" : "demo")

  useEffect(() => {
    if (!configured) return
    const controller = new AbortController()
    checkHealth(controller.signal).then((ok) => {
      if (!controller.signal.aborted) setStatus(ok ? "connected" : "unavailable")
    })
    return () => controller.abort()
  }, [configured])

  return { status, setStatus, configured }
}
