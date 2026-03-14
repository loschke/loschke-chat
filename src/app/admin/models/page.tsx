import { getAllModels } from "@/lib/db/queries/models"
import { ModelsAdmin } from "@/components/admin/models-admin"

export const dynamic = "force-dynamic"

export default async function AdminModelsPage() {
  let models: Awaited<ReturnType<typeof getAllModels>> = []
  try {
    models = await getAllModels()
  } catch {
    // Table may not exist yet — show empty list
  }

  return <ModelsAdmin initialModels={models} />
}
