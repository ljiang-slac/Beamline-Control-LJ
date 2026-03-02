"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ParamDisplay } from "@/components/param-display"
import type { BeamlineConfig } from "@/lib/beamline-config"
import { generateScanData, generate2DMapData } from "@/lib/beamline-config"
import { cn } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Download, ZoomIn, ZoomOut, Maximize2, Layers } from "lucide-react"

export function DataDisplayTab({ beamline }: { beamline: BeamlineConfig }) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [plotMode, setPlotMode] = useState<"mu" | "transmission" | "fluorescence">("mu")

  const scanData = useMemo(() => generateScanData(beamline.id, 250), [beamline.id])
  const mapData = useMemo(() => generate2DMapData(20, 30), [])

  // Overlay scan: shifted version of primary
  const overlayData = useMemo(() => {
    return scanData.map((d) => ({
      ...d,
      mu_overlay: d.mu * 0.92 + 0.03 + (Math.random() - 0.5) * 0.015,
    }))
  }, [scanData])

  // Compute stats from scan data
  const stats = useMemo(() => {
    const muValues = scanData.map((d) => d.mu)
    const maxMu = Math.max(...muValues)
    const minMu = Math.min(...muValues)
    const maxIdx = muValues.indexOf(maxMu)
    const edgeIdx = muValues.findIndex((v, i) => i > 0 && v - muValues[i - 1] > 0.03)

    return {
      peakPosition: scanData[maxIdx]?.energy || 0,
      peakHeight: maxMu,
      edgeEnergy: edgeIdx > 0 ? scanData[edgeIdx].energy : 0,
      edgeJump: maxMu - minMu,
      numPoints: scanData.length,
    }
  }, [scanData])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Live Scan Plot */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Live Scan Plot -- {beamline.id}
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Select value={plotMode} onValueChange={(v) => setPlotMode(v as typeof plotMode)}>
                <SelectTrigger className="h-7 w-32 text-[10px] font-mono bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mu">Absorption (mu)</SelectItem>
                  <SelectItem value="transmission">Transmission</SelectItem>
                  <SelectItem value="fluorescence">Fluorescence</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                <ZoomIn className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                <ZoomOut className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                <Maximize2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={showOverlay ? overlayData : scanData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 260)" />
                <XAxis
                  dataKey="energy"
                  tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }}
                  label={{ value: "Energy (eV)", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "oklch(0.60 0.01 260)" }}
                  label={{ value: plotMode === "mu" ? "mu(E)" : plotMode === "transmission" ? "I1/I0" : "IF/I0", angle: -90, position: "insideLeft", offset: 5, style: { fontSize: 10, fill: "oklch(0.60 0.01 260)" } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.17 0.008 260)",
                    border: "1px solid oklch(0.26 0.01 260)",
                    borderRadius: "6px",
                    fontSize: 11,
                    color: "oklch(0.93 0.005 260)",
                  }}
                  labelFormatter={(v) => `Energy: ${v} eV`}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="mu"
                  stroke="oklch(0.65 0.19 145)"
                  strokeWidth={1.5}
                  dot={false}
                  name="Current Scan"
                  isAnimationActive={false}
                />
                {showOverlay && (
                  <Line
                    type="monotone"
                    dataKey="mu_overlay"
                    stroke="oklch(0.55 0.18 200)"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 2"
                    name="Reference"
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <Switch checked={showOverlay} onCheckedChange={setShowOverlay} />
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Layers className="size-3" />
                Overlay Reference
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Statistics */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Scan Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ParamDisplay label="Edge Energy" value={stats.edgeEnergy.toFixed(1)} unit="eV" variant="primary" />
          <ParamDisplay label="Peak Position" value={stats.peakPosition.toFixed(1)} unit="eV" variant="accent" />
          <ParamDisplay label="Peak Height" value={stats.peakHeight.toFixed(4)} unit="a.u." />
          <ParamDisplay label="Edge Jump" value={stats.edgeJump.toFixed(4)} unit="a.u." />
          <ParamDisplay label="Data Points" value={stats.numPoints} />

          <div className="border-t border-border pt-3 space-y-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Export Options</span>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-8 text-xs gap-1.5">
                <Download className="size-3.5" />
                ASCII
              </Button>
              <Button variant="outline" className="h-8 text-xs gap-1.5">
                <Download className="size-3.5" />
                HDF5
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2D Map Viewer */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              2D Map / Area Scan
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              {mapData.length} x {mapData[0]?.length || 0} px
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden bg-secondary/20 p-1">
            <div
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(${mapData[0]?.length || 1}, 1fr)`,
                aspectRatio: `${mapData[0]?.length || 1} / ${mapData.length}`,
              }}
            >
              {mapData.flatMap((row, r) =>
                row.map((val, c) => {
                  const normalized = val / 255
                  const h = 145 - normalized * 100
                  const l = 0.15 + normalized * 0.55
                  return (
                    <div
                      key={`${r}-${c}`}
                      className="w-full aspect-square"
                      style={{
                        backgroundColor: `oklch(${l} 0.15 ${h})`,
                      }}
                      title={`[${r},${c}]: ${val}`}
                    />
                  )
                })
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="h-2 w-16 rounded-sm" style={{
                  background: "linear-gradient(to right, oklch(0.15 0.15 145), oklch(0.45 0.15 100), oklch(0.70 0.15 45))"
                }} />
                <span className="text-[10px] text-muted-foreground ml-1">0 -- 255 cts</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-6 text-muted-foreground">
                <ZoomIn className="size-3" />
              </Button>
              <Button variant="ghost" size="icon" className="size-6 text-muted-foreground">
                <ZoomOut className="size-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Current File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Filename</span>
            <p className="font-mono text-xs text-foreground break-all">
              {beamline.id.toLowerCase().replace("-", "")}_fe_xas_001.dat
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Path</span>
            <p className="font-mono text-[10px] text-muted-foreground break-all">
              /data/ssrl/{beamline.id.toLowerCase()}/2026/02/27/
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Format</span>
              <p className="font-mono text-xs text-foreground">SPEC ASCII</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Size</span>
              <p className="font-mono text-xs text-foreground">2.34 MB</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Scan #</span>
              <p className="font-mono text-xs text-primary">42</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Columns</span>
              <p className="font-mono text-xs text-foreground">{beamline.scalerChannels.length + 1}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
