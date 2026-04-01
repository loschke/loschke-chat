import xss from "xss"

/**
 * A custom whitelist-based HTML sanitizer specifically configured for Shiki-generated HTML.
 * This ensures that dynamically highlighted code blocks are safe from XSS while
 * preserving the required structure and syntax highlighting styles.
 *
 * It allows elements like `pre`, `code`, and `span`, and their necessary attributes
 * (like `class` and `style`), which Shiki uses for applying colors.
 */
export function sanitizeShikiHtml(html: string): string {
  return xss(html, {
    whiteList: {
      pre: ["class", "style", "tabindex"],
      code: ["class", "style", "dir"],
      span: ["class", "style", "line", "data-line"],
    },
    stripIgnoreTag: true,
    css: {
      whiteList: {
        color: true,
        "background-color": true,
        "font-style": true,
        "font-weight": true,
        "text-decoration": true,
      },
    },
  })
}
