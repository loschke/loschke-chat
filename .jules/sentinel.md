## 2024-05-24 - Shiki Markdown XSS Vulnerability
**Vulnerability:** Found `dangerouslySetInnerHTML={{ __html: html }}` used to render Shiki highlighted code directly in `src/components/assistant/code-preview.tsx`.
**Learning:** Shiki generates HTML directly from untrusted input (code blocks in markdown), which when rendered via `dangerouslySetInnerHTML` introduces a Cross-Site Scripting (XSS) vulnerability.
**Prevention:** Sanitize Shiki-generated HTML using a whitelist-based HTML sanitizer like DOMPurify or `xss` library, allowing only specific tags and attributes required by Shiki (like `pre`, `code`, `span` with `class` and `style`).
