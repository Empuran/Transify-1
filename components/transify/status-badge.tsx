"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, Clock, AlertTriangle, CircleDashed, CirclePlay } from "lucide-react"

type StatusType = "on-time" | "delayed" | "emergency" | "completed" | "upcoming" | "active"

interface StatusBadgeProps {
  status: StatusType
  className?: string
  size?: "sm" | "md"
}

const statusConfig: Record<StatusType, {
  label: string
  className: string
  icon: typeof CheckCircle2
  dotClass: string
}> = {
  "on-time": {
    label: "On Time",
    className: "bg-success/15 text-success",
    icon: CheckCircle2,
    dotClass: "bg-success",
  },
  delayed: {
    label: "Delayed",
    className: "bg-warning/15 text-warning",
    icon: Clock,
    dotClass: "bg-warning",
  },
  emergency: {
    label: "Emergency",
    className: "bg-destructive/15 text-destructive",
    icon: AlertTriangle,
    dotClass: "bg-destructive",
  },
  completed: {
    label: "Completed",
    className: "bg-muted text-muted-foreground",
    icon: CheckCircle2,
    dotClass: "bg-muted-foreground",
  },
  upcoming: {
    label: "Upcoming",
    className: "bg-primary/10 text-primary",
    icon: CircleDashed,
    dotClass: "bg-primary",
  },
  active: {
    label: "Active",
    className: "bg-success/15 text-success",
    icon: CirclePlay,
    dotClass: "bg-success",
  },
}

export function StatusBadge({ status, className, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        config.className,
        className
      )}
      role="status"
      aria-label={config.label}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {config.label}
    </span>
  )
}
