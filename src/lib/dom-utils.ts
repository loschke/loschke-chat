import { FilterXSS } from "xss"

const shikiXss = new FilterXSS({
  whiteList: {
    pre: ["class", "style", "tabindex"],
    code: ["class", "style", "dir"],
    span: ["class", "style", "line", "data-line"],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
})

export function sanitizeShikiHtml(html: string): string {
  return shikiXss.process(html)
}
