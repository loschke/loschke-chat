"use client"

import { cn } from "@/lib/utils"

interface VoiceChatVisualizerProps {
  /** Audio amplitude 0-1 */
  amplitude: number
  /** Visual state */
  state: "idle" | "listening" | "speaking" | "connecting" | "muted"
  /** Size variant */
  size?: "sm" | "lg"
  className?: string
}

const BAR_COUNT = 7

export function VoiceChatVisualizer({
  amplitude,
  state,
  size = "lg",
  className,
}: VoiceChatVisualizerProps) {
  const isActive = state === "listening" || state === "speaking"
  const isMuted = state === "muted"
  const isConnecting = state === "connecting"

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1",
        size === "lg" ? "h-16 gap-1.5" : "h-8 gap-0.5",
        className
      )}
      role="img"
      aria-label={
        state === "listening" ? "Hört zu" :
        state === "speaking" ? "Spricht" :
        state === "connecting" ? "Verbindet" :
        state === "muted" ? "Stummgeschaltet" :
        "Bereit"
      }
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        // Each bar gets a slightly different amplitude for organic feel
        const offset = Math.sin(i * 0.9 + Date.now() * 0.002) * 0.15
        const barAmplitude = isActive
          ? Math.max(0.15, Math.min(1, amplitude + offset))
          : 0.15

        return (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all",
              size === "lg" ? "w-2" : "w-1",
              // Colors
              state === "speaking" ? "bg-primary" :
              state === "listening" ? "bg-primary/70" :
              isMuted ? "bg-muted-foreground/30" :
              isConnecting ? "bg-primary/50" :
              "bg-muted-foreground/40",
              // Idle pulsing animation
              !isActive && !isMuted && "animate-pulse",
              // Connecting animation
              isConnecting && "animate-pulse",
            )}
            style={{
              height: isActive
                ? `${barAmplitude * (size === "lg" ? 64 : 32)}px`
                : `${(size === "lg" ? 12 : 6)}px`,
              transition: "height 80ms ease-out",
              animationDelay: isConnecting ? `${i * 100}ms` : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
