"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { BeamlineConfig, Motor } from "@/lib/beamline-config"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { CalendarIcon, Clock, CalendarDays, CheckCircle2, AlertCircle, Trash2, List, X } from "lucide-react"
import { format, addDays, startOfDay, isBefore, isAfter } from "date-fns"

interface Reservation {
  id: number
  motorName: string
  startDate: Date
  startTime: string
  endDate: Date
  endTime: string
  description: string
  user: string
}

// Simulated initial reservations
const initialReservations: Reservation[] = [
  {
    id: 1,
    motorName: "th",
    startDate: new Date(),
    startTime: "09:00",
    endDate: new Date(),
    endTime: "12:00",
    description: "Sample alignment for XANES experiment",
    user: "John Doe",
  },
  {
    id: 2,
    motorName: "mono_e",
    startDate: addDays(new Date(), 1),
    startTime: "14:00",
    endDate: addDays(new Date(), 1),
    endTime: "18:00",
    description: "Energy calibration scan",
    user: "Jane Smith",
  },
]

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0")
  return `${hour}:00`
})

function getMotorStatus(motorName: string, reservations: Reservation[]): "in-use" | "available" {
  const now = new Date()
  const currentReservation = reservations.find((r) => {
    const start = new Date(r.startDate)
    start.setHours(parseInt(r.startTime.split(":")[0]), parseInt(r.startTime.split(":")[1]))
    const end = new Date(r.endDate)
    end.setHours(parseInt(r.endTime.split(":")[0]), parseInt(r.endTime.split(":")[1]))
    return r.motorName === motorName && now >= start && now <= end
  })
  return currentReservation ? "in-use" : "available"
}

function getNextReservation(motorName: string, reservations: Reservation[]): Reservation | undefined {
  const now = new Date()
  return reservations
    .filter((r) => {
      const start = new Date(r.startDate)
      start.setHours(parseInt(r.startTime.split(":")[0]), parseInt(r.startTime.split(":")[1]))
      return r.motorName === motorName && start > now
    })
    .sort((a, b) => {
      const aStart = new Date(a.startDate)
      aStart.setHours(parseInt(a.startTime.split(":")[0]))
      const bStart = new Date(b.startDate)
      bStart.setHours(parseInt(b.startTime.split(":")[0]))
      return aStart.getTime() - bStart.getTime()
    })[0]
}

export function StatusTab({ beamline }: { beamline: BeamlineConfig }) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedMotor, setSelectedMotor] = useState<Motor | null>(null)
  const [viewReservationsDialogOpen, setViewReservationsDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null)
  
  // Form state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [description, setDescription] = useState("")

  // Date constraints - next 7 days only
  const today = startOfDay(new Date())
  const maxDate = addDays(today, 7)

  const singleMotors = useMemo(
    () => beamline.motors.filter((m) => !m.combinedOf),
    [beamline.motors]
  )
  const combinedMotors = useMemo(
    () => beamline.motors.filter((m) => !!m.combinedOf),
    [beamline.motors]
  )

  // Get all reservations for the selected motor
  const motorReservations = useMemo(() => {
    if (!selectedMotor) return []
    return reservations
      .filter((r) => r.motorName === selectedMotor.name)
      .sort((a, b) => {
        const aStart = new Date(a.startDate)
        aStart.setHours(parseInt(a.startTime.split(":")[0]))
        const bStart = new Date(b.startDate)
        bStart.setHours(parseInt(b.startTime.split(":")[0]))
        return aStart.getTime() - bStart.getTime()
      })
  }, [selectedMotor, reservations])

  // Get current user's reservations
  const myReservations = useMemo(() => {
    return reservations
      .filter((r) => r.user === "Current User")
      .sort((a, b) => {
        const aStart = new Date(a.startDate)
        aStart.setHours(parseInt(a.startTime.split(":")[0]))
        const bStart = new Date(b.startDate)
        bStart.setHours(parseInt(b.startTime.split(":")[0]))
        return aStart.getTime() - bStart.getTime()
      })
  }, [reservations])

  const handleOpenSchedule = (motor: Motor) => {
    setSelectedMotor(motor)
    setStartDate(undefined)
    setEndDate(undefined)
    setStartTime("09:00")
    setEndTime("17:00")
    setDescription("")
    setScheduleDialogOpen(true)
  }

  const handleSubmitReservation = () => {
    if (!selectedMotor || !startDate || !endDate) return

    const newReservation: Reservation = {
      id: Date.now(),
      motorName: selectedMotor.name,
      startDate,
      startTime,
      endDate,
      endTime,
      description,
      user: "Current User",
    }

    setReservations((prev) => [...prev, newReservation])
    setScheduleDialogOpen(false)
  }

  const handleViewReservations = (motor: Motor) => {
    setSelectedMotor(motor)
    setViewReservationsDialogOpen(true)
  }

  const handleCancelReservation = (reservation: Reservation) => {
    setReservationToCancel(reservation)
    setCancelDialogOpen(true)
  }

  const confirmCancelReservation = () => {
    if (!reservationToCancel) return
    setReservations((prev) => prev.filter((r) => r.id !== reservationToCancel.id))
    setReservationToCancel(null)
    setCancelDialogOpen(false)
  }

  const MotorStatusRow = ({ motor }: { motor: Motor }) => {
    const status = getMotorStatus(motor.name, reservations)
    const nextReservation = getNextReservation(motor.name, reservations)
    const isCombined = !!motor.combinedOf

    return (
      <tr className={cn(
        "border-b border-border/50 transition-colors hover:bg-secondary/30",
        isCombined && "bg-accent/5"
      )}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">
              {motor.name}
            </span>
            {isCombined && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-accent text-accent font-normal">
                combined
              </Badge>
            )}
          </div>
          {isCombined && motor.combinedOf && (
            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
              = {motor.combinedOf.join(" + ")}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {motor.description}
        </td>
        <td className="px-4 py-3">
          <Badge
            className={cn(
              "text-xs font-medium gap-1.5",
              status === "in-use"
                ? "bg-chart-5/15 text-chart-5 border-chart-5/30"
                : "bg-primary/10 text-primary border-primary/30"
            )}
            variant="outline"
          >
            {status === "in-use" ? (
              <AlertCircle className="size-3" />
            ) : (
              <CheckCircle2 className="size-3" />
            )}
            {status === "in-use" ? "In Use" : "Available"}
          </Badge>
        </td>
        <td className="px-4 py-3">
          {nextReservation ? (
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {format(nextReservation.startDate, "MMM d")} at {nextReservation.startTime}
              </div>
              <div className="truncate max-w-[150px]">{nextReservation.description}</div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No upcoming reservations</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => handleOpenSchedule(motor)}
            >
              <CalendarDays className="size-3.5" />
              Schedule
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => handleViewReservations(motor)}
            >
              <List className="size-3.5" />
              View
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      {/* My Reservations */}
      {myReservations.length > 0 && (
        <Card className="bg-card border-border border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
                My Reservations
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono border-primary text-primary">
                {myReservations.length} booked
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-primary/5">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Motor
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Date & Time
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myReservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {reservation.motorName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <div className="font-medium text-foreground">
                            {format(reservation.startDate, "MMM d")} {reservation.startTime} - {format(reservation.endDate, "MMM d")} {reservation.endTime}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {reservation.description}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => handleCancelReservation(reservation)}
                        >
                          <X className="size-3.5" />
                          Cancel
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Motors */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Single Motors Status -- {beamline.id}
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              {singleMotors.length} motors
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Motor
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Next Reservation
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {singleMotors.map((motor) => (
                  <MotorStatusRow key={motor.name} motor={motor} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Combined Motors */}
      {combinedMotors.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Combined Motors Status
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono border-accent text-accent">
                {combinedMotors.length} combined
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Motor
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Next Reservation
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {combinedMotors.map((motor) => (
                    <MotorStatusRow key={motor.name} motor={motor} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              Schedule Motor: {selectedMotor?.name}
            </DialogTitle>
            <DialogDescription>
              Book {selectedMotor?.description} for a time slot within the next week.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Start Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        if (!endDate || (date && endDate < date)) {
                          setEndDate(date)
                        }
                      }}
                      disabled={(date) =>
                        isBefore(date, today) || isAfter(date, maxDate)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="h-9">
                    <Clock className="mr-2 size-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* End Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) =>
                        isBefore(date, startDate || today) || isAfter(date, maxDate)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="h-9">
                    <Clock className="mr-2 size-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                placeholder="Describe what you need to do with this motor..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReservation}
              disabled={!startDate || !endDate || !description}
            >
              <CalendarDays className="mr-2 size-4" />
              Book Motor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Reservations Dialog */}
      <Dialog open={viewReservationsDialogOpen} onOpenChange={setViewReservationsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="size-5" />
              Reservations for: {selectedMotor?.name}
            </DialogTitle>
            <DialogDescription>
              All scheduled reservations for {selectedMotor?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {motorReservations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="size-12 mx-auto mb-3 opacity-50" />
                <p>No reservations scheduled for this motor.</p>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-secondary">
                    <tr className="border-b border-border">
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Date & Time
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        User
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Description
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {motorReservations.map((reservation) => {
                      const isOwnReservation = reservation.user === "Current User"
                      return (
                        <tr key={reservation.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                          <td className="px-4 py-3">
                            <div className="text-xs">
                              <div className="font-medium text-foreground">
                                {format(reservation.startDate, "MMM d")} {reservation.startTime}
                              </div>
                              <div className="text-muted-foreground">
                                to {format(reservation.endDate, "MMM d")} {reservation.endTime}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-foreground">
                                {reservation.user}
                              </span>
                              {isOwnReservation && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary text-primary">
                                  You
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                              {reservation.description}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isOwnReservation ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleCancelReservation(reservation)}
                              >
                                <Trash2 className="size-3.5" />
                                Cancel
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewReservationsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setViewReservationsDialogOpen(false)
              if (selectedMotor) handleOpenSchedule(selectedMotor)
            }}>
              <CalendarDays className="mr-2 size-4" />
              Add Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this reservation?
              {reservationToCancel && (
                <div className="mt-3 p-3 rounded-md bg-secondary/50 text-sm">
                  <div className="font-medium text-foreground">
                    Motor: {reservationToCancel.motorName}
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {format(reservationToCancel.startDate, "MMM d")} {reservationToCancel.startTime} - {format(reservationToCancel.endDate, "MMM d")} {reservationToCancel.endTime}
                  </div>
                  <div className="text-muted-foreground mt-1 truncate">
                    {reservationToCancel.description}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReservationToCancel(null)}>
              Keep Reservation
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmCancelReservation}
            >
              Yes, Cancel Reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
