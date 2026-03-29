import { z } from "zod"
import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { getUserSkillById, updateSkill, deleteSkill } from "@/lib/db/queries/skills"
import { parseSkillMarkdown, serializeSkillMarkdown, dbRowToParsedSkill } from "@/lib/ai/skills/parser"
import { features } from "@/config/features"

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,21}$/

interface RouteParams {
  params: Promise<{ skillId: string }>
}

/** GET /api/user/skills/[skillId] — Get a single user skill (raw SKILL.md) */
export async function GET(_req: Request, { params }: RouteParams) {
  if (!features.userSkills.enabled) {
    return Response.json({ error: "User-Skills sind nicht aktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { skillId } = await params
  if (!ID_PATTERN.test(skillId)) {
    return Response.json({ error: "Ungültige Skill-ID" }, { status: 400 })
  }
  const skill = await getUserSkillById(skillId, auth.user.id)
  if (!skill) {
    return Response.json({ error: "Skill nicht gefunden" }, { status: 404 })
  }

  const raw = serializeSkillMarkdown(dbRowToParsedSkill(skill))

  return Response.json({
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    mode: skill.mode,
    isPublic: skill.isPublic,
    raw,
  })
}

const updateSchema = z.object({
  content: z.string().min(10).max(100_000),
})

/** PUT /api/user/skills/[skillId] — Update a user skill from SKILL.md content */
export async function PUT(req: Request, { params }: RouteParams) {
  if (!features.userSkills.enabled) {
    return Response.json({ error: "User-Skills sind nicht aktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { skillId } = await params
  if (!ID_PATTERN.test(skillId)) {
    return Response.json({ error: "Ungültige Skill-ID" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Anfrage" }, { status: 400 })
  }

  const skill = parseSkillMarkdown(parsed.data.content)
  if (!skill) {
    return Response.json(
      { error: "Ungültiges SKILL.md-Format. Pflichtfelder: name, slug, description im Frontmatter." },
      { status: 400 },
    )
  }

  const updated = await updateSkill(skillId, {
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
    // User skills are never public (only admins can publish)
  }, auth.user.id)

  if (!updated) {
    return Response.json({ error: "Skill nicht gefunden" }, { status: 404 })
  }

  return Response.json({
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    mode: updated.mode,
    isPublic: updated.isPublic,
  })
}

/** DELETE /api/user/skills/[skillId] — Delete a user skill */
export async function DELETE(_req: Request, { params }: RouteParams) {
  if (!features.userSkills.enabled) {
    return Response.json({ error: "User-Skills sind nicht aktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { skillId } = await params
  if (!ID_PATTERN.test(skillId)) {
    return Response.json({ error: "Ungültige Skill-ID" }, { status: 400 })
  }
  const deleted = await deleteSkill(skillId, auth.user.id)
  if (!deleted) {
    return Response.json({ error: "Skill nicht gefunden" }, { status: 404 })
  }

  return Response.json({ success: true })
}
