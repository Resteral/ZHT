"use client"

import type * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
  color?: "default" | "success" | "warning" | "danger" | "info"
  animated?: boolean
  showPercentage?: boolean
}

const ProgressRing = ({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  children,
  color = "default",
  animated = true,
  showPercentage = false,
}: ProgressRingProps) => {
  const normalizedRadius = (size - strokeWidth) / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const colors = {
    default: "stroke-primary",
    success: "stroke-green-500",
    warning: "stroke-amber-500",
    danger: "stroke-red-500",
    info: "stroke-cyan-500",
  }

  const gradientColors = {
    default: ["#3b82f6", "#1d4ed8"],
    success: ["#10b981", "#059669"],
    warning: ["#f59e0b", "#d97706"],
    danger: ["#ef4444", "#dc2626"],
    info: ["#06b6d4", "#0891b2"],
  }

  const gradientId = `gradient-${color}-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg height={size} width={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientColors[color][0]} />
            <stop offset="100%" stopColor={gradientColors[color][1]} />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          stroke="currentColor"
          className="text-muted/20"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />

        {/* Progress circle */}
        <motion.circle
          stroke={`url(#${gradientId})`}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: animated ? strokeDashoffset : circumference - (progress / 100) * circumference,
          }}
          transition={{
            duration: animated ? 1.5 : 0,
            ease: "easeInOut",
            delay: animated ? 0.2 : 0,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {showPercentage ? (
          <motion.span
            className="text-2xl font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: animated ? 0.5 : 0 }}
          >
            {Math.round(progress)}%
          </motion.span>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

export { ProgressRing }
