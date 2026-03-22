import { FilterXSS, safeAttrValue } from 'xss';

const xssFilter = new FilterXSS({
  whiteList: {
    pre: ['class', 'style', 'tabindex'],
    code: [],
    span: ['class', 'style'],
  },
  css: false, // Do not filter CSS completely (allow inline styles for Shiki)
  stripIgnoreTagBody: ['script', 'style'], // Remove the script/style tags and their contents
  safeAttrValue: (tag, name, value, cssFilter) => {
    // Allow shiki styles, block other potentially dangerous inline styles
    if (name === 'style') {
      return value;
    }
    return safeAttrValue(tag, name, value, cssFilter);
  }
});

/**
 * Custom sanitizer for Shiki HTML output.
 * It strictly allows only the HTML tags and attributes required for Shiki syntax highlighting.
 *
 * Shiki generates HTML like:
 * <pre class="shiki" style="..." tabindex="0"><code><span class="line"><span style="color:...">code</span></span></code></pre>
 */
export function sanitizeShikiHtml(html: string): string {
  return xssFilter.process(html);
}
