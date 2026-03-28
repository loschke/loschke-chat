"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Play, Pause, Download, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AudioPlayerData {
  title: string
  url: string
  durationSeconds: number
  voice: string
}

interface AudioPlayerProps {
  audio: AudioPlayerData
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function AudioPlayer({ audio }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onTimeUpdate = () => setCurrentTime(el.currentTime)
    const onDurationChange = () => setDuration(el.duration)
    const onEnded = () => setIsPlaying(false)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onError = () => setError(el.error?.message ?? "Audio konnte nicht abgespielt werden")

    el.addEventListener("timeupdate", onTimeUpdate)
    el.addEventListener("durationchange", onDurationChange)
    el.addEventListener("ended", onEnded)
    el.addEventListener("play", onPlay)
    el.addEventListener("pause", onPause)
    el.addEventListener("error", onError)

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate)
      el.removeEventListener("durationchange", onDurationChange)
      el.removeEventListener("ended", onEnded)
      el.removeEventListener("play", onPlay)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("error", onError)
    }
  }, [audio.url])

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (isPlaying) el.pause()
    else el.play()
  }, [isPlaying])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    el.currentTime = percent * duration
  }, [duration])

  const cyclePlaybackRate = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    const idx = PLAYBACK_RATES.indexOf(playbackRate as typeof PLAYBACK_RATES[number])
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]
    el.playbackRate = next
    setPlaybackRate(next)
  }, [playbackRate])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/50 bg-muted/40 p-3 text-sm text-muted-foreground">
        <Volume2 className="size-4 shrink-0" />
        <span className="flex-1">{error}</span>
        <a href={audio.url} download={`${audio.title}.wav`} className="text-xs text-primary hover:underline shrink-0">
          Herunterladen
        </a>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-muted/40 p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pausieren" : "Abspielen"}
          title={isPlaying ? "Pausieren" : "Abspielen"}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium truncate">{audio.title}</span>
            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration || audio.durationSeconds)}
            </span>
          </div>

          <div
            className="w-full h-1.5 bg-muted rounded-full cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-100 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {audio.voice}
            </span>
            <button
              type="button"
              onClick={cyclePlaybackRate}
              aria-label={`Wiedergabegeschwindigkeit ändern (aktuell ${playbackRate}x)`}
              title="Wiedergabegeschwindigkeit ändern"
              className={cn(
                "rounded px-1 py-0.5 text-[10px] font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                playbackRate !== 1
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {playbackRate}x
            </button>
            <div className="flex-1" />
            <a
              href={audio.url}
              download={`${audio.title}.wav`}
              className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              aria-label="Audio herunterladen"
              title="Herunterladen"
            >
              <Download className="size-3.5" />
            </a>
          </div>
        </div>
      </div>

      <audio ref={audioRef} preload="metadata">
        <source src={audio.url} type="audio/wav" />
      </audio>
    </div>
  )
}

export function AudioPlayerSkeleton() {
  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-muted/40 p-3">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
          <div className="h-1.5 w-full rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )
}
