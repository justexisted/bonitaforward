// Lightweight Google Sheets loader using the GViz JSON endpoint.
// Publish your sheet (File → Share → Publish to web), then set VITE_SHEET_ID and optional VITE_SHEET_TAB.

export type SheetRow = Record<string, any>

function parseGvizJson(text: string): { cols: { label: string }[]; rows: { c: { v: any }[] }[] } {
  // Strip the "/*O_o*/\ngoogle.visualization.Query.setResponse(" prefix and trailing ");"
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  const json = text.slice(start, end + 1)
  return JSON.parse(json)
}

function normalizeKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, '_')
}

export async function fetchSheetRows(params?: { sheetId?: string; tabName?: string }): Promise<SheetRow[]> {
  const sheetId = params?.sheetId || (import.meta.env.VITE_SHEET_ID as string)
  const tabName = params?.tabName || (import.meta.env.VITE_SHEET_TAB as string) || 'All Categories'
  if (!sheetId) throw new Error('VITE_SHEET_ID is not set')
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`)
  const text = await res.text()
  const parsed = parseGvizJson(text) as any
  const headers: string[] = parsed.table.cols.map((c: any) => normalizeKey(c.label))
  const rows: SheetRow[] = (parsed.table.rows as any[]).map((r) => {
    const row: SheetRow = {}
    headers.forEach((h, i) => {
      const cell = r.c?.[i]?.v
      row[h] = cell == null ? '' : cell
    })
    return row
  })
  return rows
}

export type SheetProvider = {
  id: string
  name: string
  category: string
  tags: string[]
  rating?: number
  details: {
    phone?: string
    email?: string
    website?: string
    address?: string
    images?: string[]
    badges?: string[]
  }
}

function slugifyCategory(input: string): string {
  const s = input.trim().toLowerCase()
  if (s.includes('real')) return 'real-estate'
  if (s.includes('home')) return 'home-services'
  if (s.includes('health') || s.includes('well')) return 'health-wellness'
  if (s.includes('rest') || s.includes('cafe') || s.includes('caf')) return 'restaurants-cafes'
  if (s.includes('pro')) return 'professional-services'
  return s.replace(/\s+/g, '-')
}

export function mapRowsToProviders(rows: SheetRow[]): SheetProvider[] {
  return rows
    .filter((r) => r.name || r.provider || r.business_name)
    .map((r, idx) => {
      const name = String(r.name || r.provider || r.business_name || `Provider ${idx + 1}`)
      const cat = slugifyCategory(String(r.category || r.cat || ''))
      const rating = r.rating ? Number(r.rating) : undefined
      const tags = String(r.tags || '')
        .split(/[,\|]/)
        .map((s) => s.trim())
        .filter(Boolean)
      const badges = String(r.badges || r.attributes || '')
        .split(/[,\|]/)
        .map((s) => s.trim())
        .filter(Boolean)
      const images = String(r.images || '')
        .split(/[,\|]/)
        .map((s) => s.trim())
        .filter(Boolean)
      return {
        id: String(r.id || `${cat}-${idx}`),
        name,
        category: cat,
        tags,
        rating,
        details: {
          phone: r.phone || r.telephone || '',
          email: r.email || '',
          website: r.website || r.url || '',
          address: r.address || '',
          images,
          badges,
        },
      } as SheetProvider
    })
}

