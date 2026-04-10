"use client"

import { useMemo, useState } from "react"

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; script-src 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; img-src data: blob: https: ; font-src data: https://fonts.gstatic.com; connect-src https://cdn.tailwindcss.com;">`

function injectCsp(html: string): string {
  // Strip any existing CSP meta tags to prevent override
  const stripped = html.replace(/<meta\s+http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/gi, "")
  const headMatch = stripped.match(/<head(\s[^>]*)?>/i)
  if (headMatch && headMatch.index != null) {
    const insertPos = headMatch.index + headMatch[0].length
    return stripped.slice(0, insertPos) + CSP_META + stripped.slice(insertPos)
  }
  return CSP_META + stripped
}

interface HtmlPreviewProps {
  html: string
}

export function HtmlPreview({ html }: HtmlPreviewProps) {
  const [error, setError] = useState(false)
  const safeSrcDoc = useMemo(() => injectCsp(html), [html])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-900 p-8">
        <p className="text-sm text-neutral-400">
          Vorschau konnte nicht geladen werden.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto bg-neutral-900 p-4">
      <iframe
        srcDoc={safeSrcDoc}
        sandbox="allow-scripts allow-popups"
        className="mx-auto w-full border-0"
        style={{ height: "100%", minHeight: "600px" }}
        title="Preview"
        onError={() => setError(true)}
      />
    </div>
  )
}
