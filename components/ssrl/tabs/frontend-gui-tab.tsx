"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusIndicator } from "@/components/status-indicator"
import { ParamDisplay } from "@/components/param-display"
import type { BeamlineConfig } from "@/lib/beamline-config"
import { ELEMENTS, CRYSTAL_OPTIONS, calcBraggAngle, calcCrystalGap, calcEnergyFromBragg } from "@/lib/beamline-config"
import { cn } from "@/lib/utils"
import { ShieldCheck, ShieldAlert, ArrowRight, Gauge, Atom, Calculator } from "lucide-react"

function formatPressure(val: number): string {
  if (val >= 1) return `${val.toFixed(1)}`
  const exp = Math.floor(Math.log10(val))
  const mantissa = val / Math.pow(10, exp)
  return `${mantissa.toFixed(1)}e${exp}`
}

export function FrontendGUITab({ beamline }: { beamline: BeamlineConfig }) {
  const [shutterOpen, setShutterOpen] = useState(beamline.status === "operational")
  const [bpmXPos, setBpmXPos] = useState(0.012)
  const [bpmYPos, setBpmYPos] = useState(-0.005)
  const [attenuator, setAttenuator] = useState("none")

  // Sample / Edge calculator state
  const [selectedElement, setSelectedElement] = useState("Cu")
  const [selectedEdge, setSelectedEdge] = useState("K")
  const [thetaOffset, setThetaOffset] = useState("0.000")
  const [beamOffset, setBeamOffset] = useState("20.0")
  const [customEnergy, setCustomEnergy] = useState("")
  const [selectedCrystal, setSelectedCrystal] = useState(
    CRYSTAL_OPTIONS.find(c => c.label === beamline.monochromator.crystal)?.label ?? "Si(111)"
  )

  const element = ELEMENTS.find(e => e.symbol === selectedElement)!
  const edge = element.edges.find(e => e.name === selectedEdge)
  const crystal = CRYSTAL_OPTIONS.find(c => c.label === selectedCrystal)!

  // Determine energy to use: custom energy overrides edge selection
  const activeEnergy = customEnergy ? parseFloat(customEnergy) : edge?.energy ?? 0

  const braggAngle = useMemo(() => {
    if (!activeEnergy || !crystal) return null
    return calcBraggAngle(activeEnergy, crystal.dSpacing)
  }, [activeEnergy, crystal])

  const effectiveAngle = braggAngle !== null ? braggAngle + parseFloat(thetaOffset || "0") : null

  const crystalGap = useMemo(() => {
    if (effectiveAngle === null) return null
    return calcCrystalGap(effectiveAngle, parseFloat(beamOffset || "20"))
  }, [effectiveAngle, beamOffset])

  // Check if the selected edge energy is reachable by this beamline
  const energyInRange = activeEnergy > 0 &&
    activeEnergy >= beamline.energyRange[0] * 1000 &&
    activeEnergy <= beamline.energyRange[1] * 1000

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Beamline Optics Schematic */}
      <Card className="lg:col-span-3 bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Beamline Optics Layout -- {beamline.id}
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              {beamline.source}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* SVG Schematic */}
          <div className="rounded-lg border border-border bg-secondary/10 p-4 overflow-x-auto">
            <svg viewBox="0 0 900 120" className="w-full min-w-[700px] h-auto" role="img" aria-label={`Optics schematic for beamline ${beamline.id}`}>
              {/* Beam path line */}
              <line x1="30" y1="60" x2="870" y2="60" stroke="oklch(0.65 0.19 145)" strokeWidth="2" strokeDasharray="6 3" opacity="0.4" />

              {/* Source */}
              <rect x="10" y="40" width="40" height="40" rx="4" fill="oklch(0.22 0.01 260)" stroke="oklch(0.65 0.19 145)" strokeWidth="1.5" />
              <text x="30" y="55" textAnchor="middle" fill="oklch(0.65 0.19 145)" fontSize="8" fontWeight="bold">SRC</text>
              <text x="30" y="67" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="6">{beamline.source.split(" ")[0]}</text>
              <text x="30" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">Source</text>

              {/* Front-End Shutter */}
              <rect x="90" y="42" width="36" height="36" rx="3"
                fill={shutterOpen ? "oklch(0.25 0.05 145)" : "oklch(0.25 0.05 25)"}
                stroke={shutterOpen ? "oklch(0.65 0.19 145)" : "oklch(0.55 0.22 25)"}
                strokeWidth="1.5"
              />
              <text x="108" y="57" textAnchor="middle" fill={shutterOpen ? "oklch(0.65 0.19 145)" : "oklch(0.55 0.22 25)"} fontSize="7" fontWeight="bold">
                {shutterOpen ? "OPEN" : "SHUT"}
              </text>
              <text x="108" y="68" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="6">FE</text>
              <text x="108" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">Shutter</text>

              {/* Slit 0 */}
              <g>
                <rect x="170" y="45" width="8" height="12" rx="1" fill="oklch(0.55 0.18 200)" />
                <rect x="170" y="63" width="8" height="12" rx="1" fill="oklch(0.55 0.18 200)" />
                <text x="174" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">Slit 0</text>
              </g>

              {/* Mirror M0 (if exists) */}
              {beamline.mirrors.length > 0 && (
                <g>
                  <rect x="230" y="44" width="50" height="8" rx="2" fill="oklch(0.22 0.01 260)" stroke="oklch(0.55 0.18 200)" strokeWidth="1" transform="rotate(-5 255 48)" />
                  <text x="255" y="67" textAnchor="middle" fill="oklch(0.55 0.18 200)" fontSize="7" fontWeight="bold">{beamline.mirrors[0].coating}</text>
                  <text x="255" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">{beamline.mirrors[0].name.length > 15 ? "Mirror 1" : beamline.mirrors[0].name}</text>
                </g>
              )}

              {/* Monochromator */}
              <g>
                <rect x="340" y="35" width="60" height="50" rx="4" fill="oklch(0.22 0.01 260)" stroke="oklch(0.65 0.19 145)" strokeWidth="1.5" />
                {/* Crystal representations */}
                <line x1="355" y1="48" x2="375" y2="42" stroke="oklch(0.65 0.19 145)" strokeWidth="2" />
                <line x1="355" y1="72" x2="375" y2="78" stroke="oklch(0.65 0.19 145)" strokeWidth="2" />
                <text x="370" y="63" textAnchor="middle" fill="oklch(0.93 0.005 260)" fontSize="7" fontWeight="bold">DCM</text>
                <text x="370" y="105" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">{beamline.monochromator.crystal}</text>
              </g>

              {/* Slit 1 */}
              <g>
                <rect x="440" y="45" width="8" height="12" rx="1" fill="oklch(0.55 0.18 200)" />
                <rect x="440" y="63" width="8" height="12" rx="1" fill="oklch(0.55 0.18 200)" />
                <text x="444" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">Slit 1</text>
              </g>

              {/* Mirror M1 (if 2nd exists) */}
              {beamline.mirrors.length > 1 && (
                <g>
                  <rect x="490" y="44" width="50" height="8" rx="2" fill="oklch(0.22 0.01 260)" stroke="oklch(0.55 0.18 200)" strokeWidth="1" transform="rotate(5 515 48)" />
                  <text x="515" y="67" textAnchor="middle" fill="oklch(0.55 0.18 200)" fontSize="7" fontWeight="bold">{beamline.mirrors[1].coating}</text>
                  <text x="515" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">Mirror 2</text>
                </g>
              )}

              {/* BPM */}
              <g>
                <circle cx="600" cy="60" r="12" fill="oklch(0.22 0.01 260)" stroke="oklch(0.70 0.18 80)" strokeWidth="1.5" />
                <text x="600" y="63" textAnchor="middle" fill="oklch(0.70 0.18 80)" fontSize="7" fontWeight="bold">BPM</text>
                <text x="600" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">Position</text>
              </g>

              {/* Guard Slit */}
              <g>
                <rect x="660" y="47" width="6" height="10" rx="1" fill="oklch(0.55 0.18 200)" />
                <rect x="660" y="63" width="6" height="10" rx="1" fill="oklch(0.55 0.18 200)" />
                <text x="663" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">Guard</text>
              </g>

              {/* Ion Chambers */}
              <g>
                <rect x="720" y="42" width="30" height="36" rx="3" fill="oklch(0.22 0.01 260)" stroke="oklch(0.70 0.18 80)" strokeWidth="1" />
                <text x="735" y="57" textAnchor="middle" fill="oklch(0.70 0.18 80)" fontSize="7" fontWeight="bold">I0</text>
                <text x="735" y="68" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="6">IC</text>
                <text x="735" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">I0</text>
              </g>

              {/* Sample */}
              <g>
                <rect x="790" y="38" width="40" height="44" rx="4" fill="oklch(0.22 0.01 260)" stroke="oklch(0.93 0.005 260)" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="810" y="57" textAnchor="middle" fill="oklch(0.93 0.005 260)" fontSize="8" fontWeight="bold">S</text>
                <text x="810" y="68" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="6">sample</text>
                <text x="810" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">Sample</text>
              </g>

              {/* Detector */}
              <g>
                <rect x="855" y="42" width="30" height="36" rx="3" fill="oklch(0.22 0.01 260)" stroke="oklch(0.65 0.19 145)" strokeWidth="1.5" />
                <text x="870" y="57" textAnchor="middle" fill="oklch(0.65 0.19 145)" fontSize="7" fontWeight="bold">DET</text>
                <text x="870" y="68" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="6">I1</text>
                <text x="870" y="95" textAnchor="middle" fill="oklch(0.60 0.01 260)" fontSize="7">Detector</text>
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Photon Shutter / Interlock */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Photon Shutter & Interlocks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {shutterOpen ? (
                <ShieldCheck className="size-5 text-primary" />
              ) : (
                <ShieldAlert className="size-5 text-destructive" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Photon Shutter</p>
                <p className="text-[10px] text-muted-foreground">Front-end photon beam control</p>
              </div>
            </div>
            <Switch checked={shutterOpen} onCheckedChange={setShutterOpen} />
          </div>

          <div className="space-y-2">
            {[
              { name: "Hutch Door", status: true },
              { name: "Search Complete", status: true },
              { name: "Emergency Stop", status: true },
              { name: "Vacuum Interlock", status: beamline.status !== "fault" },
              { name: "Thermal Interlock", status: true },
              { name: "BPM Interlock", status: true },
            ].map((interlock) => (
              <div key={interlock.name} className="flex items-center justify-between rounded bg-secondary/30 px-3 py-1.5">
                <span className="text-xs text-foreground">{interlock.name}</span>
                <StatusIndicator
                  status={interlock.status ? "online" : "error"}
                  label={interlock.status ? "OK" : "TRIPPED"}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* BPM Readings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Beam Position Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ParamDisplay label="X Position" value={bpmXPos.toFixed(3)} unit="mm" variant="primary" />
            <ParamDisplay label="Y Position" value={bpmYPos.toFixed(3)} unit="mm" variant="accent" />
          </div>

          {/* BPM Cross-hair visualization */}
          <div className="relative mx-auto size-40 rounded-md border border-border bg-secondary/20">
            <svg viewBox="0 0 100 100" className="size-full">
              {/* Grid */}
              <line x1="50" y1="0" x2="50" y2="100" stroke="oklch(0.26 0.01 260)" strokeWidth="0.5" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="oklch(0.26 0.01 260)" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="15" fill="none" stroke="oklch(0.26 0.01 260)" strokeWidth="0.5" strokeDasharray="2 2" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="oklch(0.26 0.01 260)" strokeWidth="0.5" strokeDasharray="2 2" />
              {/* Beam spot */}
              {(() => {
                const px = 50 + bpmXPos * 1000
                const py = 50 - bpmYPos * 1000
                return (
                  <>
                    <circle cx={px} cy={py} r="6" fill="oklch(0.65 0.19 145)" opacity="0.3" />
                    <circle cx={px} cy={py} r="3" fill="oklch(0.65 0.19 145)" />
                    <line x1={px} y1={py - 8} x2={px} y2={py + 8} stroke="oklch(0.65 0.19 145)" strokeWidth="0.5" />
                    <line x1={px - 8} y1={py} x2={px + 8} y2={py} stroke="oklch(0.65 0.19 145)" strokeWidth="0.5" />
                  </>
                )
              })()}
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ParamDisplay label="Intensity" value="4.56e6" unit="cts" />
            <ParamDisplay label="Size (FWHM)" value="0.35" unit="mm" />
          </div>
        </CardContent>
      </Card>

      {/* Vacuum System */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Vacuum System
            </CardTitle>
            <Gauge className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {beamline.vacuumSections.map((section) => (
              <div
                key={section.name}
                className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/20 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{section.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {formatPressure(section.pressure)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{section.unit}</span>
                  <div className={cn(
                    "size-2 rounded-full",
                    section.status === "ok" ? "bg-primary" : section.status === "warning" ? "bg-chart-3" : "bg-destructive"
                  )} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monochromator Controls */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Monochromator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ParamDisplay label="Crystal" value={beamline.monochromator.crystal} variant="primary" />
            <ParamDisplay label="Type" value={beamline.monochromator.type} />
          </div>
          <ParamDisplay label="Bragg Angle" value={beamline.monochromator.braggAngle.toFixed(3)} unit="deg" variant="accent" />
          <ParamDisplay label="d-spacing" value={beamline.monochromator.dSpacing.toFixed(4)} unit="A" />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Energy Set (eV)</Label>
            <div className="flex gap-1.5">
              <Input
                className="h-8 font-mono text-xs bg-secondary border-border"
                defaultValue={String(beamline.energyRange[0] * 1000 + 280)}
              />
              <Button size="sm" className="h-8 shrink-0 gap-1 text-xs">
                <ArrowRight className="size-3.5" />
                Set
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================= */}
      {/* Sample / Edge Energy & Bragg Calculator    */}
      {/* ========================================= */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Atom className="size-4 text-primary" />
              Sample Edge Calculator
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-mono",
                energyInRange ? "border-primary text-primary" : "border-destructive text-destructive"
              )}
            >
              {energyInRange ? "In Range" : "Out of Range"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: Sample & Edge selection */}
            <div className="space-y-4">
              {/* Element selector */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sample Element</Label>
                <Select value={selectedElement} onValueChange={(v) => {
                  setSelectedElement(v)
                  setCustomEnergy("")
                  const el = ELEMENTS.find(e => e.symbol === v)
                  if (el && !el.edges.find(e => e.name === selectedEdge)) {
                    setSelectedEdge(el.edges[0].name)
                  }
                }}>
                  <SelectTrigger className="h-9 font-mono text-xs bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEMENTS.map(el => (
                      <SelectItem key={el.symbol} value={el.symbol}>
                        <span className="font-mono">{el.symbol}</span>
                        <span className="ml-2 text-muted-foreground">
                          {el.name} (Z={el.Z})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Edge selector */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Absorption Edge</Label>
                <div className="flex flex-wrap gap-1.5">
                  {element.edges.map(e => {
                    const reachable = e.energy >= beamline.energyRange[0] * 1000 && e.energy <= beamline.energyRange[1] * 1000
                    return (
                      <Button
                        key={e.name}
                        size="sm"
                        variant={selectedEdge === e.name && !customEnergy ? "default" : "outline"}
                        className={cn(
                          "h-7 px-2.5 text-xs font-mono",
                          !reachable && "opacity-40"
                        )}
                        onClick={() => {
                          setSelectedEdge(e.name)
                          setCustomEnergy("")
                        }}
                      >
                        {e.name}
                        <span className="ml-1 text-[10px] opacity-70">{e.energy.toFixed(0)}</span>
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Custom energy override */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Custom Energy (eV, overrides edge)</Label>
                <Input
                  className="h-8 font-mono text-xs bg-secondary border-border"
                  placeholder="e.g. 8979"
                  value={customEnergy}
                  onChange={(e) => setCustomEnergy(e.target.value)}
                />
              </div>

              {/* Crystal selection */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Crystal Cut</Label>
                <Select value={selectedCrystal} onValueChange={setSelectedCrystal}>
                  <SelectTrigger className="h-8 font-mono text-xs bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYSTAL_OPTIONS.map(c => (
                      <SelectItem key={c.label} value={c.label}>
                        {c.label} -- d = {c.dSpacing.toFixed(4)} A
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Theta offset + beam offset */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Theta Offset (deg)</Label>
                  <Input
                    className="h-8 font-mono text-xs bg-secondary border-border"
                    value={thetaOffset}
                    onChange={(e) => setThetaOffset(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Beam Offset (mm)</Label>
                  <Input
                    className="h-8 font-mono text-xs bg-secondary border-border"
                    value={beamOffset}
                    onChange={(e) => setBeamOffset(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Right column: Computed results */}
            <div className="space-y-4">
              {/* Quick info header */}
              <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Calculator className="size-4 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Calculated Parameters
                  </span>
                </div>
                <div className="text-sm font-medium text-foreground">
                  {selectedElement} {customEnergy ? `@ ${customEnergy} eV` : `${selectedEdge}-edge`}
                  {" "}/ {selectedCrystal}
                </div>
              </div>

              {/* Result grid */}
              <div className="grid grid-cols-2 gap-3">
                <ParamDisplay
                  label="Edge Energy"
                  value={activeEnergy > 0 ? activeEnergy.toFixed(1) : "--"}
                  unit="eV"
                  variant="primary"
                />
                <ParamDisplay
                  label="Wavelength"
                  value={activeEnergy > 0 ? (12398.42 / activeEnergy).toFixed(5) : "--"}
                  unit="A"
                />
                <ParamDisplay
                  label="Bragg Angle"
                  value={braggAngle !== null ? braggAngle.toFixed(4) : "N/A"}
                  unit="deg"
                  variant="accent"
                />
                <ParamDisplay
                  label="Effective Angle"
                  value={effectiveAngle !== null ? effectiveAngle.toFixed(4) : "N/A"}
                  unit="deg"
                />
                <ParamDisplay
                  label={"Crystal Gap (d\u2080)"}
                  value={crystalGap !== null ? crystalGap.toFixed(3) : "N/A"}
                  unit="mm"
                  variant="primary"
                />
                <ParamDisplay
                  label="d-spacing"
                  value={crystal.dSpacing.toFixed(4)}
                  unit="A"
                />
              </div>

              {/* All-edges quick reference table for the selected element */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  All edges for {selectedElement} ({element.name})
                </span>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary/30 text-muted-foreground">
                        <th className="px-2 py-1.5 text-left font-medium">Edge</th>
                        <th className="px-2 py-1.5 text-right font-medium">Energy (eV)</th>
                        <th className="px-2 py-1.5 text-right font-medium">Bragg ({selectedCrystal})</th>
                        <th className="px-2 py-1.5 text-right font-medium">d{"\u2080"} (mm)</th>
                        <th className="px-2 py-1.5 text-center font-medium">BL?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {element.edges.map(e => {
                        const ba = calcBraggAngle(e.energy, crystal.dSpacing)
                        const eff = ba !== null ? ba + parseFloat(thetaOffset || "0") : null
                        const gap = eff !== null ? calcCrystalGap(eff, parseFloat(beamOffset || "20")) : null
                        const inRange = e.energy >= beamline.energyRange[0] * 1000 && e.energy <= beamline.energyRange[1] * 1000
                        return (
                          <tr
                            key={e.name}
                            className={cn(
                              "border-t border-border/50 font-mono tabular-nums",
                              selectedEdge === e.name && !customEnergy && "bg-primary/10"
                            )}
                          >
                            <td className="px-2 py-1.5 font-semibold text-foreground">{e.name}</td>
                            <td className="px-2 py-1.5 text-right text-foreground">{e.energy.toFixed(1)}</td>
                            <td className="px-2 py-1.5 text-right text-accent">{ba !== null ? ba.toFixed(4) + "\u00B0" : "N/A"}</td>
                            <td className="px-2 py-1.5 text-right text-foreground">{gap !== null ? gap.toFixed(3) : "N/A"}</td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={cn(
                                "inline-block size-2 rounded-full",
                                inRange ? "bg-primary" : "bg-muted-foreground/30"
                              )} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Move to edge button */}
              <Button
                className="w-full gap-2"
                disabled={!energyInRange || braggAngle === null}
              >
                <ArrowRight className="size-3.5" />
                Move Mono to {activeEnergy > 0 ? activeEnergy.toFixed(1) : "--"} eV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slit Controls */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Slit Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {beamline.slits.map((slit) => (
            <div key={slit.name} className="space-y-2 border-b border-border/50 pb-3 last:border-0 last:pb-0">
              <span className="text-xs font-medium text-foreground">{slit.name}</span>

              {/* Visual slit representation */}
              <div className="relative h-16 rounded border border-border/50 bg-secondary/20 overflow-hidden">
                <svg viewBox="0 0 100 50" className="size-full">
                  {/* H gap */}
                  {(() => {
                    const hHalfGap = Math.min(slit.hGap * 4, 40)
                    const vHalfGap = Math.min(slit.vGap * 8, 20)
                    return (
                      <>
                        <rect x="0" y="0" width={50 - hHalfGap} height="50" fill="oklch(0.20 0.008 260)" />
                        <rect x={50 + hHalfGap} y="0" width={50 - hHalfGap} height="50" fill="oklch(0.20 0.008 260)" />
                        <rect x={50 - hHalfGap} y="0" width={hHalfGap * 2} height={25 - vHalfGap} fill="oklch(0.20 0.008 260)" />
                        <rect x={50 - hHalfGap} y={25 + vHalfGap} width={hHalfGap * 2} height={25 - vHalfGap} fill="oklch(0.20 0.008 260)" />
                        <rect x={50 - hHalfGap} y={25 - vHalfGap} width={hHalfGap * 2} height={vHalfGap * 2} fill="oklch(0.65 0.19 145)" opacity="0.15" rx="1" />
                      </>
                    )
                  })()}
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">H Gap</span>
                  <p className="font-mono text-xs tabular-nums text-foreground">{slit.hGap.toFixed(2)} mm</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">V Gap</span>
                  <p className="font-mono text-xs tabular-nums text-foreground">{slit.vGap.toFixed(2)} mm</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Attenuator / Filter */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Attenuators & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Filter Wheel Position</Label>
            <Select value={attenuator} onValueChange={setAttenuator}>
              <SelectTrigger className="h-8 font-mono text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Open)</SelectItem>
                <SelectItem value="al_50">Al 50 um</SelectItem>
                <SelectItem value="al_100">Al 100 um</SelectItem>
                <SelectItem value="al_200">Al 200 um</SelectItem>
                <SelectItem value="al_500">Al 500 um</SelectItem>
                <SelectItem value="cu_25">Cu 25 um</SelectItem>
                <SelectItem value="cu_50">Cu 50 um</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ParamDisplay label="Transmission" value={attenuator === "none" ? "100" : attenuator.includes("50") ? "87" : "52"} unit="%" variant="primary" />
            <ParamDisplay label="Harmonic" value="< 0.1" unit="%" />
          </div>

          {/* Mirror angle controls */}
          {beamline.mirrors.map((mirror, idx) => (
            <div key={mirror.name} className="space-y-1.5 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{mirror.name}</span>
                <span className="text-[10px] text-muted-foreground">{mirror.coating}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Angle</span>
                  <span className="font-mono text-xs tabular-nums text-primary">{mirror.angle.toFixed(2)} mrad</span>
                </div>
                <Slider
                  defaultValue={[mirror.angle]}
                  max={10}
                  min={0}
                  step={0.01}
                  className="py-1"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground">Curvature</span>
                <p className="font-mono text-xs tabular-nums text-foreground">{mirror.curvature} m</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
