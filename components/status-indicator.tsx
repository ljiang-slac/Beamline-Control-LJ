import { cn } from "@/lib/utils"

interface StatusIndicatorProps {
  status: "online" | "warning" | "error" | "idle"
  label: string
  className?: string
}

const statusColors = {
  online: "bg-primary",
  warning: "bg-chart-3",
  error: "bg-destructive",
  idle: "bg-muted-foreground",
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("relative flex size-2.5 rounded-full", statusColors[status])}>
        {status === "online" && (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", statusColors[status])} />
        )}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
