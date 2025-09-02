/*
  Seed curated Real Estate providers from the analytical report, deduping against existing providers
  in the 'real-estate' category by normalized name.

  Env:
    SUPABASE_URL or VITE_SUPABASE_URL
    SUPABASE_SERVICE_ROLE (required)

  Run:
    npx tsx scripts/seed-realty-report.ts
*/
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!url) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)')
  const key = requireEnv('SUPABASE_SERVICE_ROLE')
  return createClient(url, key, { auth: { persistSession: false } })
}

function normalizeName(name: string): string {
  const lowered = name.toLowerCase()
  // Remove common real estate suffixes and punctuation for better dedupe
  const stripped = lowered
    .replace(/\b(the|team|group|realty|real\s*estate|properties|property|brokerage|brokers?|realtors?|inc\.?|llc|corp\.?|company|co\.?|kw)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return stripped
}

type UpsertProvider = {
  name: string
  category_key: string
  tags?: string[]
  badges?: string[]
  website?: string | null
  published?: boolean
}

const curated: UpsertProvider[] = [
  {
    name: '24K International Realty',
    category_key: 'real-estate',
    tags: ['buy','sell','property-manager','residential','single-family','condo-townhome','land','for-sale','for-rent','probate','south-bay','bonita','low','med','high'],
    website: null,
    published: true,
  },
  {
    name: 'Kent Realty (The Gary Kent Team)',
    category_key: 'real-estate',
    tags: ['buy','sell','agent-realtor','broker','single-family','condo-townhome','multi-family','land','mid','high'],
    website: null,
    published: true,
  },
  {
    name: 'Leilani Sells Homes (Integrity First Realty & Loans)',
    category_key: 'real-estate',
    tags: ['buy','sell','property-manager','single-family','condo-townhome','land','first-time','va','low','med','bonita','south-bay'],
    website: null,
    published: true,
  },
  {
    name: 'Palisade Realty, Inc.',
    category_key: 'real-estate',
    tags: ['buy','sell','residential','single-family','condo-townhome','apartment-multifamily','south-bay','chula-vista','low','med','high','high-volume'],
    website: null,
    published: true,
  },
  {
    name: 'Broadpoint Properties',
    category_key: 'real-estate',
    tags: ['buy','sell','rent','property-manager','residential','multi-family','land','mobile','commercial','office','retail','industrial-warehouse','storage','low','med','high'],
    website: null,
    published: true,
  },
  { name: 'Coldwell Banker West', category_key: 'real-estate', tags: ['buy','sell','residential','low','med','high'], website: null, published: true },
  { name: 'Century 21 Affiliated', category_key: 'real-estate', tags: ['buy','sell','rent','residential','commercial','land','low','med','high'], website: null, published: true },
  { name: 'eXp Realty of Southern California', category_key: 'real-estate', tags: ['buy','sell','rent','residential','low','med','high'], website: null, published: true },
  { name: 'COMPASS', category_key: 'real-estate', tags: ['buy','sell','rent','residential','luxury','high'], website: null, published: true },
  { name: 'Keller Williams Realty', category_key: 'real-estate', tags: ['buy','sell','residential','low','med'], website: null, published: true },
  { name: 'McKee Properties', category_key: 'real-estate', tags: ['property-manager','residential','small-office','retail','bonita'], website: null, published: true },
]

async function main() {
  const sb = getSupabase()
  // Load existing providers for real-estate to dedupe
  const { data: existing, error } = await sb
    .from('providers')
    .select('id,name,category_key')
    .eq('category_key', 'real-estate')
    .limit(1000)
  if (error) throw error
  const existingMap = new Map<string, string>() // normalized name -> id
  for (const row of existing || []) {
    existingMap.set(normalizeName(row.name), row.id)
  }

  const toInsert = curated.filter((p) => !existingMap.has(normalizeName(p.name)))
  console.log(`Curated: ${curated.length}, Existing: ${existing?.length || 0}, New to insert: ${toInsert.length}`)
  if (toInsert.length === 0) {
    console.log('Nothing to insert. Done.')
    return
  }
  // Chunked upsert
  const size = 200
  for (let i = 0; i < toInsert.length; i += size) {
    const chunk = toInsert.slice(i, i + size)
    const { error: upErr } = await sb.from('providers').upsert(chunk)
    if (upErr) throw upErr
  }
  console.log('Inserted providers from report successfully.')
}

main().catch((e) => { console.error(e); process.exit(1) })



