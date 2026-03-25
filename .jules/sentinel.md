## 2025-03-25 - Secure HTML Sanitization for Shiki Highlighted Code
**Vulnerability:** XSS vulnerability where Shiki-generated HTML was rendered using `dangerouslySetInnerHTML` directly without sanitization in `CodePreview`.
**Learning:** `dangerouslySetInnerHTML` passes raw HTML without stripping injected scripts, making any user-provided code previewable string a potential XSS vector.
**Prevention:** Implement a whitelist-based HTML sanitizer (`sanitizeShikiHtml`) using `xss` library to strip all potentially unsafe tags while maintaining syntax highlighting tags (e.g., `pre`, `code`, `span`) with style, class, and dir attributes. Always wrap string outputs passed into `dangerouslySetInnerHTML` in sanitization utilities.
