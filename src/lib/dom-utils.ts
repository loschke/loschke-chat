import xss from "xss"

/**
 * A custom whitelist-based HTML sanitizer specifically configured for
 * Shiki-generated syntax highlighting HTML.
 *
 * It allows elements like <pre>, <code>, and <span>, as well as specific
 * inline styles required for syntax highlighting (e.g., color, background-color,
 * font-weight, font-style) while blocking everything else (like <script>).
 */
export function sanitizeShikiHtml(html: string): string {
  const customXss = new xss.FilterXSS({
    whiteList: {
      pre: ["class", "style", "tabindex"],
      code: ["class", "style", "dir"],
      span: ["class", "style"],
    },
    css: {
      whiteList: {
        color: true,
        "background-color": true,
        "font-weight": true,
        "font-style": true,
        "text-decoration": true,
      },
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  })

  return customXss.process(html)
}
