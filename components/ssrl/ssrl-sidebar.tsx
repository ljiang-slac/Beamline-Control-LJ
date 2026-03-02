"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { BEAMLINES, type BeamlineConfig, type BeamlineStatus } from "@/lib/beamline-config"
import { cn } from "@/lib/utils"
import { Activity, Radio, Wrench, AlertTriangle, Zap } from "lucide-react"

const statusConfig: Record<BeamlineStatus, { color: string; icon: typeof Activity; label: string }> = {
  operational: { color: "bg-primary", icon: Activity, label: "Online" },
  standby: { color: "bg-chart-3", icon: Radio, label: "Standby" },
  maintenance: { color: "bg-chart-5", icon: Wrench, label: "Maint." },
  fault: { color: "bg-destructive", icon: AlertTriangle, label: "Fault" },
}

function BeamlineStatusDot({ status }: { status: BeamlineStatus }) {
  const cfg = statusConfig[status]
  return (
    <span className={cn("relative flex size-2 rounded-full", cfg.color)}>
      {status === "operational" && (
        <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", cfg.color)} />
      )}
    </span>
  )
}

interface SSRLSidebarProps {
  selectedBeamline: string
  onSelectBeamline: (id: string) => void
}

export function SSRLSidebar({ selectedBeamline, onSelectBeamline }: SSRLSidebarProps) {
  const wiggler = BEAMLINES.filter((b) => b.source.toLowerCase().includes("wiggler"))
  const bendMagnet = BEAMLINES.filter((b) => b.source.toLowerCase().includes("bend"))
  const sideStation = BEAMLINES.filter((b) => b.source.toLowerCase().includes("side"))

  const renderGroup = (beamlines: BeamlineConfig[], label: string) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {beamlines.map((bl) => {
            const isActive = selectedBeamline === bl.id
            return (
              <SidebarMenuItem key={bl.id}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => onSelectBeamline(bl.id)}
                  tooltip={`${bl.name} - ${bl.fullName}`}
                  className={cn(
                    "transition-colors",
                    isActive && "bg-primary/10 text-primary border-l-2 border-primary rounded-l-none"
                  )}
                >
                  <BeamlineStatusDot status={bl.status} />
                  <span className="font-mono font-semibold text-sm">{bl.id}</span>
                </SidebarMenuButton>
                <SidebarMenuBadge className="text-[10px] text-muted-foreground font-mono">
                  {statusConfig[bl.status].label}
                </SidebarMenuBadge>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Zap className="size-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm text-foreground tracking-tight">SSRL</span>
            <span className="text-[10px] text-muted-foreground leading-none">Beamline Control</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {wiggler.length > 0 && renderGroup(wiggler, "Wiggler Sources")}
        {bendMagnet.length > 0 && renderGroup(bendMagnet, "Bend Magnet")}
        {sideStation.length > 0 && renderGroup(sideStation, "Side Station")}
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex flex-col gap-1 rounded-md bg-secondary/50 p-2.5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
            Storage Ring
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-lg font-bold tabular-nums text-primary group-data-[collapsible=icon]:text-sm">
              499.7
            </span>
            <span className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">mA</span>
          </div>
          <span className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
            SPEAR3 3.0 GeV
          </span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
