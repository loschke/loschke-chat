## 2025-03-24 - [Fix XSS in Shiki Syntax Highlighter]
**Vulnerability:** Code injection / XSS vulnerability using dangerouslySetInnerHTML directly with Shiki generated HTML.
**Learning:** Using `dangerouslySetInnerHTML` directly with third party libraries that parse inputs into HTML without explicitly sanitizing the HTML output first can lead to XSS execution, specially if that raw html comes directly from LLMs output.
**Prevention:** A custom whitelist-based HTML sanitizer (`sanitizeShikiHtml`) using the `xss` library was implemented in `src/lib/dom-utils.ts` to secure Shiki-generated HTML while preserving required syntax highlighting styles before pushing to the `dangerouslySetInnerHTML` prop.
