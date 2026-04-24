export type BeamlineStatus = "operational" | "standby" | "maintenance" | "fault"

export interface Motor {
  name: string
  description: string
  position: number
  unit: string
  lowerLimit: number
  upperLimit: number
  velocity: number
  status: "idle" | "moving" | "error" | "homed"
  encoderReadback: number
  /** If present, this is a combined/virtual motor built from these real motors */
  combinedOf?: string[]
}

export interface IonChamber {
  name: string
  label: string
  currentReading: number
  unit: string
  gain: string
  voltage: number
}

export interface ScalerChannel {
  channel: number
  name: string
  counts: number
  countRate: number
  enabled: boolean
}

export interface VacuumSection {
  name: string
  pressure: number
  unit: string
  status: "ok" | "warning" | "fault"
}

export interface BeamlineConfig {
  id: string
  name: string
  fullName: string
  source: string
  techniques: string[]
  energyRange: [number, number]
  energyUnit: string
  status: BeamlineStatus
  ringCurrent: number
  motors: Motor[]
  ionChambers: IonChamber[]
  scalerChannels: ScalerChannel[]
  vacuumSections: VacuumSection[]
  monochromator: {
    type: string
    crystal: string
    dSpacing: number
    braggAngle: number
  }
  slits: {
    name: string
    hGap: number
    vGap: number
    hCenter: number
    vCenter: number
  }[]
  mirrors: {
    name: string
    angle: number
    coating: string
    curvature: number
  }[]
}

function generateMotors(beamlineId: string): Motor[] {
  const baseMotors: Motor[] = [
    { name: "th", description: "Theta (sample)", position: 12.345, unit: "deg", lowerLimit: -180, upperLimit: 180, velocity: 2.0, status: "idle", encoderReadback: 12.344 },
    { name: "tth", description: "Two-Theta (detector)", position: 24.690, unit: "deg", lowerLimit: -10, upperLimit: 160, velocity: 2.0, status: "idle", encoderReadback: 24.689 },
    { name: "chi", description: "Chi", position: 0.000, unit: "deg", lowerLimit: -5, upperLimit: 5, velocity: 1.0, status: "idle", encoderReadback: 0.001 },
    { name: "phi", description: "Phi", position: 0.000, unit: "deg", lowerLimit: -360, upperLimit: 360, velocity: 5.0, status: "idle", encoderReadback: 0.000 },
    { name: "sy", description: "Sample Y (height)", position: 0.500, unit: "mm", lowerLimit: -25, upperLimit: 25, velocity: 0.5, status: "idle", encoderReadback: 0.501 },
    { name: "sx", description: "Sample X (lateral)", position: 0.000, unit: "mm", lowerLimit: -25, upperLimit: 25, velocity: 0.5, status: "idle", encoderReadback: 0.000 },
    { name: "mono_e", description: "Monochromator Energy", position: beamlineId === "BL4-2" ? 9500 : 12000, unit: "eV", lowerLimit: 2000, upperLimit: 45000, velocity: 100, status: "idle", encoderReadback: beamlineId === "BL4-2" ? 9500.2 : 12000.1 },
    { name: "mono_th", description: "Mono Bragg Angle", position: 15.832, unit: "deg", lowerLimit: 3, upperLimit: 75, velocity: 0.5, status: "idle", encoderReadback: 15.831 },
  ]

  if (beamlineId === "BL10-2" || beamlineId === "BL11-2" || beamlineId === "BL4-2") {
    baseMotors.push(
      { name: "harm_rej", description: "Harmonic Rejection Mirror", position: 3.500, unit: "mrad", lowerLimit: 0, upperLimit: 10, velocity: 0.1, status: "idle", encoderReadback: 3.501 },
      { name: "det_z", description: "Detector Z (distance)", position: 150.0, unit: "mm", lowerLimit: 50, upperLimit: 1000, velocity: 2.0, status: "idle", encoderReadback: 150.1 },
    )
  }

  if (beamlineId === "BL7-2" || beamlineId === "BL9-1") {
    baseMotors.push(
      { name: "omega", description: "Omega (crystal rotation)", position: 0.0, unit: "deg", lowerLimit: -180, upperLimit: 360, velocity: 1.0, status: "idle", encoderReadback: 0.001 },
      { name: "kappa", description: "Kappa", position: 0.0, unit: "deg", lowerLimit: -180, upperLimit: 180, velocity: 1.0, status: "idle", encoderReadback: 0.000 },
      { name: "det_dist", description: "Detector Distance", position: 250.0, unit: "mm", lowerLimit: 100, upperLimit: 500, velocity: 1.0, status: "idle", encoderReadback: 250.2 },
    )
  }

  return baseMotors
}

export const BEAMLINES: BeamlineConfig[] = [
  {
    id: "BL2-1",
    name: "BL 2-1",
    fullName: "Powder Diffraction / SAXS-WAXS",
    source: "Side Station",
    techniques: ["SAXS", "WAXS", "Powder XRD"],
    energyRange: [8, 13],
    energyUnit: "keV",
    status: "operational",
    ringCurrent: 499.7,
    motors: generateMotors("BL2-1"),
    ionChambers: [
      { name: "I0", label: "Incident (I0)", currentReading: 2.45e8, unit: "counts/s", gain: "1e8", voltage: 350 },
      { name: "I1", label: "Transmitted (I1)", currentReading: 1.82e8, unit: "counts/s", gain: "1e8", voltage: 350 },
    ],
    scalerChannels: [
      { channel: 0, name: "I0", counts: 245023891, countRate: 2.45e8, enabled: true },
      { channel: 1, name: "I1", counts: 182345212, countRate: 1.82e8, enabled: true },
      { channel: 2, name: "Detector", counts: 98234112, countRate: 9.82e7, enabled: true },
      { channel: 3, name: "Timer", counts: 1000000, countRate: 1e6, enabled: true },
    ],
    vacuumSections: [
      { name: "Front-End", pressure: 2.3e-9, unit: "Torr", status: "ok" },
      { name: "Mono Vessel", pressure: 5.1e-8, unit: "Torr", status: "ok" },
      { name: "Sample Chamber", pressure: 1.2e-6, unit: "Torr", status: "ok" },
    ],
    monochromator: { type: "DCM", crystal: "Si(111)", dSpacing: 3.1356, braggAngle: 15.83 },
    slits: [
      { name: "Slit 1 (White Beam)", hGap: 2.0, vGap: 1.0, hCenter: 0.0, vCenter: 0.0 },
      { name: "Slit 2 (Guard)", hGap: 0.5, vGap: 0.3, hCenter: 0.0, vCenter: 0.0 },
    ],
    mirrors: [
      { name: "Collimating Mirror", angle: 3.5, coating: "Rh", curvature: 8500 },
    ],
  },
  {
    id: "BL2-2",
    name: "BL 2-2",
    fullName: "XAS / Soft X-ray Spectroscopy",
    source: "Side Station",
    techniques: ["XAS", "XANES", "NEXAFS", "Soft XAS"],
    energyRange: [2, 12],
    energyUnit: "keV",
    status: "operational",
    ringCurrent: 499.7,
    motors: [
      // ── 8 real (physical) motors ──
      { name: "Crystal",  description: "Crystal Bragg angle",        position: 17.520,  unit: "deg",  lowerLimit: 3,     upperLimit: 75,    velocity: 0.5,  status: "idle",  encoderReadback: 17.519 },
      { name: "TempName", description: "Temperature controller",     position: 25.000,  unit: "degC", lowerLimit: -196,  upperLimit: 1000,  velocity: 5.0,  status: "idle",  encoderReadback: 25.002 },
      { name: "TableV1",  description: "Table vertical jack #1",     position: 0.000,   unit: "mm",   lowerLimit: -25,   upperLimit: 25,    velocity: 0.5,  status: "idle",  encoderReadback: 0.001  },
      { name: "TableV2",  description: "Table vertical jack #2",     position: 0.000,   unit: "mm",   lowerLimit: -25,   upperLimit: 25,    velocity: 0.5,  status: "idle",  encoderReadback: -0.001 },
      { name: "S1SPEAR",  description: "Slit 1 SPEAR side",          position: 5.000,   unit: "mm",   lowerLimit: -10,   upperLimit: 10,    velocity: 0.2,  status: "idle",  encoderReadback: 5.001  },
      { name: "S1SSRL",   description: "Slit 1 SSRL side",           position: 5.000,   unit: "mm",   lowerLimit: -10,   upperLimit: 10,    velocity: 0.2,  status: "idle",  encoderReadback: 4.999  },
      { name: "S1TOP",    description: "Slit 1 top blade",           position: 2.500,   unit: "mm",   lowerLimit: -10,   upperLimit: 10,    velocity: 0.2,  status: "idle",  encoderReadback: 2.501  },
      { name: "S1BOTTOM", description: "Slit 1 bottom blade",        position: 2.500,   unit: "mm",   lowerLimit: -10,   upperLimit: 10,    velocity: 0.2,  status: "idle",  encoderReadback: 2.499  },
      // ── 3 combined (virtual) motors ──
      { name: "TableVert", description: "Table vertical (V1 + V2)",  position: 0.000,   unit: "mm",   lowerLimit: -25,   upperLimit: 25,    velocity: 0.5,  status: "idle",  encoderReadback: 0.000, combinedOf: ["TableV1", "TableV2"] },
      { name: "mono",      description: "Mono (Crystal + TableVert)",position: 17.520,  unit: "deg",  lowerLimit: 3,     upperLimit: 75,    velocity: 0.5,  status: "idle",  encoderReadback: 17.519, combinedOf: ["Crystal", "TableVert"] },
      { name: "SLITS",     description: "Slit 1 assembly",           position: 0.000,   unit: "mm",   lowerLimit: -10,   upperLimit: 10,    velocity: 0.2,  status: "idle",  encoderReadback: 0.000, combinedOf: ["S1SPEAR", "S1SSRL", "S1TOP", "S1BOTTOM"] },
    ],
    ionChambers: [
      { name: "I0", label: "Incident (I0)", currentReading: 1.87e8, unit: "counts/s", gain: "1e8", voltage: 300 },
      { name: "I1", label: "Transmitted (I1)", currentReading: 1.12e8, unit: "counts/s", gain: "1e8", voltage: 300 },
      { name: "I2", label: "Reference (I2)", currentReading: 9.45e7, unit: "counts/s", gain: "1e8", voltage: 300 },
      { name: "IF", label: "Fluorescence (IF)", currentReading: 3.21e6, unit: "counts/s", gain: "1e6", voltage: 0 },
    ],
    scalerChannels: [
      { channel: 0, name: "I0", counts: 187234567, countRate: 1.87e8, enabled: true },
      { channel: 1, name: "I1", counts: 112456789, countRate: 1.12e8, enabled: true },
      { channel: 2, name: "I2", counts: 94523456, countRate: 9.45e7, enabled: true },
      { channel: 3, name: "IF_total", counts: 32156789, countRate: 3.21e6, enabled: true },
      { channel: 4, name: "Timer", counts: 1000000, countRate: 1e6, enabled: true },
    ],
    vacuumSections: [
      { name: "Front-End", pressure: 2.8e-9, unit: "Torr", status: "ok" },
      { name: "Mono Vessel", pressure: 4.3e-8, unit: "Torr", status: "ok" },
      { name: "Mirror Box", pressure: 6.1e-8, unit: "Torr", status: "ok" },
      { name: "Hutch", pressure: 760, unit: "Torr", status: "ok" },
    ],
    monochromator: { type: "DCM", crystal: "Si(111)", dSpacing: 3.1356, braggAngle: 17.52 },
    slits: [
      { name: "Slit 0 (White Beam)", hGap: 8.0, vGap: 2.0, hCenter: 0.0, vCenter: 0.0 },
      { name: "Slit 1 (Post-Mono)", hGap: 2.0, vGap: 1.0, hCenter: 0.0, vCenter: 0.0 },
      { name: "Slit 2 (Guard)", hGap: 0.6, vGap: 0.4, hCenter: 0.0, vCenter: 0.0 },
    ],
    mirrors: [
      { name: "Collimating Mirror (M0)", angle: 3.2, coating: "Rh", curvature: 10000 },
      { name: "Focusing Mirror (M1)", angle: 3.2, coating: "Rh", curvature: 5500 },
    ],
  },
  {
    id: "BL4-2",
    name: "BL 4-2",
    fullName: "EXAFS / XANES Spectroscopy",
    source: "Wiggler",
    techniques: ["EXAFS", "XANES", "XAS"],
    energyRange: [2.4, 45],
    energyUnit: "keV",
    status: "operational",
    ringCurrent: 499.7,
    motors: generateMotors("BL4-2"),
    ionChambers: [
      { name: "I0", label: "Incident (I0)", currentReading: 5.67e9, unit: "counts/s", gain: "1e9", voltage: 500 },
      { name: "I1", label: "Transmitted (I1)", currentReading: 3.21e9, unit: "counts/s", gain: "1e9", voltage: 500 },
      { name: "I2", label: "Reference (I2)", currentReading: 2.89e9, unit: "counts/s", gain: "1e9", voltage: 500 },
      { name: "IF", label: "Fluorescence (IF)", currentReading: 1.23e7, unit: "counts/s", gain: "1e7", voltage: 0 },
    ],
    scalerChannels: [
      { channel: 0, name: "I0", counts: 567234891, countRate: 5.67e9, enabled: true },
      { channel: 1, name: "I1", counts: 321456712, countRate: 3.21e9, enabled: true },
      { channel: 2, name: "I2", counts: 289123456, countRate: 2.89e9, enabled: true },
      { channel: 3, name: "IF", counts: 12345678, countRate: 1.23e7, enabled: true },
      { channel: 4, name: "Timer", counts: 1000000, countRate: 1e6, enabled: true },
      { channel: 5, name: "Encoder", counts: 23456, countRate: 0, enabled: true },
    ],
    vacuumSections: [
      { name: "Front-End", pressure: 1.8e-9, unit: "Torr", status: "ok" },
      { name: "Mono Vessel", pressure: 3.2e-8, unit: "Torr", status: "ok" },
      { name: "Mirror Box", pressure: 8.5e-8, unit: "Torr", status: "ok" },
      { name: "Hutch", pressure: 760, unit: "Torr", status: "ok" },
    ],
    monochromator: { type: "DCM", crystal: "Si(220)", dSpacing: 1.9201, braggAngle: 22.41 },
    slits: [
      { name: "Slit 0 (White Beam)", hGap: 10.0, vGap: 2.0, hCenter: 0.0, vCenter: 0.0 },
      { name: "Slit 1 (Mono)", hGap: 2.0, vGap: 1.0, hCenter: 0.0, vCenter: 0.0 },
      { name: "Slit 2 (Guard)", hGap: 0.8, vGap: 0.5, hCenter: 0.0, vCenter: 0.0 },
    ],
    mirrors: [
      { name: "Collimating Mirror (M0)", angle: 2.8, coating: "Rh", curvature: 12000 },
      { name: "Focusing Mirror (M1)", angle: 2.8, coating: "Rh", curvature: 6500 },
    ],
  },
  {
    id: "BL7-2",
    name: "BL 7-2",
    fullName: "Macromolecular Crystallography",
    source: "Bend Magnet",
    techniques: ["MX", "SAD", "MAD"],
    energyRange: [7, 17],
    energyUnit: "keV",
    status: "standby",
    ringCurrent: 499.7,
    motors: generateMotors("BL7-2"),
    ionChambers: [
      { name: "I0", label: "Incident (I0)", currentReading: 1.12e8, unit: "counts/s", gain: "1e8", voltage: 300 },
      { name: "diode", label: "Beam Monitor (Diode)", currentReading: 4.56e6, unit: "counts/s", gain: "1e6", voltage: 100 },
    ],
    scalerChannels: [
      { channel: 0, name: "I0", counts: 112345678, countRate: 1.12e8, enabled: true },
      { channel: 1, name: "Diode", counts: 4567890, countRate: 4.56e6, enabled: true },
      { channel: 2, name: "Timer", counts: 1000000, countRate: 1e6, enabled: true },
    ],
    vacuumSections: [
      { name: "Front-End", pressure: 3.1e-9, unit: "Torr", status: "ok" },
      { name: "Mono Vessel", pressure: 6.7e-8, unit: "Torr", status: "ok" },
      { name: "Hutch Beampath", pressure: 1.0e-3, unit: "Torr", status: "warning" },
    ],
    monochromator: { type: "DCM", crystal: "Si(111)", dSpacing: 3.1356, braggAngle: 12.67 },
    slits: [
      { name: "Slit 1", hGap: 1.5, vGap: 1.0, hCenter: 0.0, vCenter: 0.0 },
      { name: "Guard Slit", hGap: 0.3, vGap: 0.2, hCenter: 0.0, vCenter: 0.0 },
    ],
    mirrors: [
      { name: "Focusing Mirror", angle: 4.0, coating: "Pt", curvature: 5000 },
    ],
  },
  {
    id: "BL9-1",
    name: "BL 9-1",
    fullName: "Protein Crystallography",
    source: "Wiggler",
    techniques: ["PX", "SAD", "MAD", "S-SAD"],
    energyRange: [6, 17],
    energyUnit: "keV",
    status: "operational",
    ringCurrent: 499.7,
    motors: generateMotors("BL9-1"),
    ionChambers: [
      { name: "I0", label: "Incident (I0)", currentReading: 8.91e8, unit: "counts/s", gain: "1e9", voltage: 400 },
      { name: "pin", label: "PIN Diode", currentReading: 2.34e6, unit: "counts/s", gain: "1e6", voltage: 200 },
    ],
    scalerChannels: [
      { channel: 0, name: "I0", counts: 891234567, countRate: 8.91e8, enabled: true },
      { channel: 1, name: "PIN", counts: 2345678, countRate: 2.34e6, enabled: true },
      { channel: 2, name: "Timer", counts: 1000000, countRate: 1e6, enabled: true },
    ],
    vacuumSections: [
      { name: "Front-End", pressure: 2.0e-9, unit: "Torr", status: "ok" },
      { name: "Mono Vessel", pressure: 4.5e-8, unit: "Torr", status: "ok" },
    ],
    monochromator: { type: "DCM", crystal: "Si(111)", dSpacing: 3.1356, braggAngle: 14.22 },
    slits: [
      { name: "Slit 1", hGap: 1.0, vGap: 0.8, hCenter: 0.0, vCenter: 0.0 },
      { name: "Slit 2 (Cleanup)", hGap: 0.4, vGap: 0.3, hCenter: 0.0, vCenter: 0.0 },
    ],
    mirrors: [
      { name: "Toroidal Mirror", angle: 3.2, coating: "Pt", curvature: 7000 },
    ],
  },
  {
    id: "BL10-2",
    name: "BL 10-2",
    fullName: "XAS / EXAFS Spectroscopy",
    source: "Wiggler",
    techniques: ["XAS", "EXAFS", "XANES", "QEXAFS"],
    energyRange: [4.5, 45],
    energyUnit: "keV",
    status: "operational",
    ringCurrent: 499.7,
    motors: generateMotors("BL10-2"),
    ionChambers: [
      { name: "I0", label: "Incident (I0)", currentReading: 6.78e9, unit: "counts/s", gain: "1e10", voltage: 600 },
      { name: "I1", label: "Transmitted (I1)", currentReading: 4.12e9, unit: "counts/s", gain: "1e10", voltage: 600 },
      { name: "I2", label: "Reference (I2)", currentReading: 3.56e9, unit: "counts/s", gain: "1e10", voltage: 600 },
      { name: "IF", label: "Fluorescence (IF)", currentReading: 8.90e6, unit: "counts/s", gain: "1e7", voltage: 0 },
    ],
    scalerChannels: [
      { channel: 0, name: "I0", counts: 678123456, countRate: 6.78e9, enabled: true },
      { channel: 1, name: "I1", counts: 412345678, countRate: 4.12e9, enabled: true },
      { channel: 2, name: "I2", counts: 356789012, countRate: 3.56e9, enabled: true },
      { channel: 3, name: "IF_total", counts: 89012345, countRate: 8.90e6, enabled: true },
      { channel: 4, name: "Timer", counts: 1000000, countRate: 1e6, enabled: true },
      { channel: 5, name: "Encoder", counts: 34567, countRate: 0, enabled: true },
      { channel: 6, name: "IF_ch1", counts: 14235678, countRate: 1.42e6, enabled: true },
      { channel: 7, name: "IF_ch2", counts: 15678901, countRate: 1.57e6, enabled: true },
    ],
    vacuumSections: [
      { name: "Front-End", pressure: 1.5e-9, unit: "Torr", status: "ok" },
      { name: "Mono Vessel", pressure: 2.8e-8, unit: "Torr", status: "ok" },
      { name: "Mirror Box 1", pressure: 5.6e-8, unit: "Torr", status: "ok" },
      { name: "Mirror Box 2", pressure: 7.2e-8, unit: "Torr", status: "ok" },
      { name: "Hutch", pressure: 760, unit: "Torr", status: "ok" },
    ],
    monochromator: { type: "DCM", crystal: "Si(220)", dSpacing: 1.9201, braggAngle: 18.76 },
    slits: [
      { name: "Slit 0 (White Beam)", hGap: 12.0, vGap: 3.0, hCenter: 0.0, vCenter: 0.0 },
      { name: "Slit 1 (Post-Mono)", hGap: 3.0, vGap: 1.5, hCenter: 0.0, vCenter: 0.0 },
      { name: "Slit 2 (Hutch)", hGap: 1.0, vGap: 0.5, hCenter: 0.0, vCenter: 0.0 },
    ],
    mirrors: [
      { name: "Collimating Mirror (M0)", angle: 2.5, coating: "Rh", curvature: 15000 },
      { name: "Focusing Mirror (M1)", angle: 2.5, coating: "Rh/Pt stripe", curvature: 8000 },
    ],
  },
  {
    id: "BL11-2",
    name: "BL 11-2",
    fullName: "XAS Spectroscopy (High Flux)",
    source: "Wiggler (26-pole)",
    techniques: ["XAS", "EXAFS", "XANES", "Micro-XAS"],
    energyRange: [4.5, 37],
    energyUnit: "keV",
    status: "maintenance",
    ringCurrent: 499.7,
    motors: generateMotors("BL11-2"),
    ionChambers: [
      { name: "I0", label: "Incident (I0)", currentReading: 0, unit: "counts/s", gain: "1e10", voltage: 0 },
      { name: "I1", label: "Transmitted (I1)", currentReading: 0, unit: "counts/s", gain: "1e10", voltage: 0 },
      { name: "I2", label: "Reference (I2)", currentReading: 0, unit: "counts/s", gain: "1e10", voltage: 0 },
    ],
    scalerChannels: [
      { channel: 0, name: "I0", counts: 0, countRate: 0, enabled: false },
      { channel: 1, name: "I1", counts: 0, countRate: 0, enabled: false },
      { channel: 2, name: "I2", counts: 0, countRate: 0, enabled: false },
      { channel: 3, name: "Timer", counts: 0, countRate: 0, enabled: false },
    ],
    vacuumSections: [
      { name: "Front-End", pressure: 1.1e-9, unit: "Torr", status: "ok" },
      { name: "Mono Vessel", pressure: 2.1e-7, unit: "Torr", status: "warning" },
      { name: "Mirror Box", pressure: 9.9e-7, unit: "Torr", status: "warning" },
    ],
    monochromator: { type: "DCM", crystal: "Si(220)", dSpacing: 1.9201, braggAngle: 0 },
    slits: [
      { name: "Slit 0 (White Beam)", hGap: 0.0, vGap: 0.0, hCenter: 0.0, vCenter: 0.0 },
      { name: "Slit 1 (Post-Mono)", hGap: 0.0, vGap: 0.0, hCenter: 0.0, vCenter: 0.0 },
    ],
    mirrors: [
      { name: "Collimating Mirror", angle: 0.0, coating: "Rh", curvature: 14000 },
      { name: "Focusing Mirror", angle: 0.0, coating: "Pt", curvature: 7500 },
    ],
  },
  {
    id: "BL14-1",
    name: "BL 14-1",
    fullName: "Environmental Science",
    source: "Bend Magnet",
    techniques: ["XRF", "Micro-XAS", "Micro-XRF"],
    energyRange: [2, 12],
    energyUnit: "keV",
    status: "operational",
    ringCurrent: 499.7,
    motors: generateMotors("BL14-1"),
    ionChambers: [
      { name: "I0", label: "Incident (I0)", currentReading: 3.45e7, unit: "counts/s", gain: "1e7", voltage: 250 },
      { name: "IF", label: "Fluorescence (IF)", currentReading: 5.67e5, unit: "counts/s", gain: "1e5", voltage: 0 },
    ],
    scalerChannels: [
      { channel: 0, name: "I0", counts: 34567890, countRate: 3.45e7, enabled: true },
      { channel: 1, name: "IF_total", counts: 5678901, countRate: 5.67e5, enabled: true },
      { channel: 2, name: "Timer", counts: 1000000, countRate: 1e6, enabled: true },
    ],
    vacuumSections: [
      { name: "Front-End", pressure: 4.2e-9, unit: "Torr", status: "ok" },
      { name: "Mono Vessel", pressure: 8.9e-8, unit: "Torr", status: "ok" },
      { name: "Sample Chamber", pressure: 1.0, unit: "Torr", status: "ok" },
    ],
    monochromator: { type: "DCM", crystal: "Si(111)", dSpacing: 3.1356, braggAngle: 19.45 },
    slits: [
      { name: "Slit 1", hGap: 1.0, vGap: 0.5, hCenter: 0.0, vCenter: 0.0 },
      { name: "KB Mirror Slits", hGap: 0.2, vGap: 0.1, hCenter: 0.0, vCenter: 0.0 },
    ],
    mirrors: [
      { name: "KB V-Mirror", angle: 3.0, coating: "Pt", curvature: 3000 },
      { name: "KB H-Mirror", angle: 3.0, coating: "Pt", curvature: 2500 },
    ],
  },
]

// Utility to generate scan data for a beamline
export function generateScanData(beamlineId: string, points: number = 200) {
  const bl = BEAMLINES.find((b) => b.id === beamlineId)
  if (!bl) return []

  const eMin = bl.energyRange[0] * 1000 // convert to eV
  const eMax = Math.min(bl.energyRange[0] * 1000 + 800, bl.energyRange[1] * 1000)
  const edgeEnergy = eMin + (eMax - eMin) * 0.35

  return Array.from({ length: points }, (_, i) => {
    const energy = eMin + (i / (points - 1)) * (eMax - eMin)
    const x = (energy - edgeEnergy) / 20
    // Simulate an XANES/EXAFS-like absorption edge with oscillations
    const step = 0.5 * (1 + Math.tanh(x * 0.8))
    const oscillation = energy > edgeEnergy ? 0.08 * Math.sin((energy - edgeEnergy) * 0.15) * Math.exp(-(energy - edgeEnergy) * 0.003) : 0
    const noise = (Math.random() - 0.5) * 0.01
    const mu = 0.3 + 0.7 * step + oscillation + noise

    return {
      energy: Math.round(energy * 10) / 10,
      mu: Math.round(mu * 10000) / 10000,
      I0: Math.round(bl.ionChambers[0]?.currentReading * (0.98 + Math.random() * 0.04)),
      I1: Math.round((bl.ionChambers[1]?.currentReading || 0) * (0.95 + Math.random() * 0.1) * (1 - step * 0.4)),
    }
  })
}

// Utility to generate 2D map data
export function generate2DMapData(rows: number = 20, cols: number = 30) {
  const data: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      const cx = cols / 2
      const cy = rows / 2
      const dist = Math.sqrt((c - cx) ** 2 + (r - cy) ** 2)
      const gaussian = Math.exp(-(dist ** 2) / 40) * 255
      const hotspot1 = Math.exp(-((c - cx * 0.6) ** 2 + (r - cy * 0.7) ** 2) / 15) * 180
      const hotspot2 = Math.exp(-((c - cx * 1.4) ** 2 + (r - cy * 1.3) ** 2) / 20) * 120
      const noise = Math.random() * 25
      row.push(Math.min(255, Math.round(gaussian + hotspot1 + hotspot2 + noise)))
    }
    data.push(row)
  }
  return data
}

export function getBeamlineById(id: string): BeamlineConfig | undefined {
  return BEAMLINES.find((b) => b.id === id)
}

// =====================================================
// X-ray Absorption Edge Database & Bragg Angle Calculator
// =====================================================

export interface AbsorptionEdge {
  name: string       // e.g. "K", "L1", "L2", "L3"
  energy: number     // in eV
}

export interface ElementInfo {
  symbol: string
  name: string
  Z: number
  edges: AbsorptionEdge[]
}

export const ELEMENTS: ElementInfo[] = [
  { symbol: "Ti", name: "Titanium", Z: 22, edges: [
    { name: "K", energy: 4966.0 }, { name: "L3", energy: 453.8 }, { name: "L2", energy: 460.2 }, { name: "L1", energy: 563.7 },
  ]},
  { symbol: "V", name: "Vanadium", Z: 23, edges: [
    { name: "K", energy: 5470.0 }, { name: "L3", energy: 512.1 }, { name: "L2", energy: 519.8 }, { name: "L1", energy: 626.7 },
  ]},
  { symbol: "Cr", name: "Chromium", Z: 24, edges: [
    { name: "K", energy: 5989.0 }, { name: "L3", energy: 574.1 }, { name: "L2", energy: 583.8 }, { name: "L1", energy: 694.0 },
  ]},
  { symbol: "Mn", name: "Manganese", Z: 25, edges: [
    { name: "K", energy: 6539.0 }, { name: "L3", energy: 638.7 }, { name: "L2", energy: 649.9 }, { name: "L1", energy: 769.1 },
  ]},
  { symbol: "Fe", name: "Iron", Z: 26, edges: [
    { name: "K", energy: 7112.0 }, { name: "L3", energy: 706.8 }, { name: "L2", energy: 719.9 }, { name: "L1", energy: 844.6 },
  ]},
  { symbol: "Co", name: "Cobalt", Z: 27, edges: [
    { name: "K", energy: 7709.0 }, { name: "L3", energy: 778.1 }, { name: "L2", energy: 793.2 }, { name: "L1", energy: 925.1 },
  ]},
  { symbol: "Ni", name: "Nickel", Z: 28, edges: [
    { name: "K", energy: 8333.0 }, { name: "L3", energy: 852.7 }, { name: "L2", energy: 869.9 }, { name: "L1", energy: 1008.6 },
  ]},
  { symbol: "Cu", name: "Copper", Z: 29, edges: [
    { name: "K", energy: 8979.0 }, { name: "L3", energy: 932.7 }, { name: "L2", energy: 952.3 }, { name: "L1", energy: 1096.7 },
  ]},
  { symbol: "Zn", name: "Zinc", Z: 30, edges: [
    { name: "K", energy: 9659.0 }, { name: "L3", energy: 1021.8 }, { name: "L2", energy: 1044.9 }, { name: "L1", energy: 1196.2 },
  ]},
  { symbol: "Ga", name: "Gallium", Z: 31, edges: [
    { name: "K", energy: 10367.0 }, { name: "L3", energy: 1115.4 }, { name: "L2", energy: 1142.3 }, { name: "L1", energy: 1298.7 },
  ]},
  { symbol: "Ge", name: "Germanium", Z: 32, edges: [
    { name: "K", energy: 11103.0 }, { name: "L3", energy: 1217.0 }, { name: "L2", energy: 1248.1 }, { name: "L1", energy: 1414.6 },
  ]},
  { symbol: "As", name: "Arsenic", Z: 33, edges: [
    { name: "K", energy: 11867.0 }, { name: "L3", energy: 1323.6 }, { name: "L2", energy: 1359.1 }, { name: "L1", energy: 1527.0 },
  ]},
  { symbol: "Se", name: "Selenium", Z: 34, edges: [
    { name: "K", energy: 12658.0 }, { name: "L3", energy: 1433.9 }, { name: "L2", energy: 1474.3 }, { name: "L1", energy: 1652.0 },
  ]},
  { symbol: "Br", name: "Bromine", Z: 35, edges: [
    { name: "K", energy: 13474.0 }, { name: "L3", energy: 1550.0 }, { name: "L2", energy: 1596.0 }, { name: "L1", energy: 1782.0 },
  ]},
  { symbol: "Mo", name: "Molybdenum", Z: 42, edges: [
    { name: "K", energy: 20000.0 }, { name: "L3", energy: 2520.0 }, { name: "L2", energy: 2625.0 }, { name: "L1", energy: 2866.0 },
  ]},
  { symbol: "Ag", name: "Silver", Z: 47, edges: [
    { name: "K", energy: 25514.0 }, { name: "L3", energy: 3351.0 }, { name: "L2", energy: 3524.0 }, { name: "L1", energy: 3806.0 },
  ]},
  { symbol: "Pt", name: "Platinum", Z: 78, edges: [
    { name: "K", energy: 78395.0 }, { name: "L3", energy: 11564.0 }, { name: "L2", energy: 13273.0 }, { name: "L1", energy: 13880.0 },
  ]},
  { symbol: "Au", name: "Gold", Z: 79, edges: [
    { name: "K", energy: 80725.0 }, { name: "L3", energy: 11919.0 }, { name: "L2", energy: 13734.0 }, { name: "L1", energy: 14353.0 },
  ]},
  { symbol: "Pb", name: "Lead", Z: 82, edges: [
    { name: "K", energy: 88005.0 }, { name: "L3", energy: 13035.0 }, { name: "L2", energy: 15200.0 }, { name: "L1", energy: 15861.0 },
  ]},
  { symbol: "U", name: "Uranium", Z: 92, edges: [
    { name: "K", energy: 115606.0 }, { name: "L3", energy: 17166.0 }, { name: "L2", energy: 20948.0 }, { name: "L1", energy: 21757.0 },
  ]},
]

// Physical constants for Bragg angle calculations
const HC_EV_ANGSTROM = 12398.4197   // hc in eV * Angstrom

// Crystal d-spacings in Angstrom
export const CRYSTAL_OPTIONS = [
  { label: "Si(111)", dSpacing: 3.13560 },
  { label: "Si(220)", dSpacing: 1.92010 },
  { label: "Si(311)", dSpacing: 1.63750 },
  { label: "Si(400)", dSpacing: 1.35780 },
  { label: "Ge(111)", dSpacing: 3.26630 },
  { label: "Ge(220)", dSpacing: 1.99980 },
]

/**
 * Calculate Bragg angle from energy, d-spacing, and harmonic order
 * Bragg's law:  n * lambda = 2 * d * sin(theta)
 *   lambda = hc / E
 *   theta  = arcsin( n * hc / (2 * d * E) )
 *
 * Returns angle in degrees, or null if the geometry is unreachable.
 */
export function calcBraggAngle(
  energyEv: number,
  dSpacingAngstrom: number,
  n: number = 1,
): number | null {
  const wavelength = HC_EV_ANGSTROM / energyEv   // Angstrom
  const sinTheta = (n * wavelength) / (2 * dSpacingAngstrom)
  if (sinTheta > 1 || sinTheta < 0) return null
  return (Math.asin(sinTheta) * 180) / Math.PI     // degrees
}

/**
 * Calculate crystal gap (d0, perpendicular distance between two DCM crystals)
 * from the Bragg angle and the desired beam offset.
 *
 *   d0 = beamOffset / (2 * cos(theta))
 *
 * beamOffset: fixed vertical offset of the exit beam (mm), typically 10 – 25 mm
 * thetaDeg : Bragg angle in degrees
 * Returns d0 in mm.
 */
export function calcCrystalGap(
  thetaDeg: number,
  beamOffsetMm: number = 20,
): number {
  const thetaRad = (thetaDeg * Math.PI) / 180
  return beamOffsetMm / (2 * Math.cos(thetaRad))
}

/**
 * Calculate energy from Bragg angle, d-spacing, and order
 */
export function calcEnergyFromBragg(
  thetaDeg: number,
  dSpacingAngstrom: number,
  n: number = 1,
): number | null {
  const thetaRad = (thetaDeg * Math.PI) / 180
  const sinTheta = Math.sin(thetaRad)
  if (sinTheta <= 0) return null
  return (n * HC_EV_ANGSTROM) / (2 * dSpacingAngstrom * sinTheta)
}

// =====================================================
// Sample-specific scan demo data generators
// =====================================================

/**
 * 1D XANES scan around a given edge energy.
 * Generates a physically-motivated absorption step with EXAFS-like oscillations.
 */
export function generateSampleXANES(
  edgeEv: number,
  prePts: number = 60,
  xanesPts: number = 80,
  exafsPts: number = 120,
) {
  const data: { energy: number; mu: number; deriv: number; I0: number; It: number }[] = []
  const preStart = edgeEv - 150
  const preEnd = edgeEv - 10
  const xanesEnd = edgeEv + 60
  const exafsEnd = edgeEv + 700

  // Pre-edge
  for (let i = 0; i < prePts; i++) {
    const e = preStart + (i / (prePts - 1)) * (preEnd - preStart)
    const mu = 0.25 + 0.002 * (e - preStart) / 100 + (Math.random() - 0.5) * 0.004
    data.push({ energy: +e.toFixed(2), mu: +mu.toFixed(5), deriv: 0, I0: 1e8 + Math.random() * 1e6, It: 1e8 * Math.exp(-mu) })
  }
  // XANES region
  for (let i = 0; i < xanesPts; i++) {
    const e = preEnd + (i / (xanesPts - 1)) * (xanesEnd - preEnd)
    const x = (e - edgeEv) / 8
    const step = 0.5 * (1 + Math.tanh(x * 1.2))
    // White line peak at edge + 3 eV
    const whiteLine = 0.15 * Math.exp(-((e - edgeEv - 3) ** 2) / 12)
    // Post-edge shoulder
    const shoulder = 0.04 * Math.exp(-((e - edgeEv - 20) ** 2) / 80)
    const mu = 0.25 + 0.75 * step + whiteLine + shoulder + (Math.random() - 0.5) * 0.005
    data.push({ energy: +e.toFixed(2), mu: +mu.toFixed(5), deriv: 0, I0: 1e8 + Math.random() * 1e6, It: 1e8 * Math.exp(-mu) })
  }
  // EXAFS region
  for (let i = 0; i < exafsPts; i++) {
    const e = xanesEnd + (i / (exafsPts - 1)) * (exafsEnd - xanesEnd)
    const k = Math.sqrt((e - edgeEv) * 0.2625) // approximate k from energy above edge
    const chi = 0.1 * Math.sin(2 * k * 2.5) * Math.exp(-k * 0.15) +
                0.06 * Math.sin(2 * k * 3.2 + 0.5) * Math.exp(-k * 0.2) +
                0.03 * Math.sin(2 * k * 4.1 + 1.0) * Math.exp(-k * 0.25)
    const baseMu = 1.0 - 0.1 * (e - xanesEnd) / (exafsEnd - xanesEnd) // Victoreen falloff
    const mu = baseMu + chi + (Math.random() - 0.5) * 0.006
    data.push({ energy: +e.toFixed(2), mu: +mu.toFixed(5), deriv: 0, I0: 1e8 + Math.random() * 1e6, It: 1e8 * Math.exp(-mu) })
  }

  // Numerical derivative
  for (let i = 1; i < data.length - 1; i++) {
    data[i].deriv = +((data[i + 1].mu - data[i - 1].mu) / (data[i + 1].energy - data[i - 1].energy)).toFixed(6)
  }
  if (data.length > 0) data[0].deriv = data[1]?.deriv ?? 0
  if (data.length > 1) data[data.length - 1].deriv = data[data.length - 2]?.deriv ?? 0

  return data
}

/**
 * 2D XRF / micro-XAS map: returns a 2D intensity grid with
 * element-specific "hotspots" simulating a micro-fluorescence map.
 */
export function generateSample2DMap(
  elementSymbol: string,
  rows: number = 30,
  cols: number = 40,
) {
  // Seed deterministic-ish random per element
  const seed = elementSymbol.charCodeAt(0) * 137 + (elementSymbol.charCodeAt(1) || 0) * 41
  function seededRand(i: number) {
    const x = Math.sin(seed + i * 9301 + 49297) * 49297
    return x - Math.floor(x)
  }

  // Place 2-4 hotspots based on element
  const numHotspots = 2 + (seed % 3)
  const hotspots = Array.from({ length: numHotspots }, (_, i) => ({
    cx: cols * (0.2 + seededRand(i * 10) * 0.6),
    cy: rows * (0.2 + seededRand(i * 10 + 1) * 0.6),
    sigmaX: 2 + seededRand(i * 10 + 2) * 6,
    sigmaY: 2 + seededRand(i * 10 + 3) * 5,
    amplitude: 100 + seededRand(i * 10 + 4) * 155,
  }))

  const data: { row: number; col: number; intensity: number; x: number; y: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let val = 10 + Math.random() * 10 // background
      for (const h of hotspots) {
        val += h.amplitude * Math.exp(-((c - h.cx) ** 2) / (2 * h.sigmaX ** 2) - (r - h.cy) ** 2 / (2 * h.sigmaY ** 2))
      }
      // Add a grain-like texture
      val += seededRand(r * cols + c) * 15
      data.push({ row: r, col: c, intensity: Math.min(255, Math.round(val)), x: +(c * 0.5).toFixed(1), y: +(r * 0.5).toFixed(1) })
    }
  }
  return { data, rows, cols }
}

/**
 * Multi-edge / multi-sample 3D stacked scans.
 * Returns an array of {energy, ...sampleMu} for overlaid comparison.
 */
export function generateMultiSampleScans(
  elements: { symbol: string; edgeEnergy: number }[],
  points: number = 200,
) {
  const allEnergies = new Set<number>()
  const scansByElement: Record<string, Map<number, number>> = {}

  for (const el of elements) {
    const scan = generateSampleXANES(el.edgeEnergy, 30, 60, points - 90)
    scansByElement[el.symbol] = new Map()
    for (const d of scan) {
      const eRounded = +d.energy.toFixed(1)
      allEnergies.add(eRounded)
      scansByElement[el.symbol].set(eRounded, d.mu)
    }
  }

  const sortedEnergies = Array.from(allEnergies).sort((a, b) => a - b)
  return sortedEnergies.map(energy => {
    const row: Record<string, number> = { energy }
    for (const el of elements) {
      row[el.symbol] = scansByElement[el.symbol]?.get(energy) ?? 0
    }
    return row
  })
}

/**
 * Theta-2Theta powder diffraction scan for diffraction beamlines (BL2-1).
 */
export function generatePowderXRD(wavelengthA: number, points: number = 300) {
  const data: { twoTheta: number; intensity: number }[] = []
  // Simulated peaks (d-spacings for a Cu-like FCC structure)
  const dSpacings = [2.088, 1.808, 1.278, 1.090, 1.044, 0.904, 0.829, 0.808]
  const relIntensities = [1.0, 0.46, 0.20, 0.17, 0.05, 0.09, 0.08, 0.03]

  for (let i = 0; i < points; i++) {
    const tt = 10 + (i / (points - 1)) * 120
    let intensity = 5 + Math.random() * 3 // background
    for (let p = 0; p < dSpacings.length; p++) {
      const sinTh = wavelengthA / (2 * dSpacings[p])
      if (sinTh > 1 || sinTh < 0) continue
      const peakTT = 2 * Math.asin(sinTh) * 180 / Math.PI
      const sigma = 0.15 + Math.random() * 0.02
      intensity += relIntensities[p] * 1000 * Math.exp(-((tt - peakTT) ** 2) / (2 * sigma ** 2))
    }
    data.push({ twoTheta: +tt.toFixed(2), intensity: Math.round(intensity) })
  }
  return data
}

/**
 * Rocking curve / omega scan around a Bragg peak.
 */
export function generateRockingCurve(centerDeg: number = 0, points: number = 200) {
  return Array.from({ length: points }, (_, i) => {
    const omega = centerDeg - 1.0 + (i / (points - 1)) * 2.0
    const sigma = 0.08
    const peak = 50000 * Math.exp(-((omega - centerDeg) ** 2) / (2 * sigma ** 2))
    const bg = 20 + Math.random() * 10
    return {
      omega: +omega.toFixed(4),
      intensity: Math.round(peak + bg),
    }
  })
}
