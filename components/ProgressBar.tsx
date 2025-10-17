"use client";
import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showLabel?: boolean;
  label?: string;
  color?: "blue" | "green" | "orange" | "purple";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export default function ProgressBar({
  progress,
  className = "",
  showLabel = false,
  label,
  color = "blue",
  size = "md",
  animated = true,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const colors = {
    blue: "bg-blue-500 [.dark_&]:bg-blue-400",
    green: "bg-green-500 [.dark_&]:bg-green-400", 
    orange: "bg-orange-500 [.dark_&]:bg-orange-400",
    purple: "bg-purple-500 [.dark_&]:bg-purple-400",
  };

  const backgroundColors = {
    blue: "bg-blue-100 [.dark_&]:bg-blue-900/30",
    green: "bg-green-100 [.dark_&]:bg-green-900/30",
    orange: "bg-orange-100 [.dark_&]:bg-orange-900/30", 
    purple: "bg-purple-100 [.dark_&]:bg-purple-900/30",
  };

  const sizes = {
    sm: "h-1.5",
    md: "h-2.5", 
    lg: "h-4",
  };

  const labelSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className={`${labelSizes[size]} font-medium text-slate-700 [.dark_&]:text-slate-300`}>
            {label || "Progresso"}
          </span>
          <span className={`${labelSizes[size]} font-medium text-slate-600 [.dark_&]:text-slate-400`}>
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
      
      <div className={`${sizes[size]} ${backgroundColors[color]} rounded-full overflow-hidden`}>
        <motion.div
          className={`${sizes[size]} ${colors[color]} rounded-full transition-all duration-300 ease-out`}
          initial={animated ? { width: 0 } : { width: `${clampedProgress}%` }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: animated ? 1.2 : 0, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// Componente wrapper per animazioni più complesse
export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = "blue",
  showLabel = true,
  className = "",
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: "blue" | "green" | "orange" | "purple";
  showLabel?: boolean;
  className?: string;
}) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const colors = {
    blue: "#3b82f6",
    green: "#10b981",
    orange: "#f59e0b", 
    purple: "#8b5cf6",
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-200 [.dark_&]:text-slate-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors[color]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-700 [.dark_&]:text-slate-300">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
}