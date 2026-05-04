"use client"

import { ExternalLink, Clock3, GraduationCap } from "lucide-react"

import { DISCIPLINE_LABELS, LEVEL_LABELS, type LessonTeaser } from "@/lib/ai/lessons"

interface LessonsResultsProps {
  query?: string
  lessons: LessonTeaser[]
}

function LessonCard({ lesson }: { lesson: LessonTeaser }) {
  const disciplineLabel = DISCIPLINE_LABELS[lesson.discipline] ?? lesson.discipline
  const levelLabel = LEVEL_LABELS[lesson.level] ?? lesson.level

  return (
    <a
      href={lesson.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid grid-cols-[140px_1fr] gap-0 rounded-xl overflow-hidden border widget-card hover:brightness-[1.02] dark:hover:brightness-[1.1] transition-all"
    >
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {lesson.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lesson.cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <GraduationCap className="size-6 text-muted-foreground/40" />
        )}
      </div>

      <div className="p-3 min-w-0 flex flex-col justify-center gap-1">
        <p className="text-sm font-medium line-clamp-2 leading-snug">
          {lesson.title}
        </p>
        <p className="text-[11px] text-muted-foreground/90 truncate">
          lernen.diy · Lesson von Rico Loschke
        </p>
        <div className="flex items-center flex-wrap gap-1.5 mt-1">
          <span className="inline-flex items-center rounded-md bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-300 ring-1 ring-inset ring-teal-500/20">
            {disciplineLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Clock3 className="size-2.5" />
            {lesson.duration} Min
          </span>
          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {levelLabel}
          </span>
        </div>
      </div>
    </a>
  )
}

export function LessonsResults({ query, lessons }: LessonsResultsProps) {
  if (lessons.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <ExternalLink className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {lessons.length === 1 ? "Passende Lesson" : `${lessons.length} passende Lessons`}
          {query ? ` zu „${query}“` : ""} auf lernen.diy
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.slug} lesson={lesson} />
        ))}
      </div>
    </div>
  )
}

export function LessonsResultsSkeleton() {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <div className="size-3.5 rounded bg-muted animate-pulse" />
        <div className="h-3 w-40 rounded bg-muted animate-pulse" />
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="grid grid-cols-[140px_1fr] gap-0 rounded-xl overflow-hidden bg-muted/40 border border-border/50"
        >
          <div className="aspect-video bg-muted animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
            <div className="flex gap-1.5 mt-1">
              <div className="h-4 w-16 rounded-md bg-muted animate-pulse" />
              <div className="h-4 w-12 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
