"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GoogleGenAI, Modality } from "@google/genai"
import type { Session, LiveServerMessage } from "@google/genai"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoiceChatState =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "error"
  | "disconnected"

export interface TranscriptEntry {
  role: "user" | "assistant"
  text: string
  timestamp: number
  finished: boolean
}

interface TokenResponse {
  token: string
  expiresAt: string
  sessionId: string
  chatId: string
  voice: string
  model: string
  systemPrompt: string
  maxDuration: number
  projectName: string | null
}

export interface UseVoiceChatReturn {
  state: VoiceChatState
  connect: (params?: { chatId?: string; projectId?: string }) => Promise<void>
  disconnect: () => void
  mute: () => void
  unmute: () => void
  isMuted: boolean
  duration: number
  transcript: TranscriptEntry[]
  error: string | null
  /** Current audio amplitude 0-1 for visualizer */
  amplitude: number
  /** Max session duration in seconds (from server config) */
  maxDuration: number
  /** Project name if voice session is within a project */
  projectName: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUDIO_SAMPLE_RATE_IN = 16000
const AUDIO_SAMPLE_RATE_OUT = 24000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  // PCM 16-bit signed LE → Float32
  const length = bytes.length / 2
  const float32 = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let sample = bytes[i * 2] | (bytes[i * 2 + 1] << 8)
    if (sample >= 32768) sample -= 65536
    float32[i] = sample / 32768
  }
  return float32
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceChat(): UseVoiceChatReturn {
  const [state, setState] = useState<VoiceChatState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [amplitude, setAmplitude] = useState(0)

  // Refs for cleanup
  const sessionRef = useRef<Session | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const sessionDataRef = useRef<{ sessionId: string; chatId: string; maxDuration: number; projectName: string | null } | null>(null)
  const startTimeRef = useRef<number>(0)
  const isMutedRef = useRef(false)
  const stateRef = useRef<VoiceChatState>("idle")
  const transcriptRef = useRef<TranscriptEntry[]>([])

  // Audio playback queue
  const playbackContextRef = useRef<AudioContext | null>(null)
  const nextPlayTimeRef = useRef(0)
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null)

  // Keep refs in sync
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  // ----------- Cleanup -----------

  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Close SDK session
    if (sessionRef.current) {
      try { sessionRef.current.close() } catch { /* ignore */ }
      sessionRef.current = null
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }

    if (playbackContextRef.current && playbackContextRef.current.state !== "closed") {
      playbackContextRef.current.close().catch(() => {})
      playbackContextRef.current = null
    }
    playbackAnalyserRef.current = null

    setAmplitude(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  // ----------- Amplitude visualizer -----------

  const startAmplitudeTracking = useCallback(() => {
    const analyserData = new Uint8Array(64)

    const update = () => {
      const activeAnalyser = playbackAnalyserRef.current ?? analyserRef.current
      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(analyserData)
        const avg = analyserData.reduce((a, b) => a + b, 0) / analyserData.length / 255
        setAmplitude(avg)
      }
      animFrameRef.current = requestAnimationFrame(update)
    }
    animFrameRef.current = requestAnimationFrame(update)
  }, [])

  // ----------- Audio playback -----------

  const playAudioChunk = useCallback((base64Audio: string) => {
    if (!playbackContextRef.current || playbackContextRef.current.state === "closed") {
      playbackContextRef.current = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE_OUT })
      nextPlayTimeRef.current = playbackContextRef.current.currentTime

      const analyser = playbackContextRef.current.createAnalyser()
      analyser.fftSize = 128
      analyser.connect(playbackContextRef.current.destination)
      playbackAnalyserRef.current = analyser
    }

    const ctx = playbackContextRef.current
    const float32 = base64ToFloat32(base64Audio)
    const audioBuffer = ctx.createBuffer(1, float32.length, AUDIO_SAMPLE_RATE_OUT)
    audioBuffer.copyToChannel(float32 as unknown as Float32Array<ArrayBuffer>, 0)

    const bufferSource = ctx.createBufferSource()
    bufferSource.buffer = audioBuffer

    if (playbackAnalyserRef.current) {
      bufferSource.connect(playbackAnalyserRef.current)
    } else {
      bufferSource.connect(ctx.destination)
    }

    if (nextPlayTimeRef.current < ctx.currentTime) {
      nextPlayTimeRef.current = ctx.currentTime
    }
    bufferSource.start(nextPlayTimeRef.current)
    nextPlayTimeRef.current += audioBuffer.duration
  }, [])

  const stopPlayback = useCallback(() => {
    if (playbackContextRef.current && playbackContextRef.current.state !== "closed") {
      playbackContextRef.current.close().catch(() => {})
      playbackContextRef.current = null
      playbackAnalyserRef.current = null
      nextPlayTimeRef.current = 0
    }
  }, [])

  // ----------- Persist session -----------

  const persistSession = useCallback(async () => {
    const sessionData = sessionDataRef.current
    if (!sessionData) return

    const currentTranscript = transcriptRef.current
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)

    if (currentTranscript.length === 0) return

    try {
      const res = await fetch("/api/voice-chat/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: sessionData.chatId,
          sessionId: sessionData.sessionId,
          transcript: currentTranscript.map((e) => ({
            role: e.role,
            text: e.text,
            timestamp: e.timestamp,
          })),
          durationSeconds,
        }),
      })
      if (!res.ok) {
        console.error("[VoiceChat] Persist failed:", res.status, await res.text().catch(() => ""))
      }
    } catch (err) {
      console.error("[VoiceChat] Persist failed:", err)
    }
  }, [])

  // ----------- Disconnect -----------

  const disconnect = useCallback(async () => {
    await persistSession()
    cleanup()
    setState("disconnected")
  }, [persistSession, cleanup])

  // ----------- Connect -----------

  const connect = useCallback(async (params?: { chatId?: string; projectId?: string }) => {
    setError(null)
    setTranscript([])
    transcriptRef.current = []
    setDuration(0)
    setIsMuted(false)
    setState("connecting")

    try {
      // 1. Get ephemeral token from server
      const tokenRes = await fetch("/api/voice-chat/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: params?.chatId, projectId: params?.projectId }),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({ error: "Verbindung fehlgeschlagen" }))
        throw new Error(err.error || `HTTP ${tokenRes.status}`)
      }

      const tokenData: TokenResponse = await tokenRes.json()
      sessionDataRef.current = {
        sessionId: tokenData.sessionId,
        chatId: tokenData.chatId,
        maxDuration: tokenData.maxDuration,
        projectName: tokenData.projectName,
      }

      // 2. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: AUDIO_SAMPLE_RATE_IN, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      mediaStreamRef.current = stream

      // 3. Set up AudioContext + AudioWorklet for capture
      const audioCtx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE_IN })
      audioContextRef.current = audioCtx

      await audioCtx.audioWorklet.addModule("/audio-recorder-worklet.js")

      const source = audioCtx.createMediaStreamSource(stream)
      sourceRef.current = source

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      analyserRef.current = analyser
      source.connect(analyser)

      const workletNode = new AudioWorkletNode(audioCtx, "audio-recorder-worklet")
      workletNodeRef.current = workletNode
      source.connect(workletNode)

      // 4. Connect to Gemini via SDK with ephemeral token
      const ai = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: { apiVersion: "v1alpha" },
      })

      const session = await ai.live.connect({
        model: tokenData.model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: tokenData.voice },
            },
          },
          systemInstruction: tokenData.systemPrompt,
          tools: [{ googleSearch: {} }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("[VoiceChat] Connected")
          },
          onmessage: (message: LiveServerMessage) => {
            // Log non-audio messages for debugging (dev only)
            if (process.env.NODE_ENV === "development" && !message.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
              console.log("[VoiceChat] Message:", JSON.stringify(message).slice(0, 300))
            }

            const content = message.serverContent

            // Audio output from model
            if (content?.modelTurn?.parts) {
              setState("speaking")
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data) {
                  playAudioChunk(part.inlineData.data)
                }
              }
            }

            // Turn complete
            if (content?.turnComplete) {
              setState("listening")
              setTranscript((prev) => {
                if (prev.length === 0) return prev
                const last = prev[prev.length - 1]
                if (!last.finished) {
                  return [...prev.slice(0, -1), { ...last, finished: true }]
                }
                return prev
              })
            }

            // Barge-in
            if (content?.interrupted) {
              stopPlayback()
              setState("listening")
            }

            // Input transcription (user speech)
            if (content?.inputTranscription?.text) {
              const text = content.inputTranscription.text.trim()
              if (text) {
                setState("listening")
                setTranscript((prev) => {
                  const last = prev[prev.length - 1]
                  if (last && last.role === "user" && !last.finished) {
                    return [...prev.slice(0, -1), { ...last, text: last.text + " " + text }]
                  }
                  return [...prev, { role: "user", text, timestamp: Date.now(), finished: false }]
                })
              }
            }

            // Output transcription (model speech)
            if (content?.outputTranscription?.text) {
              const text = content.outputTranscription.text.trim()
              if (text) {
                setTranscript((prev) => {
                  const last = prev[prev.length - 1]
                  if (last && last.role === "assistant" && !last.finished) {
                    return [...prev.slice(0, -1), { ...last, text: last.text + " " + text }]
                  }
                  return [...prev, { role: "assistant", text, timestamp: Date.now(), finished: false }]
                })
              }
            }

            // GoAway
            if (message.goAway) {
              console.warn("[VoiceChat] Server GoAway, disconnecting")
              disconnect()
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error("[VoiceChat] Error:", e.message, e)
            setError("Verbindung verloren")
            cleanup()
            setState("error")
          },
          onclose: (e: CloseEvent) => {
            console.log("[VoiceChat] Connection closed:", e.code, e.reason)
            if (stateRef.current !== "disconnected" && stateRef.current !== "error") {
              cleanup()
              setState("disconnected")
            }
          },
        },
      })

      sessionRef.current = session
      setState("listening")
      startTimeRef.current = Date.now()

      // 5. Start sending audio from worklet
      workletNode.port.onmessage = (ev) => {
        if (isMutedRef.current) return
        if (!sessionRef.current) return
        const int16Buffer = ev.data.data as ArrayBuffer
        if (!int16Buffer) return

        try {
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: arrayBufferToBase64(int16Buffer),
              mimeType: "audio/pcm;rate=16000",
            },
          })
        } catch {
          // Session may have closed
        }
      }

      // 6. Start duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)

        const maxDuration = sessionDataRef.current?.maxDuration ?? 1800
        if (elapsed >= maxDuration) {
          disconnect()
        }
      }, 1000)

      // 7. Start amplitude tracking
      startAmplitudeTracking()

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler"
      console.error("[VoiceChat] Connect failed:", message, err)
      setError(message)
      cleanup()
      setState("error")
    }
  }, [cleanup, disconnect, playAudioChunk, stopPlayback, startAmplitudeTracking])

  // ----------- Mute / Unmute -----------

  const mute = useCallback(() => setIsMuted(true), [])
  const unmute = useCallback(() => setIsMuted(false), [])

  return {
    state,
    connect,
    disconnect,
    mute,
    unmute,
    isMuted,
    duration,
    transcript,
    error,
    amplitude,
    maxDuration: sessionDataRef.current?.maxDuration ?? 1800,
    projectName: sessionDataRef.current?.projectName ?? null,
  }
}
