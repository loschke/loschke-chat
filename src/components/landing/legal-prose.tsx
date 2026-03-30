/**
 * Prose wrapper for legal pages (Impressum, Datenschutz).
 * Uses Tailwind prose-like styles via className to avoid
 * CSS specificity issues with Tailwind v4 Preflight.
 */
export function LegalProse({ children }: { children: React.ReactNode }) {
  return (
    <article className="legal-prose leading-7 text-foreground [&>p]:mb-4 [&>p]:text-[0.95rem] [&_.lead]:text-[1.05rem] [&_.lead]:text-muted-foreground [&_.lead]:mb-10 [&>h1]:text-3xl [&>h1]:font-black [&>h1]:tracking-tight [&>h1]:leading-tight [&>h1]:mb-2 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-3 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-border [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:opacity-80 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&_li]:mb-2 [&_li]:text-[0.95rem] [&_strong]:font-semibold [&>table]:w-full [&>table]:mb-6 [&>table]:text-sm [&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:border-b [&_th]:border-border [&_th]:font-semibold [&_th]:text-muted-foreground [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wide [&_td]:text-left [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border">
      {children}
    </article>
  )
}
