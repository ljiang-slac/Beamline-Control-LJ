"use client"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusIndicator } from "@/components/status-indicator"
import type { BeamlineConfig, Motor } from "@/lib/beamline-config"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Home,
  Target,
  Settings2,
  ArrowRight,
  Play,
  Square,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
} from "lucide-react"

// ── Motor styling ───────────────────────────────────────────────
const motorStatusBadge: Record<string, string> = {
  idle: "bg-primary/10 text-primary",
  moving: "bg-chart-3/15 text-chart-3",
  error: "bg-destructive/15 text-destructive",
  homed: "bg-accent/15 text-accent",
}

interface MotorPreset {
  name: string
  description: string
}

const defaultPresets: MotorPreset[] = [
  { name: "Home", description: "All motors to home position" },
  { name: "Alignment", description: "Beam alignment configuration" },
  { name: "Focus", description: "Focused beam on sample" },
  { name: "Wide Beam", description: "Defocused for uniform illumination" },
]

// ── Scan queue types ────────────────────────────────────────────
interface ScanRegion {
  id: number
  startEnergy: string
  endEnergy: string
  stepSize: string
  dwellTime: string
}

interface ScanQueueItem {
  id: number
  name: string
  scanType: string
  regions: ScanRegion[]
  totalPoints: number
  totalTime: number
  status: "queued" | "running" | "completed" | "error"
  progress: number
}

function calcRegionPoints(r: ScanRegion): number {
  const start = parseFloat(r.startEnergy) || 0
  const end = parseFloat(r.endEnergy) || 0
  const step = parseFloat(r.stepSize) || 1
  if (end <= start || step <= 0) return 0
  return Math.round((end - start) / step)
}

function calcRegionTime(r: ScanRegion): number {
  return calcRegionPoints(r) * (parseFloat(r.dwellTime) || 0)
}

function summariseRegions(regions: ScanRegion[]): { totalPoints: number; totalTime: number } {
  let totalPoints = 0
  let totalTime = 0
  for (const r of regions) {
    totalPoints += calcRegionPoints(r)
    totalTime += calcRegionTime(r)
  }
  return { totalPoints, totalTime }
}

const queueStatusBadge: Record<string, string> = {
  queued: "bg-secondary text-secondary-foreground",
  running: "bg-primary/15 text-primary",
  completed: "bg-primary/10 text-primary",
  error: "bg-destructive/15 text-destructive",
}

let nextScanId = 10

export function MotorControlTab({ beamline }: { beamline: BeamlineConfig }) {
  // Motor state
  const [selectedMotor, setSelectedMotor] = useState<Motor>(beamline.motors[0])
  const [stepSize, setStepSize] = useState("0.01")
  const [moveTarget, setMoveTarget] = useState("")
  const [velocity, setVelocity] = useState(String(selectedMotor.velocity))

  const regionIdRef = useRef(10)
  // Scan config state
  const [scanType, setScanType] = useState("step")
  const [scanName, setScanName] = useState("")
  const [regions, setRegions] = useState<ScanRegion[]>([
    {
      id: 1,
      startEnergy: String(beamline.energyRange[0] * 1000 - 150),
      endEnergy: String(beamline.energyRange[0] * 1000 - 10),
      stepSize: "10.0",
      dwellTime: "1.0",
    },
    {
      id: 2,
      startEnergy: String(beamline.energyRange[0] * 1000 - 10),
      endEnergy: String(beamline.energyRange[0] * 1000 + 60),
      stepSize: "0.5",
      dwellTime: "1.0",
    },
    {
      id: 3,
      startEnergy: String(beamline.energyRange[0] * 1000 + 60),
      endEnergy: String(Math.min(beamline.energyRange[0] * 1000 + 800, beamline.energyRange[1] * 1000)),
      stepSize: "2.0",
      dwellTime: "1.0",
    },
  ])

  const { totalPoints, totalTime } = summariseRegions(regions)

  const addRegion = useCallback(() => {
    const lastRegion = regions[regions.length - 1]
    const lastEnd = lastRegion ? lastRegion.endEnergy : String(beamline.energyRange[0] * 1000)
    const newId = regionIdRef.current++
    setRegions(prev => [...prev, {
      id: newId,
      startEnergy: lastEnd,
      endEnergy: String(parseFloat(lastEnd) + 200),
      stepSize: "2.0",
      dwellTime: "1.0",
    }])
  }, [regions, beamline.energyRange])

  const removeRegion = useCallback((id: number) => {
    setRegions(prev => prev.filter(r => r.id !== id))
  }, [])

  const updateRegion = useCallback((id: number, field: keyof ScanRegion, value: string) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }, [])

  // Queue state
  const [queue, setQueue] = useState<ScanQueueItem[]>([
    {
      id: 1, name: "Fe K-edge XANES", scanType: "Step Scan",
      regions: [
        { id: 1, startEnergy: "6900", endEnergy: "7090", stepSize: "10.0", dwellTime: "1.0" },
        { id: 2, startEnergy: "7090", endEnergy: "7160", stepSize: "0.3", dwellTime: "1.0" },
        { id: 3, startEnergy: "7160", endEnergy: "7250", stepSize: "2.0", dwellTime: "1.0" },
      ],
      totalPoints: 302, totalTime: 302, status: "completed", progress: 100,
    },
    {
      id: 2, name: "Fe K-edge EXAFS", scanType: "Continuous",
      regions: [
        { id: 1, startEnergy: "7050", endEnergy: "7100", stepSize: "5.0", dwellTime: "0.5" },
        { id: 2, startEnergy: "7100", endEnergy: "7150", stepSize: "0.3", dwellTime: "0.5" },
        { id: 3, startEnergy: "7150", endEnergy: "7850", stepSize: "2.0", dwellTime: "0.5" },
      ],
      totalPoints: 593, totalTime: 297, status: "running", progress: 67,
    },
    {
      id: 3, name: "Cu K-edge XANES", scanType: "Step Scan",
      regions: [
        { id: 1, startEnergy: "8850", endEnergy: "8970", stepSize: "5.0", dwellTime: "1.0" },
        { id: 2, startEnergy: "8970", endEnergy: "9010", stepSize: "0.3", dwellTime: "1.0" },
        { id: 3, startEnergy: "9010", endEnergy: "9100", stepSize: "2.0", dwellTime: "1.0" },
      ],
      totalPoints: 202, totalTime: 202, status: "queued", progress: 0,
    },
  ])
  const [isRunning, setIsRunning] = useState(true)

  const scanTypeLabel: Record<string, string> = {
    step: "Step Scan",
    continuous: "Continuous",
    fly: "Fly Scan",
    qexafs: "Quick EXAFS",
    mesh: "Mesh (2D)",
  }

  const handleMotorSelect = (motor: Motor) => {
    setSelectedMotor(motor)
    setVelocity(String(motor.velocity))
    setMoveTarget("")
  }

  // ── Queue operations ─────────────────────────────────────────
  const addToQueue = useCallback(() => {
    if (regions.length === 0) return
    const firstStart = regions[0].startEnergy
    const lastEnd = regions[regions.length - 1].endEnergy
    const { totalPoints: tp, totalTime: tt } = summariseRegions(regions)
    const newItem: ScanQueueItem = {
      id: nextScanId++,
      name: scanName || `Scan @ ${firstStart}-${lastEnd} eV`,
      scanType: scanTypeLabel[scanType] || scanType,
      regions: regions.map(r => ({ ...r })),
      totalPoints: tp,
      totalTime: tt,
      status: "queued",
      progress: 0,
    }
    setQueue((prev) => [...prev, newItem])
    setScanName("")
  }, [scanName, scanType, regions, scanTypeLabel])

  const removeFromQueue = useCallback((id: number) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const moveInQueue = useCallback((id: number, direction: "up" | "down") => {
    setQueue((prev) => {
      const idx = prev.findIndex((item) => item.id === id)
      if (idx === -1) return prev
      const targetIdx = direction === "up" ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
      return next
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== "completed"))
  }, [])

  const clearAll = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status === "running"))
  }, [])

  const currentScan = queue.find((s) => s.status === "running")

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ═══════════════════════════════════════════════════════
          LEFT COLUMN: Motor Positions + Scan Configuration
          ═══════════════════════════════════════════════════════ */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Motor Positions Grid */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Motor Positions -- {beamline.id}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {beamline.motors.length} motors
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Motor</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Position</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Encoder</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {beamline.motors.map((motor) => {
                    const isSelected = selectedMotor.name === motor.name
                    const followErr = Math.abs(motor.position - motor.encoderReadback)
                    const isCombined = !!motor.combinedOf
                    return (
                      <tr
                        key={motor.name}
                        className={cn(
                          "border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/30",
                          isSelected && "bg-primary/5 border-l-2 border-l-primary",
                          isCombined && "bg-accent/5"
                        )}
                        onClick={() => handleMotorSelect(motor)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-foreground">{motor.name}</span>
                            {isCombined && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-accent text-accent font-normal">
                                combined
                              </Badge>
                            )}
                          </div>
                          {isCombined && motor.combinedOf && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              = {motor.combinedOf.join(" + ")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{motor.description}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-mono text-xs tabular-nums text-foreground">
                            {motor.position.toFixed(3)}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1">{motor.unit}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={cn(
                            "font-mono text-xs tabular-nums",
                            followErr > 0.01 ? "text-chart-5" : "text-muted-foreground"
                          )}>
                            {motor.encoderReadback.toFixed(3)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge className={cn("text-[10px]", motorStatusBadge[motor.status])}>
                            {motor.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Scan Configuration */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Scan Configuration
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                Configure & Add to Queue
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scan name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Scan Name</Label>
              <Input
                className="h-8 font-mono text-xs bg-secondary border-border"
                placeholder="e.g. Cu K-edge XANES"
                value={scanName}
                onChange={(e) => setScanName(e.target.value)}
              />
            </div>

            {/* Type + motor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Scan Type</Label>
                <Select value={scanType} onValueChange={setScanType}>
                  <SelectTrigger className="h-8 font-mono text-xs bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="step">Step Scan</SelectItem>
                    <SelectItem value="continuous">Continuous Scan</SelectItem>
                    <SelectItem value="fly">Fly Scan</SelectItem>
                    <SelectItem value="qexafs">Quick EXAFS</SelectItem>
                    <SelectItem value="mesh">Mesh (2D) Scan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Scan Motor</Label>
                <Select defaultValue={selectedMotor.name}>
                  <SelectTrigger className="h-8 font-mono text-xs bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {beamline.motors.filter(m => !m.combinedOf).length > 0 && (
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Physical Motors</div>
                    )}
                    {beamline.motors.filter(m => !m.combinedOf).map(m => (
                      <SelectItem key={m.name} value={m.name}>{m.name} -- {m.description}</SelectItem>
                    ))}
                    {beamline.motors.filter(m => !!m.combinedOf).length > 0 && (
                      <>
                        <div className="px-2 py-1 mt-1 text-[10px] font-semibold uppercase tracking-wider text-accent border-t border-border">Combined Motors</div>
                        {beamline.motors.filter(m => !!m.combinedOf).map(m => (
                          <SelectItem key={m.name} value={m.name}>
                            {m.name} -- {m.combinedOf!.join(" + ")}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ─── Scan Regions ─────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Scan Regions</Label>
                <Button variant="outline" size="sm" className="h-6 gap-1 text-[10px]" onClick={addRegion}>
                  <Plus className="size-3" /> Add Region
                </Button>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] gap-1.5 px-1">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Start (eV)</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">End (eV)</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Step (eV)</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Dwell (s)</span>
                <span className="w-5" />
              </div>

              {/* Region rows */}
              {regions.map((r, idx) => {
                const pts = calcRegionPoints(r)
                return (
                  <div key={r.id} className="space-y-0.5">
                    <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] gap-1.5 items-center">
                      <Input
                        className="h-7 font-mono text-xs bg-secondary border-border"
                        value={r.startEnergy}
                        onChange={e => updateRegion(r.id, "startEnergy", e.target.value)}
                      />
                      <Input
                        className="h-7 font-mono text-xs bg-secondary border-border"
                        value={r.endEnergy}
                        onChange={e => updateRegion(r.id, "endEnergy", e.target.value)}
                      />
                      <Input
                        className="h-7 font-mono text-xs bg-secondary border-border"
                        value={r.stepSize}
                        onChange={e => updateRegion(r.id, "stepSize", e.target.value)}
                      />
                      <Input
                        className="h-7 font-mono text-xs bg-secondary border-border"
                        value={r.dwellTime}
                        onChange={e => updateRegion(r.id, "dwellTime", e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRegion(r.id)}
                        disabled={regions.length <= 1}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground pl-1">
                      Region {idx + 1}: {pts} pts / {(calcRegionTime(r) / 60).toFixed(1)}m
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Estimated totals */}
            <div className="rounded-md bg-secondary/40 p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="font-mono text-xs text-foreground">{totalPoints} pts</span>
                <span className="text-[10px] text-muted-foreground">across {regions.length} region{regions.length > 1 ? "s" : ""}</span>
              </div>
              <span className="font-mono text-xs text-foreground">
                {Math.floor(totalTime / 60)}m {Math.round(totalTime % 60)}s
              </span>
            </div>

            {/* Add to queue button */}
            <Button className="w-full gap-2" onClick={addToQueue}>
              <Plus className="size-3.5" />
              Add to Scan Queue
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ═════════��═════════════════════════════════════════════
          RIGHT COLUMN: Jog Controls + Presets + Scan Queue
          ═══════════════════════════════════════════════════════ */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Jog Controls */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Jog Control
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary font-semibold">{selectedMotor.name}</span>
                {selectedMotor.combinedOf && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-accent text-accent font-normal">
                    combined
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show component motors if combined */}
            {selectedMotor.combinedOf && (
              <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">Component Motors</span>
                <div className="flex flex-wrap gap-2">
                  {selectedMotor.combinedOf.map(compName => {
                    const compMotor = beamline.motors.find(m => m.name === compName)
                    return (
                      <div key={compName} className="flex items-center gap-1.5 rounded border border-border bg-secondary/40 px-2 py-1">
                        <span className="font-mono text-[10px] font-semibold text-foreground">{compName}</span>
                        {compMotor && (
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                            {compMotor.position.toFixed(3)} {compMotor.unit}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Moving this combined motor will coordinate {selectedMotor.combinedOf.join(" and ")} together.
                </p>
              </div>
            )}
            <div className="flex flex-col items-center gap-3">
              {/* Current position readout */}
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Position</span>
                <span className="font-mono text-2xl font-bold tabular-nums text-primary">
                  {selectedMotor.position.toFixed(4)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">{selectedMotor.unit}</span>
              </div>

              {/* Jog buttons */}
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="size-9">
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-9">
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="px-3">
                  <Input
                    className="h-8 w-20 text-center font-mono text-xs bg-secondary border-border"
                    value={stepSize}
                    onChange={(e) => setStepSize(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground block text-center mt-0.5">step size</span>
                </div>
                <Button variant="outline" size="icon" className="size-9">
                  <ChevronRight className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-9">
                  <ChevronsRight className="size-4" />
                </Button>
              </div>

              {/* Move Absolute */}
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Move Absolute</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      className="h-8 font-mono text-xs bg-secondary border-border"
                      placeholder={selectedMotor.position.toFixed(3)}
                      value={moveTarget}
                      onChange={(e) => setMoveTarget(e.target.value)}
                    />
                    <Button size="sm" className="h-8 gap-1 text-xs shrink-0">
                      <ArrowRight className="size-3.5" />
                      Go
                    </Button>
                  </div>
                </div>
              </div>

              {/* Velocity */}
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Velocity ({selectedMotor.unit}/s)</Label>
                  <Input
                    className="h-8 font-mono text-xs bg-secondary border-border"
                    value={velocity}
                    onChange={(e) => setVelocity(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs mt-4">
                  <Home className="size-3.5" />
                  Home
                </Button>
              </div>
            </div>

            {/* Limits */}
            <div className="rounded-md bg-secondary/40 p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">Limits</span>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Low: <span className="text-foreground">{selectedMotor.lowerLimit}</span></span>
                <span className="text-muted-foreground">High: <span className="text-foreground">{selectedMotor.upperLimit}</span></span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-secondary relative overflow-hidden">
                {(() => {
                  const range = selectedMotor.upperLimit - selectedMotor.lowerLimit
                  const pct = ((selectedMotor.position - selectedMotor.lowerLimit) / range) * 100
                  return <div className="absolute h-full rounded-full bg-primary" style={{ width: `${Math.max(1, Math.min(100, pct))}%` }} />
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Presets */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Presets
              </CardTitle>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                <Settings2 className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {defaultPresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  className="h-auto flex-col items-start gap-0.5 p-2.5 text-left"
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <Target className="size-3" />
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{preset.description}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── Scan Queue ──────────────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Scan Queue
              </CardTitle>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] font-mono mr-1">
                  {queue.filter(i => i.status === "queued").length} pending
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  title="Clear completed"
                  onClick={clearCompleted}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  title="Clear all queued"
                  onClick={clearAll}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Current scan progress */}
            {currentScan && (
              <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs font-semibold text-foreground">{currentScan.name}</p>
                    <p className="text-[10px] text-muted-foreground">{currentScan.scanType} -- {currentScan.regions.length} regions / {currentScan.totalPoints} pts</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="size-6" onClick={() => setIsRunning(false)}>
                      <Pause className="size-3" />
                    </Button>
                    <Button size="icon" variant="destructive" className="size-6" onClick={() => {
                      setIsRunning(false)
                      removeFromQueue(currentScan.id)
                    }}>
                      <Square className="size-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Point {Math.round(currentScan.totalPoints * currentScan.progress / 100)} / {currentScan.totalPoints}</span>
                    <span>{currentScan.progress}%</span>
                  </div>
                  <Progress value={currentScan.progress} className="h-1.5" />
                </div>
              </div>
            )}

            {/* Queue list */}
            {queue.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <p className="text-xs">Queue is empty</p>
                <p className="text-[10px] mt-1">Configure a scan above and click Add to Queue</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors",
                      item.status === "running"
                        ? "border-primary/30 bg-primary/5"
                        : item.status === "completed"
                          ? "border-border/50 bg-secondary/20 opacity-60"
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                    )}
                  >
                    {/* Drag handle / index */}
                    <div className="flex flex-col items-center shrink-0">
                      <GripVertical className="size-3 text-muted-foreground/50" />
                      <span className="font-mono text-[10px] text-muted-foreground">{idx + 1}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.scanType} / {item.regions.length} region{item.regions.length > 1 ? "s" : ""} / {item.totalPoints} pts / {Math.floor(item.totalTime / 60)}m {Math.round(item.totalTime % 60)}s
                      </p>
                    </div>

                    {/* Status badge */}
                    <Badge className={cn("text-[10px] shrink-0", queueStatusBadge[item.status])}>
                      {item.status}
                    </Badge>

                    {/* Actions */}
                    <div className={cn(
                      "flex items-center gap-0.5 shrink-0 transition-opacity",
                      item.status === "running" || item.status === "completed" ? "opacity-30 pointer-events-none" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-foreground"
                        disabled={idx === 0}
                        onClick={() => moveInQueue(item.id, "up")}
                      >
                        <ChevronUp className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-foreground"
                        disabled={idx === queue.length - 1}
                        onClick={() => moveInQueue(item.id, "down")}
                      >
                        <ChevronDown className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromQueue(item.id)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Queue actions */}
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1 h-8 gap-1.5 text-xs"
                disabled={queue.filter(i => i.status === "queued").length === 0}
                onClick={() => setIsRunning(true)}
              >
                <Play className="size-3.5" />
                Run Queue ({queue.filter(i => i.status === "queued").length})
              </Button>
              <Button variant="outline" className="h-8 gap-1.5 text-xs" onClick={clearCompleted}>
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
