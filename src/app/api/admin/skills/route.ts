import { z } from "zod"
import { requireAdmin } from "@/lib/admin-guard"
import { getAllSkills, upsertSkillBySlug } from "@/lib/db/queries/skills"
import { parseSkillMarkdown } from "@/lib/ai/skills/parser"
import { clearSkillCache } from "@/lib/ai/skills/discovery"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** GET /api/admin/skills — All skills including inactive */
export async function GET() {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const skills = await getAllSkills()
    return Response.json(skills)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

const importSchema = z.object({
  /** Raw SKILL.md content (frontmatter + markdown) */
  content: z.string().min(10).max(100_000),
})

/** POST /api/admin/skills — Import a skill from SKILL.md content */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = importSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 })
    }

    const skill = parseSkillMarkdown(parsed.data.content)
    if (!skill) {
      return Response.json(
        { error: "Ungültiges SKILL.md-Format. Pflichtfelder: name, slug, description im Frontmatter." },
        { status: 400 }
      )
    }

    const result = await upsertSkillBySlug({
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      content: skill.content,
      mode: skill.mode,
      category: skill.category,
      icon: skill.icon,
      fields: skill.fields,
      outputAsArtifact: skill.outputAsArtifact,
      temperature: skill.temperature,
      modelId: skill.modelId,
    })

    clearSkillCache()

    return Response.json({
      id: result.id,
      slug: result.slug,
      name: result.name,
      mode: result.mode,
      isNew: !result.updatedAt || result.createdAt.getTime() === result.updatedAt.getTime(),
    }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
