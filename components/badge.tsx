import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "green" | "red" | "gray"
  className?: string
}

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-badge px-2 py-0.5 text-[11px] font-medium",
        {
          "bg-accent-green/20 text-accent-green": variant === "green",
          "bg-accent-red/20 text-accent-red": variant === "red",
          "bg-border text-muted-foreground": variant === "gray",
        },
        className
      )}
    >
      {children}
    </span>
  )
}
