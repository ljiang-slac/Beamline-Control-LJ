"use client"

import { cn } from "@/lib/utils"

interface ParamDisplayProps {
  label: string
  value: string | number
  unit?: string
  className?: string
  variant?: "default" | "primary" | "accent"
}

const variantStyles = {
  default: "text-foreground",
  primary: "text-primary",
  accent: "text-accent",
}

export function ParamDisplay({ label, value, unit, className, variant = "default" }: ParamDisplayProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={cn("font-mono text-xl font-semibold tabular-nums", variantStyles[variant])}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}
