import { requireAdmin } from "@/lib/admin-guard"
import { getAllSkills } from "@/lib/db/queries/skills"
import { serializeSkillMarkdown } from "@/lib/ai/skills/parser"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** GET /api/admin/export/skills — Bulk export all skills as JSON (with raw SKILL.md per entry) */
export async function GET() {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const skills = await getAllSkills()
    const exported = skills.map((s) => ({
      ...s,
      raw: serializeSkillMarkdown({
        slug: s.slug,
        name: s.name,
        description: s.description,
        content: s.content,
        mode: s.mode as "skill" | "quicktask",
        category: s.category ?? undefined,
        icon: s.icon ?? undefined,
        fields: (s.fields as Array<{ key: string; label: string; type: "text" | "textarea" | "select"; required?: boolean; placeholder?: string; options?: string[] }>) ?? undefined,
        outputAsArtifact: s.outputAsArtifact,
        temperature: (s.temperature as number | null) ?? undefined,
        modelId: s.modelId ?? undefined,
      }),
    }))

    return Response.json(exported)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
