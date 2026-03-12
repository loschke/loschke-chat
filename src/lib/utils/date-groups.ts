interface Dated {
  updatedAt: string
}

interface DateGroup<T> {
  label: string
  items: T[]
}

export function groupChatsByDate<T extends Dated>(items: T[]): DateGroup<T>[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000)

  const buckets: { label: string; items: T[] }[] = [
    { label: "Heute", items: [] },
    { label: "Gestern", items: [] },
    { label: "Letzte 7 Tage", items: [] },
    { label: "Letzte 30 Tage", items: [] },
    { label: "Älter", items: [] },
  ]

  for (const item of items) {
    const date = new Date(item.updatedAt)
    if (date >= today) {
      buckets[0].items.push(item)
    } else if (date >= yesterday) {
      buckets[1].items.push(item)
    } else if (date >= sevenDaysAgo) {
      buckets[2].items.push(item)
    } else if (date >= thirtyDaysAgo) {
      buckets[3].items.push(item)
    } else {
      buckets[4].items.push(item)
    }
  }

  return buckets.filter((b) => b.items.length > 0)
}
