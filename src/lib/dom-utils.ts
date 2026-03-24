import xss from "xss"

/**
 * Custom whitelist-based HTML sanitizer using the `xss` library,
 * specifically configured to secure Shiki-generated HTML while
 * preserving required syntax highlighting styles.
 */
export function sanitizeShikiHtml(html: string): string {
  return xss(html, {
    whiteList: {
      pre: ["class", "style", "tabindex"],
      code: ["class", "style", "dir"],
      span: ["class", "style", "line", "data-line"],
    },
    css: {
      whiteList: {
        color: true,
        "background-color": true,
        "font-style": true,
        "font-weight": true,
        "text-decoration": true,
      },
    },
    stripIgnoreTag: true, // completely strip tags not in whitelist
    stripIgnoreTagBody: ["script", "style"], // remove script and style content
  })
}
