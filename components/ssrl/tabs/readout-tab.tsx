"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ParamDisplay } from "@/components/param-display"
import type { BeamlineConfig } from "@/lib/beamline-config"
import { cn } from "@/lib/utils"
import { RotateCcw, Zap } from "lucide-react"

function formatExponential(value: number): string {
  if (value === 0) return "0"
  const exp = Math.floor(Math.log10(Math.abs(value)))
  const mantissa = value / Math.pow(10, exp)
  return `${mantissa.toFixed(2)}e${exp}`
}

export function ReadoutTab({ beamline }: { beamline: BeamlineConfig }) {
  const [integrationTime, setIntegrationTime] = useState("1.0")
  const [autoRange, setAutoRange] = useState(true)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Ion Chambers */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ion Chamber Readings
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              {beamline.ionChambers.length} channels
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {beamline.ionChambers.map((ic) => (
              <div
                key={ic.name}
                className="rounded-lg border border-border bg-secondary/20 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-mono text-sm font-semibold text-foreground">{ic.name}</span>
                    <p className="text-[10px] text-muted-foreground">{ic.label}</p>
                  </div>
                  <div className="flex size-8 items-center justify-center rounded bg-primary/10">
                    <Zap className="size-4 text-primary" />
                  </div>
                </div>
                <div className="mb-3">
                  <span className="font-mono text-2xl font-bold tabular-nums text-primary">
                    {formatExponential(ic.currentReading)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">{ic.unit}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Gain</span>
                    <p className="font-mono text-xs text-foreground">{ic.gain}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">HV Bias</span>
                    <p className="font-mono text-xs text-foreground">{ic.voltage} V</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Amplifier Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Amplifier Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Integration Time (s)</Label>
            <Input
              className="h-8 font-mono text-xs bg-secondary border-border"
              value={integrationTime}
              onChange={(e) => setIntegrationTime(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Auto Range</Label>
            <Switch checked={autoRange} onCheckedChange={setAutoRange} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Filter Time Constant</Label>
            <Select defaultValue="0.3">
              <SelectTrigger className="h-8 font-mono text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.01">10 ms</SelectItem>
                <SelectItem value="0.03">30 ms</SelectItem>
                <SelectItem value="0.1">100 ms</SelectItem>
                <SelectItem value="0.3">300 ms</SelectItem>
                <SelectItem value="1.0">1 s</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Gain Preset</Label>
            <Select defaultValue="auto">
              <SelectTrigger className="h-8 font-mono text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="1e5">1e5 V/A</SelectItem>
                <SelectItem value="1e6">1e6 V/A</SelectItem>
                <SelectItem value="1e7">1e7 V/A</SelectItem>
                <SelectItem value="1e8">1e8 V/A</SelectItem>
                <SelectItem value="1e9">1e9 V/A</SelectItem>
                <SelectItem value="1e10">1e10 V/A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="w-full h-8 text-xs gap-1.5">
            <RotateCcw className="size-3.5" />
            Reset All Amplifiers
          </Button>
        </CardContent>
      </Card>

      {/* Scaler / Counter Channels */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Scaler / Counter Channels
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
              <RotateCcw className="size-3" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">CH</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Counts</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Count Rate</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {beamline.scalerChannels.map((ch) => (
                  <tr key={ch.channel} className="border-b border-border/50">
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-muted-foreground">{ch.channel}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs font-semibold text-foreground">{ch.name}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-mono text-xs tabular-nums text-foreground">
                        {ch.counts.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-mono text-xs tabular-nums text-primary">
                        {formatExponential(ch.countRate)}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">cts/s</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className={cn(
                        "inline-flex size-2 rounded-full",
                        ch.enabled ? "bg-primary" : "bg-muted-foreground/30"
                      )} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Fluorescence Detector */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Fluorescence Detector
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {beamline.ionChambers.some((ic) => ic.name === "IF") ? (
            <>
              <ParamDisplay
                label="Total Fluorescence"
                value={formatExponential(beamline.ionChambers.find((ic) => ic.name === "IF")?.currentReading || 0)}
                unit="cts/s"
                variant="primary"
              />
              <div className="space-y-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Element ROIs</span>
                {[
                  { name: "Fe Ka", energy: "6.40 keV", counts: "3.21e5" },
                  { name: "Cu Ka", energy: "8.04 keV", counts: "1.87e4" },
                  { name: "Zn Ka", energy: "8.63 keV", counts: "9.45e3" },
                ].map((roi) => (
                  <div key={roi.name} className="flex items-center justify-between rounded bg-secondary/30 px-2.5 py-1.5">
                    <div>
                      <span className="text-xs font-medium text-foreground">{roi.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">{roi.energy}</span>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-primary">{roi.counts}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Dead Time Correction</Label>
                <Switch defaultChecked />
              </div>
              <ParamDisplay label="Dead Time" value="8.2" unit="%" />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <p className="text-xs">No fluorescence detector configured</p>
              <p className="text-[10px] mt-1">This beamline uses transmission mode</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
