import { requireAdmin } from "@/lib/admin-guard"
import { getAllSkills } from "@/lib/db/queries/skills"
import { serializeSkillMarkdown, dbRowToParsedSkill } from "@/lib/ai/skills/parser"
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
      raw: serializeSkillMarkdown(dbRowToParsedSkill(s)),
    }))

    return Response.json(exported)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
