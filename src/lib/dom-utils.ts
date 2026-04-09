import { FilterXSS } from 'xss';

// Configuration specifically tailored for Shiki-generated HTML
// Shiki uses inline styles to colorize code
const SHIKI_OPTIONS = {
  whiteList: {
    pre: ['class', 'style', 'tabindex'],
    code: ['class', 'style'],
    span: ['class', 'style'],
  },
  // Allow inline styles
  css: false,
};

const myxss = new FilterXSS(SHIKI_OPTIONS);

/**
 * Sanitizes HTML string using a custom whitelist-based HTML sanitizer (`xss` library).
 * Secures Shiki-generated HTML while preserving required syntax highlighting styles.
 *
 * @param html The HTML string to sanitize
 * @returns Safe HTML string
 */
export function sanitizeShikiHtml(html: string): string {
  return myxss.process(html);
}
