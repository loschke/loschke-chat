import xss from "xss";

// Options specific for Shiki output
const shikiXssOptions = {
  whiteList: {
    pre: ["class", "style", "tabindex"],
    code: ["class", "style", "dir"],
    span: ["class", "style", "line", "dir"],
  },
  stripIgnoreTagBody: true,
  css: {
    whiteList: {
      color: true,
      "background-color": true,
      "font-weight": true,
      "font-style": true,
      "text-decoration": true,
    },
  },
};

const shikiXss = new xss.FilterXSS(shikiXssOptions);

/**
 * Sanitizes HTML output from Shiki to prevent XSS vulnerabilities
 * while preserving required syntax highlighting styles and structure.
 */
export function sanitizeShikiHtml(html: string): string {
  return shikiXss.process(html);
}
