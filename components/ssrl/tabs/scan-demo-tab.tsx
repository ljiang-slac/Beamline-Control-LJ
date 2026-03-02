"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ParamDisplay } from "@/components/param-display"
import type { BeamlineConfig } from "@/lib/beamline-config"
import {
  ELEMENTS,
  generateSampleXANES,
  generateSample2DMap,
  generateMultiSampleScans,
  generatePowderXRD,
  generateRockingCurve,
} from "@/lib/beamline-config"
import { cn } from "@/lib/utils"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from "recharts"
import { Atom, Layers, Download, Play, Square, RotateCcw, ArrowLeftRight, Pause, Clock, CheckCircle2, Settings2 } from "lucide-react"

const SCAN_COLORS = [
  "oklch(0.65 0.19 145)",
  "oklch(0.55 0.18 200)",
  "oklch(0.70 0.18 80)",
  "oklch(0.60 0.20 300)",
  "oklch(0.60 0.22 25)",
]

function DeferredChart({ children, chartKey }: { children: React.ReactNode; chartKey: string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(false)
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [chartKey])
  if (!ready) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading chart...</div>
  return <>{children}</>
}

type ScanDimension = "1d" | "2d" | "multi" | "xrd" | "rocking"
type ScanState = "idle" | "running" | "paused" | "complete"

function getScanTypesForBeamline(bl: BeamlineConfig): { value: ScanDimension; label: string; description: string }[] {
  const types: { value: ScanDimension; label: string; description: string }[] = []
  if (bl.techniques.some(t => ["XAS", "EXAFS", "XANES", "QEXAFS", "NEXAFS", "Soft XAS"].includes(t))) {
    types.push({ value: "1d", label: "1D XANES / EXAFS", description: "Energy scan through absorption edge" })
  }
  if (bl.techniques.some(t => ["Powder XRD", "SAXS", "WAXS", "MX", "PX"].includes(t))) {
    types.push({ value: "xrd", label: "Powder XRD", description: "Theta-2Theta diffraction scan" })
    types.push({ value: "rocking", label: "Rocking Curve", description: "Omega scan around Bragg peak" })
  }
  if (bl.techniques.some(t => ["Micro-XAS", "Micro-XRF", "XRF"].includes(t)) || bl.techniques.includes("XAS")) {
    types.push({ value: "2d", label: "2D Fluorescence Map", description: "Spatial XRF intensity map" })
  }
  types.push({ value: "multi", label: "Multi-Sample Overlay", description: "Compare edges from multiple samples" })
  if (!types.find(t => t.value === "1d")) {
    types.unshift({ value: "1d", label: "1D Energy Scan", description: "Energy scan" })
  }
  return types
}

const POINTS_PER_TICK = 4
const TICK_MS = 60

export function ScanDemoTab({ beamline }: { beamline: BeamlineConfig }) {
  const [selectedElement, setSelectedElement] = useState("Cu")
  const [selectedEdge, setSelectedEdge] = useState("K")
  const [scanDim, setScanDim] = useState<ScanDimension>("1d")
  const [showDerivative, setShowDerivative] = useState(false)
  const [multiElements, setMultiElements] = useState(["Cu", "Zn", "Fe"])

  // Scan energy range configuration
  const [scanStartEv, setScanStartEv] = useState("")
  const [scanEndEv, setScanEndEv] = useState("")
  const [scanStepSize, setScanStepSize] = useState("3.0")

  // Scan workflow state
  const [scanState, setScanState] = useState<ScanState>("idle")
  const [visiblePoints, setVisiblePoints] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const startTimeRef = useRef(0)

  const scanTypes = useMemo(() => getScanTypesForBeamline(beamline), [beamline])
  const element = ELEMENTS.find(e => e.symbol === selectedElement)!
  const edge = element?.edges.find(e => e.name === selectedEdge)
  const edgeEnergy = edge?.energy ?? 8979

  // Beamline energy limits in eV
  const blMinEv = beamline.energyRange[0] * 1000
  const blMaxEv = beamline.energyRange[1] * 1000
  const edgeInRange = edgeEnergy >= blMinEv && edgeEnergy <= blMaxEv

  // Compute default scan range from edge energy (pre-edge 150 eV before, post-edge 700 eV after)
  const defaultStart = edgeEnergy - 150
  const defaultEnd = edgeEnergy + 700
  const startEv = parseFloat(scanStartEv) || defaultStart
  const endEv = parseFloat(scanEndEv) || defaultEnd
  const stepSize = Math.max(0.1, parseFloat(scanStepSize) || 3.0)
  const nPoints = Math.max(10, Math.round((endEv - startEv) / stepSize))

  // Check if the configured scan range overlaps with the beamline range
  const scanRangeValid = startEv < endEv && startEv < blMaxEv && endEv > blMinEv

  // Auto-fill defaults when element or edge changes
  useEffect(() => {
    setScanStartEv(defaultStart.toFixed(0))
    setScanEndEv(defaultEnd.toFixed(0))
  }, [edgeEnergy, defaultStart, defaultEnd])

  // Full datasets (pre-generated, but only revealed progressively)
  const xanesData = useMemo(() => generateSampleXANES(edgeEnergy, Math.round(nPoints * 0.23), Math.round(nPoints * 0.31), Math.round(nPoints * 0.46)), [edgeEnergy, nPoints])
  const map2D = useMemo(() => generateSample2DMap(selectedElement), [selectedElement])
  const multiData = useMemo(() => {
    const elems = multiElements
      .map(sym => ELEMENTS.find(e => e.symbol === sym))
      .filter(Boolean)
      .map(el => ({ symbol: el!.symbol, edgeEnergy: el!.edges.find(e => e.name === "K")?.energy ?? 8979 }))
    return generateMultiSampleScans(elems)
  }, [multiElements])
  const xrdData = useMemo(() => generatePowderXRD(12398.42 / edgeEnergy), [edgeEnergy])
  const rockingData = useMemo(() => generateRockingCurve(0), [])

  // Total points for current scan type
  const totalPoints = useMemo(() => {
    switch (scanDim) {
      case "1d": return xanesData.length
      case "2d": return map2D.data.length
      case "multi": return multiData.length
      case "xrd": return xrdData.length
      case "rocking": return rockingData.length
    }
  }, [scanDim, xanesData, map2D, multiData, xrdData, rockingData])

  const progress = totalPoints > 0 ? Math.min(100, (visiblePoints / totalPoints) * 100) : 0
  const chartKey = `${beamline.id}-${selectedElement}-${selectedEdge}-${scanDim}`

  // Stop all timers
  const stopScan = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Start / resume scan
  const startScan = useCallback(() => {
    setScanState("running")
    startTimeRef.current = Date.now() - elapsedSec * 1000
    intervalRef.current = setInterval(() => {
      setVisiblePoints(prev => {
        const next = prev + POINTS_PER_TICK
        if (next >= totalPoints) {
          stopScan()
          setScanState("complete")
          return totalPoints
        }
        return next
      })
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, TICK_MS)
  }, [totalPoints, stopScan, elapsedSec])

  const pauseScan = useCallback(() => {
    stopScan()
    setScanState("paused")
  }, [stopScan])

  const resetScan = useCallback(() => {
    stopScan()
    setScanState("idle")
    setVisiblePoints(0)
    setElapsedSec(0)
  }, [stopScan])

  // Reset when config changes
  useEffect(() => {
    resetScan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement, selectedEdge, scanDim, beamline.id, stepSize, startEv, endEv])

  // Cleanup on unmount
  useEffect(() => () => stopScan(), [stopScan])

  // Sliced visible data
  const visibleXanes = xanesData.slice(0, visiblePoints)
  const visibleMap2D = { ...map2D, data: map2D.data.slice(0, visiblePoints) }
  const visibleMulti = multiData.slice(0, visiblePoints)
  const visibleXrd = xrdData.slice(0, visiblePoints)
  const visibleRocking = rockingData.slice(0, visiblePoints)

  const xanesStats = useMemo(() => {
    if (visibleXanes.length < 5) return { e0: 0, peakMu: 0, edgeJump: 0, preMean: 0, postMean: 0, nPts: 0 }
    const muVals = visibleXanes.map(d => d.mu)
    const derivVals = visibleXanes.map(d => d.deriv)
    const maxDerivIdx = derivVals.indexOf(Math.max(...derivVals))
    const preSeg = muVals.slice(0, Math.min(30, Math.floor(muVals.length / 4)))
    const postSeg = muVals.slice(-Math.min(30, Math.floor(muVals.length / 4)))
    return {
      e0: visibleXanes[maxDerivIdx]?.energy ?? 0,
      peakMu: Math.max(...muVals),
      edgeJump: (postSeg.reduce((a, b) => a + b, 0) / postSeg.length) - (preSeg.reduce((a, b) => a + b, 0) / preSeg.length),
      preMean: preSeg.reduce((a, b) => a + b, 0) / preSeg.length,
      postMean: postSeg.reduce((a, b) => a + b, 0) / postSeg.length,
      nPts: visibleXanes.length,
    }
  }, [visibleXanes])

  const toggleMultiElement = (sym: string) => {
    setMultiElements(prev => {
      if (prev.includes(sym)) {
        if (prev.length <= 1) return prev
        return prev.filter(s => s !== sym)
      }
      if (prev.length >= 5) return prev
      return [...prev, sym]
    })
  }

  const formatTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`

  const stateBadge = {
    idle:     { label: "Ready", cls: "border-muted-foreground text-muted-foreground" },
    running:  { label: "Scanning", cls: "border-primary text-primary animate-pulse" },
    paused:   { label: "Paused", cls: "border-chart-3 text-chart-3" },
    complete: { label: "Complete", cls: "border-primary text-primary" },
  }

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <Card className="bg-card border-border">
        <CardContent className="py-3 px-4 space-y-3">
          {/* Row 1: Sample, Edge, Scan Type, Status */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Element */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sample</Label>
              <Select value={selectedElement} onValueChange={v => {
                setSelectedElement(v)
                const el = ELEMENTS.find(e => e.symbol === v)
                if (el && !el.edges.find(e => e.name === selectedEdge)) setSelectedEdge(el.edges[0].name)
              }}>
                <SelectTrigger className="h-8 w-36 font-mono text-xs bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELEMENTS.map(el => (
                    <SelectItem key={el.symbol} value={el.symbol}>
                      <span className="font-mono font-semibold">{el.symbol}</span>
                      <span className="ml-2 text-muted-foreground">{el.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Edge */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Edge</Label>
              <div className="flex gap-1">
                {element?.edges.map(e => {
                  const reach = e.energy >= blMinEv && e.energy <= blMaxEv
                  return (
                    <Button
                      key={e.name}
                      size="sm"
                      variant={selectedEdge === e.name ? "default" : "outline"}
                      className={cn("h-8 px-2 text-xs font-mono", !reach && "opacity-35")}
                      onClick={() => setSelectedEdge(e.name)}
                      disabled={scanState === "running"}
                    >
                      {e.name}
                      <span className="ml-1 text-[9px] opacity-60">{e.energy.toFixed(0)}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Scan type */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Scan Type</Label>
              <Select value={scanDim} onValueChange={v => setScanDim(v as ScanDimension)} disabled={scanState === "running"}>
                <SelectTrigger className="h-8 w-48 text-xs bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scanTypes.map(st => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="outline" className={cn("text-[10px] font-mono", stateBadge[scanState].cls)}>
                {scanState === "complete" && <CheckCircle2 className="size-2.5 mr-1" />}
                {scanState === "running" && <Clock className="size-2.5 mr-1" />}
                {stateBadge[scanState].label}
              </Badge>
            </div>
          </div>

          {/* Row 2: Scan Energy Range, Points, BL info */}
          <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Settings2 className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Scan Range</span>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Start (eV)</Label>
              <Input
                className="h-7 w-24 font-mono text-xs bg-secondary border-border"
                value={scanStartEv}
                onChange={e => setScanStartEv(e.target.value)}
                disabled={scanState === "running"}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">End (eV)</Label>
              <Input
                className="h-7 w-24 font-mono text-xs bg-secondary border-border"
                value={scanEndEv}
                onChange={e => setScanEndEv(e.target.value)}
                disabled={scanState === "running"}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Step (eV)</Label>
              <Input
                className="h-7 w-20 font-mono text-xs bg-secondary border-border"
                value={scanStepSize}
                onChange={e => setScanStepSize(e.target.value)}
                disabled={scanState === "running"}
              />
            </div>
            <div className="flex items-center px-2 py-1 rounded bg-secondary/40 border border-border/50">
              <span className="text-[10px] font-mono text-muted-foreground">
                = <span className="text-foreground font-semibold">{nPoints}</span> pts
              </span>
            </div>
            <div className="flex flex-col gap-0.5 ml-2 text-[10px] font-mono">
              <span className="text-muted-foreground">
                {"BL range: "}
                <span className="text-foreground">{blMinEv.toFixed(0)}</span>
                {" - "}
                <span className="text-foreground">{blMaxEv.toFixed(0)}</span>
                {" eV"}
              </span>
              <span className="text-muted-foreground">
                {"Edge: "}
                <span className={edgeInRange ? "text-primary" : "text-destructive"}>{edgeEnergy.toFixed(0)} eV</span>
                {edgeInRange ? "" : " (outside BL range)"}
              </span>
            </div>
            {!scanRangeValid && (
              <Badge variant="outline" className="text-[10px] border-destructive text-destructive">
                Invalid range
              </Badge>
            )}
          </div>

          {/* Row 3: Action buttons + progress */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {scanState === "idle" && (
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={startScan} disabled={!scanRangeValid}>
                  <Play className="size-3" /> Run Scan
                </Button>
              )}
              {scanState === "running" && (
                <>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={pauseScan}>
                    <Pause className="size-3" /> Pause
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 gap-1.5 text-xs" onClick={resetScan}>
                    <Square className="size-3" /> Abort
                  </Button>
                </>
              )}
              {scanState === "paused" && (
                <>
                  <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={startScan}>
                    <Play className="size-3" /> Resume
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 gap-1.5 text-xs" onClick={resetScan}>
                    <Square className="size-3" /> Abort
                  </Button>
                </>
              )}
              {scanState === "complete" && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={resetScan}>
                  <RotateCcw className="size-3" /> New Scan
                </Button>
              )}
            </div>

            {scanState !== "idle" && (
              <div className="flex flex-1 items-center gap-3 min-w-[200px]">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {visiblePoints} / {totalPoints} pts
                </span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {formatTime(elapsedSec)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty state when idle */}
      {scanState === "idle" && (
        <Card className="bg-card border-border">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="size-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Atom className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No Scan Data</h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              {"Select a sample element, absorption edge, and scan type above, then click "}
              <strong className="text-foreground">Run Scan</strong>
              {" to begin data acquisition. Data will appear progressively as the scan proceeds."}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground font-mono">
              <span>{"Sample: "}<strong className="text-foreground">{selectedElement} {selectedEdge}-edge ({edgeEnergy.toFixed(0)} eV)</strong></span>
              <span>{"Range: "}<strong className="text-foreground">{startEv.toFixed(0)} - {endEv.toFixed(0)} eV</strong></span>
              <span>{"Step: "}<strong className="text-foreground">{stepSize.toFixed(1)} eV</strong>{" ("}{nPoints}{" pts)"}</span>
              <span>{"Type: "}<strong className="text-foreground">{scanTypes.find(s => s.value === scanDim)?.label}</strong></span>
              {!edgeInRange && <span className="text-destructive">{"Edge outside BL range -- scan will still use configured start/end"}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== 1D XANES / EXAFS ===== */}
      {scanDim === "1d" && scanState !== "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Atom className="size-4 text-primary" />
                  {selectedElement} {selectedEdge}-edge XANES -- {beamline.id}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch checked={showDerivative} onCheckedChange={setShowDerivative} />
                  <Label className="text-[10px] text-muted-foreground">Derivative</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[380px] w-full">
                <DeferredChart chartKey={chartKey}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleXanes} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 260)" />
                    <XAxis
                      dataKey="energy"
                      tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }}
                      label={{ value: "Energy (eV)", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }}
                      domain={[xanesData[0]?.energy ?? 0, xanesData[xanesData.length - 1]?.energy ?? 1]}
                    />
                    <YAxis
                      yAxisId="mu"
                      tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }}
                      label={{ value: "mu(E)", angle: -90, position: "insideLeft", offset: 5, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }}
                    />
                    {showDerivative && (
                      <YAxis
                        yAxisId="deriv"
                        orientation="right"
                        tick={{ fontSize: 10, fill: "oklch(0.55 0.18 200)" }}
                        label={{ value: "d mu/dE", angle: 90, position: "insideRight", offset: 5, style: { fontSize: 10, fill: "oklch(0.55 0.18 200)" } }}
                      />
                    )}
                    <Tooltip
                      contentStyle={{ backgroundColor: "oklch(0.17 0.008 260)", border: "1px solid oklch(0.26 0.01 260)", borderRadius: "6px", fontSize: 11, color: "oklch(0.93 0.005 260)" }}
                      formatter={(value: number, name: string) => [value.toFixed(5), name]}
                      labelFormatter={v => `${v} eV`}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line yAxisId="mu" type="monotone" dataKey="mu" stroke="oklch(0.65 0.19 145)" strokeWidth={1.5} dot={false} name={`${selectedElement} mu(E)`} isAnimationActive={false} />
                    {showDerivative && (
                      <Line yAxisId="deriv" type="monotone" dataKey="deriv" stroke="oklch(0.55 0.18 200)" strokeWidth={1} dot={false} strokeDasharray="4 2" name="d mu/dE" isAnimationActive={false} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                </DeferredChart>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Scan Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ParamDisplay label="Sample" value={`${selectedElement} (${element.name})`} variant="primary" />
              <ParamDisplay label="Edge" value={`${selectedEdge} @ ${edgeEnergy.toFixed(1)}`} unit="eV" variant="accent" />
              <ParamDisplay label="E0 (inflection)" value={xanesStats.e0 > 0 ? xanesStats.e0.toFixed(1) : "--"} unit="eV" variant="primary" />
              <ParamDisplay label="Peak mu" value={xanesStats.peakMu > 0 ? xanesStats.peakMu.toFixed(4) : "--"} />
              <ParamDisplay label="Edge Jump" value={xanesStats.edgeJump > 0 ? xanesStats.edgeJump.toFixed(4) : "--"} unit="a.u." />
              <ParamDisplay label="Acquired" value={`${visibleXanes.length} / ${xanesData.length}`} unit="pts" />
              <ParamDisplay label="Beamline" value={beamline.id} />

              <div className="border-t border-border pt-3 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Scan Regions</span>
                <div className="space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between text-foreground">
                    <span>Pre-edge</span>
                    <span>{(edgeEnergy - 150).toFixed(0)} - {(edgeEnergy - 10).toFixed(0)} eV</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span>XANES</span>
                    <span>{(edgeEnergy - 10).toFixed(0)} - {(edgeEnergy + 60).toFixed(0)} eV</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span>EXAFS</span>
                    <span>{(edgeEnergy + 60).toFixed(0)} - {(edgeEnergy + 700).toFixed(0)} eV</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="h-8 text-xs gap-1.5" disabled={scanState === "running"}>
                  <Download className="size-3.5" /> Export
                </Button>
                <Button variant="outline" className="h-8 text-xs gap-1.5" onClick={resetScan}>
                  <RotateCcw className="size-3.5" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== 2D Fluorescence Map ===== */}
      {scanDim === "2d" && scanState !== "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="size-4 text-accent" />
                  {selectedElement} K{"\u03B1"} Fluorescence Map -- {beamline.id}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {map2D.rows} x {map2D.cols} -- {(map2D.rows * 0.5).toFixed(0)} x {(map2D.cols * 0.5).toFixed(0)} {"\u03BCm"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-hidden bg-secondary/20 p-1">
                <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${map2D.cols}, 1fr)`, aspectRatio: `${map2D.cols} / ${map2D.rows}` }}>
                  {map2D.data.map((px, idx) => {
                    const revealed = idx < visiblePoints
                    const norm = px.intensity / 255
                    const h = 280 - norm * 220
                    const l = revealed ? 0.12 + norm * 0.62 : 0.10
                    const c = revealed ? 0.08 + norm * 0.12 : 0.01
                    return (
                      <div
                        key={idx}
                        className="w-full aspect-square"
                        style={{ backgroundColor: `oklch(${l} ${c} ${h})` }}
                        title={revealed ? `[${px.y}, ${px.x}] ${"\u03BCm"}: ${px.intensity} cts` : "Not yet scanned"}
                      />
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-40 rounded-sm" style={{ background: "linear-gradient(to right, oklch(0.12 0.08 280), oklch(0.35 0.12 200), oklch(0.55 0.16 140), oklch(0.74 0.20 60))" }} />
                  <span className="text-[10px] font-mono text-muted-foreground">0 -- 255 cts</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{"Step: 0.5 "}{"\u03BCm"}{" / px"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Map Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ParamDisplay label="Element" value={`${selectedElement} K${"\u03B1"}`} variant="primary" />
              <ParamDisplay label="Excitation" value={edgeEnergy.toFixed(0)} unit="eV" variant="accent" />
              <ParamDisplay label="Progress" value={`${visiblePoints} / ${map2D.data.length}`} unit="px" />
              <ParamDisplay label="Map Size" value={`${map2D.cols} x ${map2D.rows}`} unit="px" />
              <ParamDisplay label="Scan Area" value={`${(map2D.cols * 0.5).toFixed(0)} x ${(map2D.rows * 0.5).toFixed(0)}`} unit={"\u03BCm"} />
              <ParamDisplay label="Pixel Size" value="0.5" unit={"\u03BCm"} />
              <ParamDisplay label="Dwell Time" value="100" unit="ms" />
              {visibleMap2D.data.length > 0 && (
                <>
                  <ParamDisplay label="Max (revealed)" value={Math.max(...visibleMap2D.data.map(d => d.intensity))} unit="cts" />
                  <ParamDisplay label="Min (revealed)" value={Math.min(...visibleMap2D.data.map(d => d.intensity))} unit="cts" />
                </>
              )}
              <div className="border-t border-border pt-3 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {"Row "}{Math.floor(map2D.rows / 2)}{" Line Profile"}
                </span>
                <div className="h-[100px] w-full">
                  <DeferredChart chartKey={`2dbar-${selectedElement}-${visiblePoints}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={visibleMap2D.data.filter(d => d.row === Math.floor(map2D.rows / 2)).map(d => ({ x: d.x, intensity: d.intensity }))}
                      margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                    >
                      <Bar dataKey="intensity" fill="oklch(0.55 0.18 200)" radius={[1, 1, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </DeferredChart>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== Multi-Sample Overlay ===== */}
      {scanDim === "multi" && scanState !== "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <ArrowLeftRight className="size-4 text-primary" />
                  Multi-Sample Edge Comparison
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">{multiElements.length} samples</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[380px] w-full">
                <DeferredChart chartKey={`multi-${multiElements.join("-")}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleMulti} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 260)" />
                    <XAxis dataKey="energy" tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }} label={{ value: "Energy (eV)", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }} label={{ value: "mu(E)", angle: -90, position: "insideLeft", offset: 5, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "oklch(0.17 0.008 260)", border: "1px solid oklch(0.26 0.01 260)", borderRadius: "6px", fontSize: 11, color: "oklch(0.93 0.005 260)" }}
                      formatter={(value: number, name: string) => [value.toFixed(5), name]}
                      labelFormatter={v => `${v} eV`}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {multiElements.map((sym, idx) => (
                      <Line key={sym} type="monotone" dataKey={sym} stroke={SCAN_COLORS[idx % SCAN_COLORS.length]} strokeWidth={1.5} dot={false} name={`${sym} K-edge`} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                </DeferredChart>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Select Samples (max 5)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {ELEMENTS.filter(el => el.edges.find(e => e.name === "K")).map(el => {
                  const kEdge = el.edges.find(e => e.name === "K")!
                  const active = multiElements.includes(el.symbol)
                  const reach = kEdge.energy >= beamline.energyRange[0] * 1000 && kEdge.energy <= beamline.energyRange[1] * 1000
                  return (
                    <Button
                      key={el.symbol}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className={cn("h-7 px-2 text-xs font-mono", !reach && "opacity-35")}
                      onClick={() => toggleMultiElement(el.symbol)}
                      disabled={scanState === "running"}
                    >
                      {el.symbol}
                    </Button>
                  )
                })}
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Selected Edges</span>
                {multiElements.map((sym, idx) => {
                  const el = ELEMENTS.find(e => e.symbol === sym)!
                  const kEdge = el.edges.find(e => e.name === "K")!
                  return (
                    <div key={sym} className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full" style={{ backgroundColor: SCAN_COLORS[idx % SCAN_COLORS.length] }} />
                      <span className="font-mono text-xs font-semibold text-foreground">{sym}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{el.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-accent">{kEdge.energy.toFixed(0)} eV</span>
                    </div>
                  )
                })}
              </div>
              <ParamDisplay label="Acquired" value={`${visibleMulti.length} / ${multiData.length}`} unit="pts" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== Powder XRD ===== */}
      {scanDim === "xrd" && scanState !== "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {"Powder XRD Pattern -- "}{selectedElement}{" ("}{"\u03BB"}{" = "}{(12398.42 / edgeEnergy).toFixed(4)}{" A)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[380px] w-full">
                <DeferredChart chartKey={`xrd-${edgeEnergy}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleXrd} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 260)" />
                    <XAxis dataKey="twoTheta" tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }} label={{ value: "2\u03B8 (deg)", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }}
                      domain={[xrdData[0]?.twoTheta ?? 0, xrdData[xrdData.length - 1]?.twoTheta ?? 130]} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }} label={{ value: "Intensity (cts)", angle: -90, position: "insideLeft", offset: 5, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }} />
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.17 0.008 260)", border: "1px solid oklch(0.26 0.01 260)", borderRadius: "6px", fontSize: 11, color: "oklch(0.93 0.005 260)" }}
                      formatter={(value: number) => [value.toFixed(0), "Intensity"]} labelFormatter={v => `2\u03B8 = ${v}\u00B0`} />
                    <Line type="monotone" dataKey="intensity" stroke="oklch(0.70 0.18 80)" strokeWidth={1.2} dot={false} name="XRD" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                </DeferredChart>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Diffraction Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ParamDisplay label="Wavelength" value={(12398.42 / edgeEnergy).toFixed(4)} unit="A" variant="primary" />
              <ParamDisplay label="Energy" value={edgeEnergy.toFixed(0)} unit="eV" />
              <ParamDisplay label="2-Theta Range" value="10 - 130" unit="deg" />
              <ParamDisplay label="Acquired" value={`${visibleXrd.length} / ${xrdData.length}`} unit="pts" />
              {visibleXrd.length > 0 && <ParamDisplay label="Max Counts" value={Math.max(...visibleXrd.map(d => d.intensity))} unit="cts" variant="accent" />}
              {scanState === "complete" && (
                <div className="border-t border-border pt-3 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Peak List (top 4)</span>
                  <div className="space-y-1 font-mono text-[10px]">
                    {xrdData.filter((d, i) => d.intensity > 100 && (i === 0 || d.intensity > xrdData[i - 1].intensity) && (i === xrdData.length - 1 || d.intensity > xrdData[i + 1].intensity))
                      .sort((a, b) => b.intensity - a.intensity).slice(0, 4)
                      .map((pk, i) => (
                        <div key={i} className="flex justify-between text-foreground">
                          <span>{"2"}{"\u03B8"}{" = "}{pk.twoTheta.toFixed(2)}{"\u00B0"}</span>
                          <span className="text-accent">{pk.intensity} cts</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== Rocking Curve ===== */}
      {scanDim === "rocking" && scanState !== "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {"Rocking Curve ("}{"\u03C9"}{" scan) -- "}{beamline.id}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[380px] w-full">
                <DeferredChart chartKey={`rocking-${beamline.id}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleRocking} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 260)" />
                    <XAxis dataKey="omega" tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }} label={{ value: "\u03C9 (deg)", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }}
                      domain={[rockingData[0]?.omega ?? -1, rockingData[rockingData.length - 1]?.omega ?? 1]} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }} label={{ value: "Intensity (cts)", angle: -90, position: "insideLeft", offset: 5, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }} />
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.17 0.008 260)", border: "1px solid oklch(0.26 0.01 260)", borderRadius: "6px", fontSize: 11, color: "oklch(0.93 0.005 260)" }}
                      formatter={(value: number) => [value.toFixed(0), "Intensity"]} labelFormatter={v => `\u03C9 = ${v}\u00B0`} />
                    <Line type="monotone" dataKey="intensity" stroke="oklch(0.60 0.20 300)" strokeWidth={1.5} dot={false} name="Rocking Curve" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                </DeferredChart>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rocking Curve Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ParamDisplay label="Acquired" value={`${visibleRocking.length} / ${rockingData.length}`} unit="pts" />
              {scanState === "complete" && (() => {
                const peak = rockingData.reduce((a, b) => (b.intensity > a.intensity ? b : a), rockingData[0])
                const halfMax = peak.intensity / 2
                const aboveHalf = rockingData.filter(d => d.intensity >= halfMax)
                const fwhm = aboveHalf.length > 1 ? aboveHalf[aboveHalf.length - 1].omega - aboveHalf[0].omega : 0
                return (
                  <>
                    <ParamDisplay label="Peak Position" value={peak.omega.toFixed(4)} unit="deg" variant="primary" />
                    <ParamDisplay label="Peak Intensity" value={peak.intensity} unit="cts" variant="accent" />
                    <ParamDisplay label="FWHM" value={fwhm.toFixed(4)} unit="deg" />
                    <ParamDisplay label="Integrated" value={rockingData.reduce((sum, d) => sum + d.intensity, 0)} unit="cts" />
                    <ParamDisplay label="Background" value={Math.min(...rockingData.map(d => d.intensity))} unit="cts" />
                    <ParamDisplay label="Peak/BG" value={(peak.intensity / Math.max(1, Math.min(...rockingData.map(d => d.intensity)))).toFixed(0)} />
                  </>
                )
              })()}
              {scanState !== "complete" && (
                <p className="text-[10px] text-muted-foreground italic">Full statistics will appear when the scan completes.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
