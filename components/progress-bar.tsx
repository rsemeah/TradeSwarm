interface ProgressBarProps {
  value: number
  max: number
  color: string
  width?: number | string
  height?: number
}

export function ProgressBar({
  value,
  max,
  color,
  width = "100%",
  height = 4,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div
      className="overflow-hidden rounded-sm bg-border"
      style={{ width, height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full transition-all duration-300"
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}
