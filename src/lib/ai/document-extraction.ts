/**
 * Server-side document extraction for LLM processing.
 * Converts DOCX, XLSX, PPTX, HTML files to text/markdown
 * so they can be understood by LLMs that don't support these formats natively.
 *
 * PDF is handled separately: Anthropic supports PDFs natively,
 * other providers get text extraction via pdf-parse.
 */

/** Maximum extracted content length to prevent token overflow */
const MAX_EXTRACTED_LENGTH = 100_000

/** Document MIME types that support text extraction */
export const EXTRACTABLE_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/html", "text/plain", "text/markdown",
])

/**
 * Extract text content from a document buffer.
 * Returns markdown/text representation of the document.
 */
export async function extractDocumentContent(
  buffer: Buffer,
  mediaType: string,
  filename: string,
): Promise<string> {
  let content: string

  switch (mediaType) {
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      content = await extractDocx(buffer)
      break
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      content = await extractXlsx(buffer)
      break
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      content = await extractPptx(buffer)
      break
    case "text/html":
      content = await extractHtml(buffer)
      break
    case "text/plain":
    case "text/markdown":
      content = buffer.toString("utf-8")
      break
    case "application/pdf":
      content = await extractPdf(buffer)
      break
    default:
      content = `[Dateityp ${mediaType} wird nicht unterstützt]`
  }

  // Truncate if needed
  if (content.length > MAX_EXTRACTED_LENGTH) {
    content = content.slice(0, MAX_EXTRACTED_LENGTH) + `\n\n[... Inhalt gekürzt, ${content.length} Zeichen gesamt]`
  }

  return `[Inhalt aus: ${filename}]\n\n${content}`
}

async function htmlToMarkdown(html: string): Promise<string> {
  const TurndownService = (await import("turndown")).default
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  })
  return turndown.turndown(html)
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth")
  const result = await mammoth.convertToHtml({ buffer })
  return htmlToMarkdown(result.value)
}

async function extractXlsx(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, { type: "buffer" })

  const sheets: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    // Convert to array of arrays
    const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    if (data.length === 0) continue

    // Build markdown table
    const header = data[0] as unknown[]
    const headerRow = `| ${header.map((h) => String(h ?? "")).join(" | ")} |`
    const separatorRow = `| ${header.map(() => "---").join(" | ")} |`

    const bodyRows = data.slice(1).map(
      (row) => `| ${(row as unknown[]).map((cell) => String(cell ?? "")).join(" | ")} |`
    )

    sheets.push(`### ${sheetName}\n\n${headerRow}\n${separatorRow}\n${bodyRows.join("\n")}`)
  }

  return sheets.join("\n\n")
}

async function extractPptx(buffer: Buffer): Promise<string> {
  // PPTX files are ZIP archives containing XML slides
  // Use xlsx to read the basic structure (it can parse ZIP/Office files)
  // For a basic approach, we extract text from the XML content
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, { type: "buffer" })

  const slides: string[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const text = XLSX.utils.sheet_to_txt(sheet)
    if (text.trim()) {
      slides.push(`### ${sheetName}\n\n${text}`)
    }
  }

  return slides.length > 0
    ? slides.join("\n\n")
    : "[Kein Textinhalt in der Präsentation gefunden]"
}

async function extractHtml(buffer: Buffer): Promise<string> {
  const html = buffer.toString("utf-8")
  const cheerio = await import("cheerio")

  const $ = cheerio.load(html)
  $("script, style, noscript").remove()

  const bodyHtml = $("body").html() ?? $.html()
  return htmlToMarkdown(bodyHtml)
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // unpdf: serverless-optimized PDF.js build, no worker threads needed
  const { extractText, getDocumentProxy } = await import("unpdf")
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return typeof text === "string" ? text : (text as string[]).join("\n\n")
}
