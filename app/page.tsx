"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SSRLSidebar } from "@/components/ssrl/ssrl-sidebar"
import { SSRLHeader } from "@/components/ssrl/ssrl-header"
import { DAQTab } from "@/components/ssrl/tabs/daq-tab"
import { MotorControlTab } from "@/components/ssrl/tabs/motor-control-tab"
import { ReadoutTab } from "@/components/ssrl/tabs/readout-tab"
import { DataDisplayTab } from "@/components/ssrl/tabs/data-display-tab"
import { FrontendGUITab } from "@/components/ssrl/tabs/frontend-gui-tab"
import { ScanDemoTab } from "@/components/ssrl/tabs/scan-demo-tab"
import { BEAMLINES, getBeamlineById } from "@/lib/beamline-config"
import { Database, Gauge, Monitor, BarChart3, Layout, FlaskConical } from "lucide-react"

const tabTriggerClass =
  "gap-1.5 rounded-none border-b-2 border-transparent px-4 text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary"

export default function SSRLControlSystem() {
  const [selectedBeamlineId, setSelectedBeamlineId] = useState(BEAMLINES[0].id)
  const beamline = getBeamlineById(selectedBeamlineId) || BEAMLINES[0]

  return (
    <SidebarProvider defaultOpen={true}>
      <SSRLSidebar
        selectedBeamline={selectedBeamlineId}
        onSelectBeamline={setSelectedBeamlineId}
      />
      <SidebarInset>
        <SSRLHeader beamline={beamline} />
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="daq" className="flex h-[calc(100vh-3.5rem)] flex-col">
            <div className="border-b border-border bg-card/50 px-4 sm:px-6 shrink-0 overflow-x-auto">
              <TabsList className="h-11 w-max min-w-full justify-start bg-transparent p-0">
                <TabsTrigger value="daq" className={tabTriggerClass}>
                  <Database className="size-3.5" />
                  <span className="hidden sm:inline">Data Acquisition</span>
                  <span className="sm:hidden">DAQ</span>
                </TabsTrigger>
                <TabsTrigger value="motors" className={tabTriggerClass}>
                  <Gauge className="size-3.5" />
                  <span className="hidden sm:inline">Motor Control</span>
                  <span className="sm:hidden">Motors</span>
                </TabsTrigger>
                <TabsTrigger value="readout" className={tabTriggerClass}>
                  <Monitor className="size-3.5" />
                  <span className="hidden sm:inline">Readout System</span>
                  <span className="sm:hidden">Readout</span>
                </TabsTrigger>
                <TabsTrigger value="display" className={tabTriggerClass}>
                  <BarChart3 className="size-3.5" />
                  <span className="hidden sm:inline">Data Display</span>
                  <span className="sm:hidden">Display</span>
                </TabsTrigger>
                <TabsTrigger value="frontend" className={tabTriggerClass}>
                  <Layout className="size-3.5" />
                  <span className="hidden sm:inline">Front-end GUI</span>
                  <span className="sm:hidden">FE GUI</span>
                </TabsTrigger>
                <TabsTrigger value="scans" className={tabTriggerClass}>
                  <FlaskConical className="size-3.5" />
                  <span className="hidden sm:inline">Scan Demo</span>
                  <span className="sm:hidden">Scans</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="p-4 sm:p-6">
                <TabsContent value="daq" className="mt-0">
                  <DAQTab beamline={beamline} />
                </TabsContent>
                <TabsContent value="motors" className="mt-0">
                  <MotorControlTab beamline={beamline} />
                </TabsContent>
                <TabsContent value="readout" className="mt-0">
                  <ReadoutTab beamline={beamline} />
                </TabsContent>
                <TabsContent value="display" className="mt-0">
                  <DataDisplayTab beamline={beamline} />
                </TabsContent>
                <TabsContent value="frontend" className="mt-0">
                  <FrontendGUITab beamline={beamline} />
                </TabsContent>
                <TabsContent value="scans" className="mt-0">
                  <ScanDemoTab beamline={beamline} />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
