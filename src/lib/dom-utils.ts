import xss from 'xss';

// Configuration for xss specifically to allow Shiki syntax highlighting
export function sanitizeShikiHtml(html: string): string {
  return xss(html, {
    whiteList: {
      pre: ['class', 'style', 'tabindex'],
      code: ['class', 'style', 'dir'],
      span: ['class', 'style', 'line', 'dir'],
      div: ['class', 'style', 'data-language'],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });
}
