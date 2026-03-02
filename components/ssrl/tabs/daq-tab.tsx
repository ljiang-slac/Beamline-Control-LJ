"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { StatusIndicator } from "@/components/status-indicator"
import { ParamDisplay } from "@/components/param-display"
import type { BeamlineConfig } from "@/lib/beamline-config"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, Legend,
} from "recharts"
import { Play, Square, Pause, Activity } from "lucide-react"

// -------------------------------------------------------
// Simulated live-updating data helpers
// -------------------------------------------------------

function generateTransferHistory(points: number = 60) {
  return Array.from({ length: points }, (_, i) => {
    const t = i - points + 1 // seconds ago: -59, -58, ... 0
    const base = 10 + 3 * Math.sin(i * 0.15)
    return {
      time: t,
      readRate: +(base + Math.random() * 2).toFixed(1),
      writeRate: +(base * 0.85 + Math.random() * 1.5).toFixed(1),
      networkRate: +(base * 0.7 + Math.random() * 1.2).toFixed(1),
    }
  })
}

function generateADCDistribution(channels: number = 8) {
  const bins = 64
  const data: { bin: number; [key: string]: number }[] = []
  for (let b = 0; b < bins; b++) {
    const row: { bin: number; [key: string]: number } = { bin: b }
    for (let ch = 0; ch < channels; ch++) {
      const center = 28 + ch * 3.5
      const sigma = 4 + ch * 0.5
      const amplitude = 800 + ch * 120
      row[`ADC${ch}`] = Math.round(
        amplitude * Math.exp(-((b - center) ** 2) / (2 * sigma ** 2)) + Math.random() * 15
      )
    }
    data.push(row)
  }
  return { data, channels }
}

function generateEncoderDistribution(motors: { name: string; encoderReadback: number }[]) {
  // For each motor, generate a Gaussian distribution around the encoder readback
  const bins = 50
  const data: { position: number; [key: string]: number }[] = []
  const center = 0 // relative offset
  for (let b = 0; b < bins; b++) {
    const offset = (b - bins / 2) * 0.02 // +/- 0.5 range
    const row: { position: number; [key: string]: number } = { position: +offset.toFixed(3) }
    motors.forEach((m, idx) => {
      const sigma = 0.08 + idx * 0.01
      const amp = 500 + idx * 50
      row[m.name] = Math.round(amp * Math.exp(-(offset ** 2) / (2 * sigma ** 2)) + Math.random() * 10)
    })
    data.push(row)
  }
  return data
}

const ADC_COLORS = [
  "oklch(0.65 0.19 145)", "oklch(0.55 0.18 200)", "oklch(0.70 0.18 80)",
  "oklch(0.60 0.20 300)", "oklch(0.60 0.22 25)", "oklch(0.72 0.14 180)",
  "oklch(0.58 0.16 60)", "oklch(0.50 0.22 340)",
]

const ENCODER_COLORS = [
  "oklch(0.65 0.19 145)", "oklch(0.55 0.18 200)", "oklch(0.70 0.18 80)",
  "oklch(0.60 0.20 300)", "oklch(0.60 0.22 25)",
]

/**
 * DeferredChart: defers chart rendering by one animation frame
 * so ResponsiveContainer can correctly measure parent dimensions.
 */
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

// -------------------------------------------------------
// DAQ Tab Component
// -------------------------------------------------------

export function DAQTab({ beamline }: { beamline: BeamlineConfig }) {
  const [triggerMode, setTriggerMode] = useState("software")
  const [isRunning, setIsRunning] = useState(true)
  const [transferData, setTransferData] = useState(() => generateTransferHistory())
  const [selectedADCChannels, setSelectedADCChannels] = useState<number[]>([0, 1, 2, 3])

  const adcDist = useMemo(() => generateADCDistribution(8), [])

  // Pick up to 5 motors that have encoder readback for the encoder distribution
  const encoderMotors = useMemo(
    () => beamline.motors.filter(m => m.encoderReadback !== undefined).slice(0, 5),
    [beamline.motors]
  )
  const encoderDist = useMemo(
    () => generateEncoderDistribution(encoderMotors),
    [encoderMotors]
  )

  // Simulate live data transfer updates every 1s
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setTransferData(prev => {
        const last = prev[prev.length - 1]
        const base = 10 + 3 * Math.sin(Date.now() * 0.001)
        const newPoint = {
          time: 0,
          readRate: +(base + Math.random() * 2).toFixed(1),
          writeRate: +(base * 0.85 + Math.random() * 1.5).toFixed(1),
          networkRate: +(base * 0.7 + Math.random() * 1.2).toFixed(1),
        }
        const shifted = prev.slice(1).map(p => ({ ...p, time: p.time - 1 }))
        return [...shifted, newPoint]
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  const chartKey = `daq-${beamline.id}`

  // Latest rates
  const latestTransfer = transferData[transferData.length - 1]
  const avgRead = +(transferData.reduce((s, d) => s + d.readRate, 0) / transferData.length).toFixed(1)
  const peakRead = Math.max(...transferData.map(d => d.readRate)).toFixed(1)

  function toggleADCChannel(ch: number) {
    setSelectedADCChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch].sort()
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Current Scan Status */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Current Scan
            </CardTitle>
            <StatusIndicator status={isRunning ? "online" : "idle"} label={isRunning ? "Acquiring" : "Idle"} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRunning ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono font-semibold text-foreground">Fe K-edge EXAFS</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Continuous Scan on {beamline.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setIsRunning(false)}>
                    <Pause className="size-3.5" />
                    <span className="hidden sm:inline">Pause</span>
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 gap-1.5" onClick={() => setIsRunning(false)}>
                    <Square className="size-3.5" />
                    <span className="hidden sm:inline">Abort</span>
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Point 335 / 500</span>
                  <span>67%</span>
                </div>
                <Progress value={67} className="h-2" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ParamDisplay label="Elapsed" value="04:28" unit="mm:ss" />
                <ParamDisplay label="Remaining" value="02:11" unit="mm:ss" />
                <ParamDisplay label="Data Rate" value={latestTransfer?.readRate.toFixed(1) ?? "0"} unit="MB/s" variant="primary" />
                <ParamDisplay label="Events" value="335,021" variant="accent" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">No scan in progress</p>
              <p className="text-[10px] mt-1">Configure scans in the Motor Control tab</p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setIsRunning(true)}>
                <Play className="size-3.5" />
                Start Next Scan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DAQ Throughput */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            DAQ Throughput
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ParamDisplay label="Buffer Usage" value="42" unit="%" variant="primary" />
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Buffer</span>
            <Progress value={42} className="h-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ParamDisplay label="Read Rate" value={latestTransfer?.readRate.toFixed(1) ?? "0"} unit="MB/s" variant="primary" />
            <ParamDisplay label="Write Rate" value={latestTransfer?.writeRate.toFixed(1) ?? "0"} unit="MB/s" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ParamDisplay label="Network" value={latestTransfer?.networkRate.toFixed(1) ?? "0"} unit="MB/s" variant="accent" />
            <ParamDisplay label="Peak Read" value={peakRead} unit="MB/s" />
          </div>
          <ParamDisplay label="Avg Read" value={String(avgRead)} unit="MB/s" />
          <ParamDisplay label="Total Written" value="2.34" unit="GB" />
          <ParamDisplay label="Dropped" value="0" unit="events" variant="primary" />
        </CardContent>
      </Card>

      {/* Live Data Transfer Rate Chart */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Activity className="size-4 text-primary" />
              Live Data Transfer Rate
            </CardTitle>
            {isRunning && (
              <Badge variant="outline" className="border-primary text-primary text-[10px] font-mono animate-pulse">
                LIVE
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <DeferredChart chartKey={chartKey + "-transfer"}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={transferData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.19 145)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.19 145)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="writeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.55 0.18 200)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.55 0.18 200)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.70 0.18 80)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="oklch(0.70 0.18 80)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 260)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 9, fill: "oklch(0.60 0.01 260)" }}
                    label={{ value: "Time (s)", position: "insideBottom", offset: -2, style: { fontSize: 9, fill: "oklch(0.60 0.01 260)" } }}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "oklch(0.60 0.01 260)" }}
                    label={{ value: "MB/s", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 9, fill: "oklch(0.60 0.01 260)" } }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.17 0.008 260)",
                      border: "1px solid oklch(0.26 0.01 260)",
                      borderRadius: "6px",
                      fontSize: 10,
                      color: "oklch(0.93 0.005 260)",
                    }}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)} MB/s`, name]}
                    labelFormatter={v => `${v}s ago`}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="readRate"
                    stroke="oklch(0.65 0.19 145)"
                    fill="url(#readGrad)"
                    strokeWidth={1.5}
                    name="Read Rate"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="writeRate"
                    stroke="oklch(0.55 0.18 200)"
                    fill="url(#writeGrad)"
                    strokeWidth={1.5}
                    name="Write Rate"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="networkRate"
                    stroke="oklch(0.70 0.18 80)"
                    fill="url(#netGrad)"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    name="Network I/O"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </DeferredChart>
          </div>
        </CardContent>
      </Card>

      {/* Trigger Setup */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Trigger Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Trigger Mode</Label>
            <Select value={triggerMode} onValueChange={setTriggerMode}>
              <SelectTrigger className="h-8 font-mono text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="software">Software Trigger</SelectItem>
                <SelectItem value="hardware">Hardware Trigger</SelectItem>
                <SelectItem value="encoder">Encoder Gate</SelectItem>
                <SelectItem value="external">External TTL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Settling Time (ms)</Label>
            <Input className="h-8 font-mono text-xs bg-secondary border-border" defaultValue="50" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Gate Signal Output</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Auto-Dark Subtraction</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Dead-time Correction</Label>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* ADC Distribution */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              ADC Channel Distribution
            </CardTitle>
            <span className="text-[10px] text-muted-foreground font-mono">{adcDist.channels} channels</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Array.from({ length: adcDist.channels }, (_, i) => (
              <button
                key={i}
                onClick={() => toggleADCChannel(i)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  selectedADCChannels.includes(i)
                    ? "border-primary/50 text-foreground"
                    : "border-border text-muted-foreground opacity-40 hover:opacity-70"
                }`}
                style={selectedADCChannels.includes(i) ? { backgroundColor: ADC_COLORS[i % ADC_COLORS.length] + "20" } : {}}
              >
                ADC{i}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <DeferredChart chartKey={chartKey + "-adc-" + selectedADCChannels.join(",")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adcDist.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 260)" />
                  <XAxis
                    dataKey="bin"
                    tick={{ fontSize: 9, fill: "oklch(0.60 0.01 260)" }}
                    label={{ value: "ADC Bin", position: "insideBottom", offset: -2, style: { fontSize: 9, fill: "oklch(0.60 0.01 260)" } }}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "oklch(0.60 0.01 260)" }}
                    label={{ value: "Counts", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 9, fill: "oklch(0.60 0.01 260)" } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.17 0.008 260)",
                      border: "1px solid oklch(0.26 0.01 260)",
                      borderRadius: "6px",
                      fontSize: 10,
                      color: "oklch(0.93 0.005 260)",
                    }}
                    formatter={(value: number, name: string) => [value.toFixed(0), name]}
                    labelFormatter={v => `Bin ${v}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {selectedADCChannels.map((ch) => (
                    <Bar
                      key={`ADC${ch}`}
                      dataKey={`ADC${ch}`}
                      fill={ADC_COLORS[ch % ADC_COLORS.length]}
                      fillOpacity={0.7}
                      name={`ADC ${ch}`}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </DeferredChart>
          </div>
          {/* Per-channel statistics */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {selectedADCChannels.slice(0, 4).map(ch => {
              const chData = adcDist.data.map(d => d[`ADC${ch}`])
              const total = chData.reduce((a, b) => a + b, 0)
              const maxBin = chData.indexOf(Math.max(...chData))
              const peak = Math.max(...chData)
              return (
                <div key={ch} className="rounded-md border border-border bg-secondary/20 px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: ADC_COLORS[ch % ADC_COLORS.length] }}
                    />
                    <span className="font-mono text-[10px] font-semibold text-foreground">ADC {ch}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 text-[9px] text-muted-foreground font-mono">
                    <span>Total: <span className="text-foreground">{(total / 1000).toFixed(1)}k</span></span>
                    <span>Peak: <span className="text-foreground">{peak}</span></span>
                    <span>Center: <span className="text-foreground">Bin {maxBin}</span></span>
                    <span>FWHM: <span className="text-foreground">~{(8 + ch).toFixed(0)}</span></span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Encoder Distribution */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Encoder Distribution
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">
            Position repeatability around setpoint
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <DeferredChart chartKey={chartKey + "-encoder"}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={encoderDist} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 260)" />
                  <XAxis
                    dataKey="position"
                    tick={{ fontSize: 9, fill: "oklch(0.60 0.01 260)" }}
                    label={{ value: "Offset (mm)", position: "insideBottom", offset: -2, style: { fontSize: 9, fill: "oklch(0.60 0.01 260)" } }}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "oklch(0.60 0.01 260)" }}
                    label={{ value: "Freq", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 9, fill: "oklch(0.60 0.01 260)" } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.17 0.008 260)",
                      border: "1px solid oklch(0.26 0.01 260)",
                      borderRadius: "6px",
                      fontSize: 10,
                      color: "oklch(0.93 0.005 260)",
                    }}
                    formatter={(value: number, name: string) => [value.toFixed(0), name]}
                    labelFormatter={v => `${v} mm`}
                  />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  {encoderMotors.map((m, idx) => (
                    <Line
                      key={m.name}
                      type="monotone"
                      dataKey={m.name}
                      stroke={ENCODER_COLORS[idx % ENCODER_COLORS.length]}
                      strokeWidth={1.5}
                      dot={false}
                      name={m.name}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </DeferredChart>
          </div>
          {/* Motor encoder stats */}
          <div className="mt-3 space-y-1.5">
            {encoderMotors.slice(0, 5).map((m, idx) => (
              <div key={m.name} className="flex items-center justify-between rounded border border-border bg-secondary/20 px-2 py-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: ENCODER_COLORS[idx % ENCODER_COLORS.length] }}
                  />
                  <span className="font-mono text-[10px] text-foreground">{m.name}</span>
                </div>
                <div className="flex gap-3 font-mono text-[9px] text-muted-foreground">
                  <span>Pos: <span className="text-foreground">{m.encoderReadback.toFixed(4)}</span></span>
                  <span>RMS: <span className="text-accent">{(0.002 + idx * 0.0005).toFixed(4)}</span></span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* File Output */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            File Output
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Output Directory</Label>
            <Input className="h-8 font-mono text-xs bg-secondary border-border" defaultValue={`/data/${beamline.id.toLowerCase()}/2026-02/`} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">File Prefix</Label>
            <Input className="h-8 font-mono text-xs bg-secondary border-border" defaultValue="scan_" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <Select defaultValue="hdf5">
              <SelectTrigger className="h-8 font-mono text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hdf5">HDF5 / NeXus</SelectItem>
                <SelectItem value="ascii">ASCII Columns</SelectItem>
                <SelectItem value="spec">SPEC Format</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ParamDisplay label="Next File #" value="0247" variant="primary" />
        </CardContent>
      </Card>

      {/* DAQ Channel Summary */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Channel Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary/30 text-muted-foreground">
                  <th className="px-3 py-1.5 text-left font-medium">Channel</th>
                  <th className="px-3 py-1.5 text-right font-medium">Count Rate</th>
                  <th className="px-3 py-1.5 text-right font-medium">Total Counts</th>
                  <th className="px-3 py-1.5 text-right font-medium">Dead Time</th>
                  <th className="px-3 py-1.5 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {beamline.scalerChannels.filter(c => c.enabled).map(ch => {
                  const deadTime = +(Math.random() * 5).toFixed(1)
                  return (
                    <tr key={ch.channel} className="border-t border-border/50 font-mono tabular-nums">
                      <td className="px-3 py-1.5 text-foreground font-semibold">{ch.name}</td>
                      <td className="px-3 py-1.5 text-right text-foreground">{ch.countRate.toExponential(2)}</td>
                      <td className="px-3 py-1.5 text-right text-foreground">{ch.counts.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right">
                        <span className={deadTime > 3 ? "text-destructive" : "text-primary"}>{deadTime}%</span>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="inline-block size-2 rounded-full bg-primary" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
