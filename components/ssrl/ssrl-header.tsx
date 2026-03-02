"use client"

import { useEffect, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { BeamlineConfig, BeamlineStatus } from "@/lib/beamline-config"
import { cn } from "@/lib/utils"
import { Clock, Radio } from "lucide-react"

const statusStyle: Record<BeamlineStatus, string> = {
  operational: "bg-primary/15 text-primary border-primary/30",
  standby: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  maintenance: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  fault: "bg-destructive/15 text-destructive border-destructive/30",
}

interface SSRLHeaderProps {
  beamline: BeamlineConfig
}

export function SSRLHeader({ beamline }: SSRLHeaderProps) {
  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-5" />

        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-foreground tracking-tight">
            {beamline.id}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase font-semibold tracking-wider",
              statusStyle[beamline.status]
            )}
          >
            {beamline.status}
          </Badge>
        </div>

        <Separator orientation="vertical" className="h-5" />

        <span className="text-sm text-muted-foreground hidden md:inline">
          {beamline.fullName}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="hidden md:flex items-center gap-4">
          {beamline.techniques.slice(0, 3).map((t) => (
            <span key={t} className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              {t}
            </span>
          ))}
        </div>

        <Separator orientation="vertical" className="h-5 hidden md:block" />

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Radio className="size-3.5 text-primary" />
          <span className="font-mono text-xs tabular-nums">
            {beamline.energyRange[0]}&ndash;{beamline.energyRange[1]} {beamline.energyUnit}
          </span>
        </div>

        <Separator orientation="vertical" className="h-5" />

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" />
          <span className="font-mono text-xs tabular-nums">{time}</span>
        </div>
      </div>
    </header>
  )
}
