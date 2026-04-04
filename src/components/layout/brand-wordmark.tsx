import { brand } from "@/config/brand"
import type { BrandId } from "@/config/brand"

interface BrandWordmarkProps {
  variant?: "full" | "signet"
  className?: string
}

export function BrandWordmark({ variant = "full", className }: BrandWordmarkProps) {
  if (variant === "signet") {
    return <Signet brandId={brand.id} className={className} />
  }
  return <Wordmark brandId={brand.id} className={className} />
}

function Wordmark({ brandId, className }: { brandId: BrandId; className?: string }) {
  switch (brandId) {
    case "lernen":
      return (
        <span className={`font-serif text-lg tracking-tight ${className ?? ""}`}>
          lernen<span className="italic text-primary">.diy</span>
        </span>
      )
    case "unlearn":
      return (
        <span className={`font-serif text-lg tracking-tight ${className ?? ""}`}>
          <span className="italic">unlearn</span><span className="text-primary">.how</span>
        </span>
      )
    case "loschke":
      return (
        <span className={`font-sans text-lg font-black tracking-tight ${className ?? ""}`}>
          RL<span className="text-primary">.</span>
        </span>
      )
    case "build":
      return (
        <span className={`font-serif text-lg tracking-tight ${className ?? ""}`}>
          build<span className="italic text-primary">.jetzt</span>
        </span>
      )
    case "queo":
      return (
        <span className={`font-sans text-lg font-black tracking-tight ${className ?? ""}`}>
          queo<span className="text-primary">.</span>
        </span>
      )
    case "queonext":
      return (
        <span className={`font-sans text-lg font-black tracking-tight ${className ?? ""}`}>
          queonext<span className="text-primary">.</span>
        </span>
      )
    case "prototype":
      return (
        <span className={`font-sans text-lg font-semibold tracking-tight ${className ?? ""}`}>
          Prototype<span className="text-primary">.</span>
        </span>
      )
    case "aok":
      return (
        <span className={`font-sans text-lg font-black tracking-tight text-primary ${className ?? ""}`}>
          AOK
        </span>
      )
  }
}

function Signet({ brandId, className }: { brandId: BrandId; className?: string }) {
  switch (brandId) {
    case "lernen":
      return (
        <span className={`font-serif text-base leading-none ${className ?? ""}`}>
          l<span className="italic text-primary">.d</span>
        </span>
      )
    case "unlearn":
      return (
        <span className={`font-serif text-base leading-none ${className ?? ""}`}>
          <span className="italic">u</span><span className="text-primary">.h</span>
        </span>
      )
    case "loschke":
      return (
        <span className={`font-sans text-base font-black leading-none ${className ?? ""}`}>
          RL<span className="text-primary">.</span>
        </span>
      )
    case "build":
      return (
        <span className={`font-serif text-base leading-none ${className ?? ""}`}>
          bld<span className="italic text-primary">.</span>
        </span>
      )
    case "queo":
      return (
        <span className={`font-sans text-base font-black leading-none ${className ?? ""}`}>
          q<span className="text-primary">.</span>
        </span>
      )
    case "queonext":
      return (
        <span className={`font-sans text-base font-black leading-none ${className ?? ""}`}>
          qn<span className="text-primary">.</span>
        </span>
      )
    case "prototype":
      return (
        <span className={`font-sans text-base font-semibold leading-none ${className ?? ""}`}>
          P<span className="text-primary">.</span>
        </span>
      )
    case "aok":
      return (
        <span className={`font-sans text-base font-black leading-none text-primary ${className ?? ""}`}>
          AOK
        </span>
      )
  }
}
