export type SheetProvider = {
  id: string
  name: string
  category: string
  tags: string[]
  rating?: number
  details: {
    badges?: string[]
  }
}

type SheetRow = Record<string, unknown>

export async function fetchSheetRows(): Promise<SheetRow[]> {
  // Stub: no Google Sheets configured; return empty to fall back to defaults/Supabase
  return []
}

export function mapRowsToProviders(_rows: SheetRow[]): SheetProvider[] {
  // Stub mapping: no-op until Google Sheets integration is added
  return []
}



