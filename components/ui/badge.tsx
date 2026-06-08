import { type HTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

const variants = {
  default: "bg-primary/10 text-primary border-transparent",
  secondary: "bg-muted text-text-secondary border-transparent",
  destructive: "bg-destructive/10 text-destructive border-transparent",
  success: "bg-success/10 text-success border-transparent",
  warning: "bg-warning/10 text-warning border-transparent",
  outline: "text-text-primary border-border",
} as const

type BadgeProps = {
  variant?: keyof typeof variants
} & HTMLAttributes<HTMLDivElement>

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
)
Badge.displayName = "Badge"

export { Badge, type BadgeProps }
