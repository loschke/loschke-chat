"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface Item {
  src: string
  alt: string
  caption?: string
}

interface Props {
  items: Item[]
  cols?: 2 | 3
}

export function ScreenshotGrid({ items, cols = 3 }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const close = useCallback(() => setActiveIndex(null), [])

  const step = useCallback(
    (dir: 1 | -1) => {
      setActiveIndex((i) => {
        if (i === null) return i
        return (i + dir + items.length) % items.length
      })
    },
    [items.length],
  )

  useEffect(() => {
    if (activeIndex === null) return
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      else if (e.key === "ArrowLeft") step(-1)
      else if (e.key === "ArrowRight") step(1)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [activeIndex, close, step])

  const gridCols =
    cols === 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

  const activeItem = activeIndex !== null ? items[activeIndex] : null

  return (
    <>
      <div className={`grid gap-5 md:gap-6 ${gridCols}`}>
        {items.map((item, i) => (
          <figure key={item.src} className="m-0">
            <button
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`${item.alt} vergrößern`}
              className="group block w-full overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] cursor-zoom-in transition-all duration-300 hover:border-white/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.alt}
                width={1440}
                height={900}
                loading="lazy"
                className="block w-full h-auto transition-transform duration-[400ms] group-hover:scale-[1.02]"
              />
            </button>
            {item.caption && (
              <figcaption className="mt-3 text-sm font-serif italic text-white/50 leading-[1.4]">
                {item.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {activeItem && typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Screenshot vergrößert"
            onClick={(e) => {
              if (e.target === e.currentTarget) close()
            }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Schließen"
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Vorheriges Bild"
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Nächstes Bild"
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <figure className="m-0 flex flex-col items-center gap-4 max-w-[1400px] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeItem.src}
                alt={activeItem.alt}
                className="block max-h-[80vh] w-auto max-w-full h-auto object-contain rounded-md shadow-2xl"
              />
              {activeItem.caption && (
                <figcaption className="text-sm sm:text-base font-serif italic text-white/80 text-center max-w-[800px] leading-[1.5]">
                  {activeItem.caption}
                </figcaption>
              )}
            </figure>
          </div>,
          document.body,
        )}
    </>
  )
}
