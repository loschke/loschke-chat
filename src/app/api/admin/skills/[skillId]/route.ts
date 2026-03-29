import { requireAdmin } from "@/lib/admin-guard"
import { getSkillById, updateSkill, deleteSkill } from "@/lib/db/queries/skills"
import { getResourceManifest } from "@/lib/db/queries/skill-resources"
import { parseSkillMarkdown, serializeSkillMarkdown, dbRowToParsedSkill } from "@/lib/ai/skills/parser"
import { clearSkillCache } from "@/lib/ai/skills/discovery"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,21}$/

interface RouteParams {
  params: Promise<{ skillId: string }>
}

/** GET /api/admin/skills/[skillId] — Skill as full SKILL.md (frontmatter + content) */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { skillId } = await params
    if (!ID_PATTERN.test(skillId)) {
      return Response.json({ error: "Ungültige Skill-ID" }, { status: 400 })
    }

    const skill = await getSkillById(skillId)
    if (!skill) {
      return Response.json({ error: "Skill nicht gefunden" }, { status: 404 })
    }

    // Serialize back to SKILL.md format
    const markdown = serializeSkillMarkdown(dbRowToParsedSkill(skill))

    // Include resource manifest if any exist
    const resources = await getResourceManifest(skillId)

    return Response.json({ ...skill, raw: markdown, resources })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** PUT /api/admin/skills/[skillId] — Replace skill with full SKILL.md content */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { skillId } = await params
    if (!ID_PATTERN.test(skillId)) {
      return Response.json({ error: "Ungültige Skill-ID" }, { status: 400 })
    }

    const existing = await getSkillById(skillId)
    if (!existing) {
      return Response.json({ error: "Skill nicht gefunden" }, { status: 404 })
    }

    let body: { content?: string }
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
    }

    if (!body.content || typeof body.content !== "string") {
      return Response.json({ error: "Feld 'content' (SKILL.md Inhalt) erforderlich" }, { status: 400 })
    }

    const parsed = parseSkillMarkdown(body.content)
    if (!parsed) {
      return Response.json(
        { error: "Ungültiges SKILL.md-Format. Pflichtfelder: name, slug, description." },
        { status: 400 }
      )
    }

    const updated = await updateSkill(skillId, {
      slug: parsed.slug,
      name: parsed.name,
      description: parsed.description,
      content: parsed.content,
      mode: parsed.mode,
      category: parsed.category ?? null,
      icon: parsed.icon ?? null,
      fields: parsed.fields ?? [],
      outputAsArtifact: parsed.outputAsArtifact,
      temperature: parsed.temperature ?? null,
      modelId: parsed.modelId ?? null,
    })

    clearSkillCache()

    return Response.json(updated)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** PATCH /api/admin/skills/[skillId] — Update individual fields (isActive, sortOrder) */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { skillId } = await params
    if (!ID_PATTERN.test(skillId)) {
      return Response.json({ error: "Ungültige Skill-ID" }, { status: 400 })
    }

    const existing = await getSkillById(skillId)
    if (!existing) {
      return Response.json({ error: "Skill nicht gefunden" }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
    }

    // Only allow specific fields via PATCH
    const allowedFields: Record<string, unknown> = {}
    if (typeof body.isActive === "boolean") allowedFields.isActive = body.isActive
    if (typeof body.sortOrder === "number") allowedFields.sortOrder = body.sortOrder

    if (Object.keys(allowedFields).length === 0) {
      return Response.json({ error: "Keine gültigen Felder zum Aktualisieren" }, { status: 400 })
    }

    const updated = await updateSkill(skillId, allowedFields)
    clearSkillCache()

    return Response.json(updated)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** DELETE /api/admin/skills/[skillId] — Delete a skill */
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { skillId } = await params
    if (!ID_PATTERN.test(skillId)) {
      return Response.json({ error: "Ungültige Skill-ID" }, { status: 400 })
    }

    const deleted = await deleteSkill(skillId)
    if (!deleted) {
      return Response.json({ error: "Skill nicht gefunden" }, { status: 404 })
    }

    clearSkillCache()

    return Response.json({ deleted: true, slug: deleted.slug })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
