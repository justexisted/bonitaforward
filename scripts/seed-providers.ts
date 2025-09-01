/*
  Usage:
    - Set env:
        SUPABASE_URL=...            (project URL)
        SUPABASE_SERVICE_ROLE=...   (service_role key)
        SHEET_ID=...                (Google Sheet ID)
        SHEET_TAB=All Categories    (optional)
    - Run: npx tsx scripts/seed-providers.ts
*/
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function normalizeKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, '_')
}

async function fetchSheetRows(sheetId: string, tabName: string): Promise<Record<string, any>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`)
  const text = await res.text()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  const json = JSON.parse(text.slice(start, end + 1))
  let headers: string[] = json.table.cols.map((c: any) => normalizeKey(c.label))
  let dataRows: any[] = json.table.rows
  // If labels are empty, derive headers from first row values and drop it from data
  const allEmpty = headers.every((h: string) => !h)
  if (allEmpty && json.table.rows.length > 0) {
    headers = json.table.rows[0].c.map((cell: any, idx: number) => {
      const v = cell?.v
      const key = v != null && String(v).trim() !== '' ? normalizeKey(String(v)) : `col_${idx + 1}`
      return key
    })
    dataRows = json.table.rows.slice(1)
  }
  // If most headers are generic (col_*) and first data row looks like header labels, promote it to headers
  const genericCount = headers.filter((h) => h?.startsWith('col_')).length
  if (dataRows.length > 0 && genericCount >= Math.max(2, Math.floor(headers.length / 2))) {
    const candidate = dataRows[0]
    const candidateHeaders = (candidate?.c || []).map((cell: any, idx: number) => {
      const v = cell?.v
      const key = v != null && String(v).trim() !== '' ? normalizeKey(String(v)) : headers[idx] || `col_${idx + 1}`
      return key
    })
    // Heuristic: if at least 2 candidate header cells are non-generic words, assume header row
    const nonGeneric = candidateHeaders.filter((k) => k && !k.startsWith('col_')).length
    if (nonGeneric >= 2) {
      headers = candidateHeaders
      dataRows = dataRows.slice(1)
    }
  }
  const rows = dataRows.map((r: any) => {
    const row: Record<string, any> = {}
    headers.forEach((h, i) => { row[h] = r.c?.[i]?.v ?? '' })
    return row
  })
  return rows
}

function toCategoryKey(input: string): string {
  const s = (input || '').toString().trim().toLowerCase()
  if (s.includes('real')) return 'real-estate'
  if (s.includes('home')) return 'home-services'
  if (s.includes('health') || s.includes('well')) return 'health-wellness'
  if (s.includes('rest') || s.includes('cafe') || s.includes('caf')) return 'restaurants-cafes'
  if (s.includes('pro')) return 'professional-services'
  return s.replace(/\s+/g, '-')
}

async function main() {
  // Allow fallback to VITE_* for convenience (never expose service role in VITE_*)
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!SUPABASE_URL) throw new Error('Missing env SUPABASE_URL (or VITE_SUPABASE_URL)')
  const SUPABASE_SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE')
  const SHEET_ID = process.env.SHEET_ID || process.env.VITE_SHEET_ID
  if (!SHEET_ID) throw new Error('Missing env SHEET_ID (or VITE_SHEET_ID)')
  // CLI override: --tab "Sheet2"
  const argTab = (() => {
    const idx = process.argv.indexOf('--tab')
    if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]
    return undefined
  })()
  const SHEET_TAB = argTab || process.env.SHEET_TAB || process.env.VITE_SHEET_TAB || 'All Categories'

  console.log('Using sheet:', { SHEET_ID, SHEET_TAB })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

  // Ensure categories exist
  const categories = [
    { key: 'real-estate', name: 'Real Estate' },
    { key: 'home-services', name: 'Home Services' },
    { key: 'health-wellness', name: 'Health & Wellness' },
    { key: 'restaurants-cafes', name: 'Restaurants & Cafés' },
    { key: 'professional-services', name: 'Professional Services' },
  ]
  for (const c of categories) {
    await sb.from('categories').upsert([{ key: c.key, name: c.name }])
  }

  const rows = await fetchSheetRows(SHEET_ID, SHEET_TAB)
  if (!rows || rows.length === 0) {
    console.log('No rows returned from sheet. Is it published to web? Correct SHEET_ID/SHEET_TAB?')
  } else {
    console.log('Sheet rows:', rows.length)
    console.log('Detected headers:', Object.keys(rows[0] || {}))
  }

  const keys = Object.keys(rows[0] || {})
  function findField(candidateNames: string[], fallback?: string): string | undefined {
    for (const cand of candidateNames) {
      if (keys.includes(cand)) return cand
      const fuzzy = keys.find((k) => k === cand || k.includes(cand))
      if (fuzzy) return fuzzy
    }
    return fallback
  }

  const nameKey = findField(['name','business_name','company','company_name','provider','business'])
  const categoryKey = findField(['category_key','category','cat','type'])
  const tagsKey = findField(['tags','labels','keywords'])
  const badgesKey = findField(['badges','attributes','highlights'])
  const ratingKey = findField(['rating','score','stars'])
  const phoneKey = findField(['phone','telephone','tel'])
  const emailKey = findField(['email','contact_email'])
  const websiteKey = findField(['website','url','link'])
  const addressKey = findField(['address','location'])
  const imagesKey = findField(['images','photos','image_urls'])
  const contactForKey = findField(['contact_for','need'])
  const userTimelineKey = findField(['user_timeline','timeline','when','how_soon','urgency_to_start'])
  const impliedBudgetKey = findField(['implied_budget','budget','price'])
  const bedroomsKey = findField(['bedrooms','beds'])
  const serviceTypeKey = findField(['service_type','service','type'])
  const serviceUrgencyKey = findField(['service_urgency','urgency','how_soon','urgency_to_start'])
  const propertyTypeKey = findField(['property_type','property','home_type'])
  const primaryGoalKey = findField(['primary_goal','goal'])
  const paymentModelKey = findField(['payment_model','payment','model'])
  const cuisineKey = findField(['cuisine'])
  const occasionKey = findField(['occasion'])
  const priceRangeKey = findField(['implied_price_range','price_range','price'])
  const serviceOptionsKey = findField(['service_options','service_option','mode','service_mode'])
  const professionalServiceTypeKey = findField(['service_type'])
  const professionalPrimaryFocusKey = findField(['primary_focus','focus'])
  const professionalTargetClientKey = findField(['target_client','client'])
  const professionalImpliedCostKey = findField(['implied_cost','cost'])
  console.log('Mapping using:', { nameKey, categoryKey, tagsKey, badgesKey, ratingKey, contactForKey, userTimelineKey, impliedBudgetKey, bedroomsKey, serviceTypeKey, serviceUrgencyKey, propertyTypeKey, primaryGoalKey, paymentModelKey, cuisineKey, occasionKey, priceRangeKey, serviceOptionsKey, professionalServiceTypeKey, professionalPrimaryFocusKey, professionalTargetClientKey, professionalImpliedCostKey })

  type UpsertProvider = {
    name: string
    category_key: string
    tags?: string[]
    badges?: string[]
    rating?: number | null
    phone?: string | null
    email?: string | null
    website?: string | null
    address?: string | null
    images?: string[]
    published?: boolean
  }

  let batch: UpsertProvider[] = []
  if (nameKey) {
    batch = rows
      .filter((r) => r[nameKey as string])
      .map((r) => {
        const name = String(r[nameKey as string])
        // If this looks like the Real Estate sheet (Sheet1), force category to real-estate
        const rawCategory = categoryKey ? String(r[categoryKey]) : ''
        let category_key = toCategoryKey(rawCategory)
        const tabLc = (SHEET_TAB || '').toLowerCase()
        if (tabLc === 'sheet1' || keys.includes('company_name')) category_key = 'real-estate'
        if (tabLc === 'sheet2' || keys.includes('service_type')) category_key = 'home-services'
        if (tabLc === 'sheet3' || keys.includes('primary_goal')) category_key = 'health-wellness'
        if (tabLc === 'sheet4' || keys.includes('cuisine')) category_key = 'restaurants-cafes'
        if (tabLc === 'sheet5' || keys.includes('target_client')) category_key = 'professional-services'
        // Build tags from funnel-aligned columns if present
        const tagSet: string[] = []
        // Real Estate mapping
        if (category_key === 'real-estate' && contactForKey) {
          const needRaw = String(r[contactForKey] || '').toLowerCase()
          if (needRaw.includes('buy')) tagSet.push('buy')
          else if (needRaw.includes('sell')) tagSet.push('sell')
          else if (needRaw.includes('rent')) tagSet.push('rent')
        }
        if (category_key === 'real-estate' && userTimelineKey) {
          const t = String(r[userTimelineKey] || '').toLowerCase()
          if (/(^|\b)(0-?3|0–3|this week|this_week)/.test(t)) tagSet.push('0-3','this-week')
          else if (/(^|\b)(3-?6|3–6|this month|this_month)/.test(t)) tagSet.push('3-6','this-month')
          else if (/(60\+|6\+|later|flex)/.test(t)) tagSet.push('6+','later')
          else if (/(now)/.test(t)) tagSet.push('now')
        }
        if (category_key === 'real-estate' && impliedBudgetKey) {
          const b = String(r[impliedBudgetKey] || '').toLowerCase()
          if (/(\$\$\$|high|1\.2m\+|1200\+|1\.2m)/.test(b)) tagSet.push('high')
          else if (/(\$\$|mid|750-1200|750k)/.test(b)) tagSet.push('mid')
          else if (/(\$|entry|under|sub750|low)/.test(b)) tagSet.push('entry','low')
        }
        if (category_key === 'real-estate' && bedroomsKey) {
          const beds = String(r[bedroomsKey] || '').toLowerCase()
          if (/4|4\+/.test(beds)) tagSet.push('4+')
          else if (/3|3\+/.test(beds)) tagSet.push('3')
          else if (/2|2\+/.test(beds)) tagSet.push('2')
          else if (/1/.test(beds)) tagSet.push('1')
        }
        // Home Services mapping
        if (category_key === 'home-services' && serviceTypeKey) {
          const st = String(r[serviceTypeKey] || '').toLowerCase()
          if (/landscap|yard|lawn/.test(st)) tagSet.push('landscaping')
          if (/solar/.test(st)) tagSet.push('solar')
          if (/clean/.test(st)) tagSet.push('cleaning')
          if (/remodel|reno/.test(st)) tagSet.push('remodeling')
        }
        if (category_key === 'home-services' && serviceUrgencyKey) {
          const u = String(r[serviceUrgencyKey] || '').toLowerCase()
          if (/asap|now|immediate/.test(u)) tagSet.push('asap')
          else if (/month/.test(u)) tagSet.push('this-month')
          else tagSet.push('flexible')
        }
        if (category_key === 'home-services' && propertyTypeKey) {
          const p = String(r[propertyTypeKey] || '').toLowerCase()
          if (/house|single/.test(p)) tagSet.push('house')
          else if (/condo|apartment|apt|town/.test(p)) tagSet.push('condo')
          else tagSet.push('other')
        }
        if (category_key === 'home-services' && impliedBudgetKey) {
          const b2 = String(r[impliedBudgetKey] || '').toLowerCase()
          if (/(\$\$\$|high|premium)/.test(b2)) tagSet.push('high')
          else if (/(\$\$|mid|medium)/.test(b2)) tagSet.push('med')
          else tagSet.push('low')
        }

        // Health & Wellness mapping
        if (category_key === 'health-wellness') {
          if (serviceTypeKey) {
            const t = String(r[serviceTypeKey] || '').toLowerCase()
            if (/chiro/.test(t)) tagSet.push('chiro')
            if (/(^|\b)gym\b|fitness/.test(t)) tagSet.push('gym')
            if (/pilates|yoga/.test(t)) { tagSet.push('gym', 'pilates-yoga') }
            if (/salon|hair|nail/.test(t)) tagSet.push('salon')
            if (/med\s*spa|medspa|aesthetic/.test(t)) tagSet.push('medspa')
            if (/general\s*(health|healthcare)/.test(t)) tagSet.push('general-healthcare')
            if (/naturopath/.test(t)) tagSet.push('naturopathic')
            if (/dental|dentist/.test(t)) tagSet.push('dental')
            if (/physical\s*therapy|physio/.test(t)) tagSet.push('physical-therapy')
            if (/mental\s*health|therapy|counsel/.test(t)) tagSet.push('mental-health')
          }
          if (primaryGoalKey) {
            const g = String(r[primaryGoalKey] || '').toLowerCase()
            if (/relief|pain/.test(g)) tagSet.push('relief')
            if (/fitness|strength|weight/.test(g)) tagSet.push('fitness')
            if (/beauty|skin|glow/.test(g)) tagSet.push('beauty')
            if (/wellness|general\s*health/.test(g)) tagSet.push('wellness')
          }
          if (userTimelineKey || serviceUrgencyKey) {
            const u = String(r[userTimelineKey || serviceUrgencyKey] || '').toLowerCase()
            if (/week|now|asap/.test(u)) tagSet.push('this-week')
            else if (/month/.test(u)) tagSet.push('this-month')
            else if (/appointment/.test(u)) tagSet.push('later', 'by-appointment')
            else tagSet.push('later')
          }
          if (paymentModelKey) {
            const pm = String(r[paymentModelKey] || '').toLowerCase()
            if (/both/.test(pm)) tagSet.push('membership','one-off')
            else if (/member|subscription|monthly/.test(pm)) tagSet.push('membership')
            else tagSet.push('one-off')
          }
        }

        // Restaurants & Cafés mapping
        if (category_key === 'restaurants-cafes') {
          if (cuisineKey) {
            const c = String(r[cuisineKey] || '').toLowerCase()
            if (/mexican/.test(c)) tagSet.push('mexican')
            if (/asian/.test(c)) tagSet.push('asian')
            if (/american/.test(c)) tagSet.push('american')
            if (/cafe|caf\u00e9|juice|healthy/.test(c)) tagSet.push('cafes')
            if (/pizza|italian/.test(c)) tagSet.push('pizza-italian')
            if (/seafood/.test(c)) tagSet.push('seafood')
          }
          if (occasionKey) {
            const o = String(r[occasionKey] || '').toLowerCase()
            if (/casual|caual/.test(o)) tagSet.push('casual')
            if (/family/.test(o)) tagSet.push('family')
            if (/date/.test(o)) tagSet.push('date')
          }
          if (priceRangeKey) {
            const pr = String(r[priceRangeKey] || '').trim()
            if (pr === '$') tagSet.push('low')
            else if (pr === '$$') tagSet.push('med')
            else if (pr === '$$$') tagSet.push('high')
          }
          if (serviceOptionsKey) {
            const so = String(r[serviceOptionsKey] || '').toLowerCase()
            if (/take\s?-?out|to\s?go/.test(so)) tagSet.push('takeout')
            if (/dine\s?-?in/.test(so)) tagSet.push('dine')
            if (/both/.test(so)) { tagSet.push('dine','takeout') }
          }
        }

        // Professional Services mapping
        if (category_key === 'professional-services') {
          if (professionalServiceTypeKey) {
            const st = String(r[professionalServiceTypeKey] || '').toLowerCase()
            if (/tax|account/.test(st)) tagSet.push('accountant')
            if (/financial|wealth/.test(st)) tagSet.push('financial')
            if (/legal|attorney|law/.test(st)) tagSet.push('attorney')
            if (/businessconsult/.test(st)) tagSet.push('consultant')
          }
          if (professionalPrimaryFocusKey) {
            const pf = String(r[professionalPrimaryFocusKey] || '').toLowerCase()
            if (/tax\s*prep/.test(pf)) tagSet.push('tax-prep')
            if (/retirement\/?estates|retirement|estates/.test(pf)) tagSet.push('retirement-estates')
            if (/investment\s*strategy/.test(pf)) tagSet.push('investment-strategy')
            if (/retirement\/?portfolio|portfolio/.test(pf)) tagSet.push('retirement-portfolio')
            if (/estate\s*planning/.test(pf)) tagSet.push('estate-planning')
            if (/family\s*law/.test(pf)) tagSet.push('family-law')
            if (/general/.test(pf)) tagSet.push('general')
          }
          if (professionalTargetClientKey) {
            const tc = String(r[professionalTargetClientKey] || '').toLowerCase()
            if (/individual/.test(tc)) tagSet.push('individual')
            if (/business/.test(tc)) tagSet.push('business')
            if (/both/.test(tc)) tagSet.push('individual','business')
          }
          if (professionalImpliedCostKey) {
            const ic = String(r[professionalImpliedCostKey] || '').toLowerCase()
            if (/premium/.test(ic)) tagSet.push('high')
            else tagSet.push('med')
          }
        }
        const tags = String(tagsKey ? r[tagsKey] : '')
          .split(/[\,\|]/).map((s) => s.trim()).filter(Boolean)
        const badges = String(badgesKey ? r[badgesKey] : '')
          .split(/[\,\|]/).map((s) => s.trim()).filter(Boolean)
        const images = String(imagesKey ? r[imagesKey] : '')
          .split(/[\,\|]/).map((s) => s.trim()).filter(Boolean)
        const rating = ratingKey && r[ratingKey] ? Number(r[ratingKey]) : null
        return {
          name,
          category_key,
          tags: [...new Set([...(tags || []), ...tagSet])],
          badges,
          rating,
          phone: (phoneKey ? r[phoneKey] : null) || null,
          email: (emailKey ? r[emailKey] : null) || null,
          website: (websiteKey ? r[websiteKey] : null) || null,
          address: (addressKey ? r[addressKey] : null) || null,
          images,
          published: true,
        }
      })
  } else {
    console.log('No explicit name column detected; using wide-form fallback by headers as categories')
    const allowed = new Set([
      'real-estate',
      'home-services',
      'health-wellness',
      'restaurants-cafes',
      'professional-services',
    ])
    for (const header of keys) {
      const catKey = toCategoryKey(header)
      if (!catKey || !allowed.has(catKey)) continue
      for (const r of rows) {
        const v = r[header]
        if (v != null && String(v).trim() !== '') {
          batch.push({ name: String(v).trim(), category_key: catKey, published: true })
        }
      }
    }
  }

  console.log(`Upserting ${batch.length} providers…`)
  // Chunk to avoid payload limits
  const size = 500
  for (let i = 0; i < batch.length; i += size) {
    const chunk = batch.slice(i, i + size)
    const { error } = await sb.from('providers').upsert(chunk)
    if (error) throw error
  }
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


