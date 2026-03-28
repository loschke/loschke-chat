## 2024-03-28 - XSS vulnerability via Shiki HTML rendering
**Vulnerability:** Code snippets rendered through Shiki were directly injected via dangerouslySetInnerHTML without sanitization.
**Learning:** Shiki generates HTML based on the provided code, but user-generated content could theoretically bypass highlighter parsing to inject malicious HTML if not properly sanitized.
**Prevention:** Use a library like DOMPurify or xss to sanitize the HTML output of Shiki before dangerously injecting it into the DOM.
