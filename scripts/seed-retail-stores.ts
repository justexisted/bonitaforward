/*
  Usage:
    - Set env:
        SUPABASE_URL=...            (project URL)
        SUPABASE_SERVICE_ROLE=...   (service_role key)
    - Run: npx tsx scripts/seed-retail-stores.ts
*/
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s+/g, ' ')
}

function getSupabase() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!SUPABASE_URL) throw new Error('Missing env SUPABASE_URL (or VITE_SUPABASE_URL)')
  const SUPABASE_SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE')
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
}

type UpsertProvider = {
  name: string
  category_key: 'retail'
  tags?: string[]
  website?: string | null
  address?: string | null
  phone?: string | null
  published?: boolean
}

// Curated list of retail stores in Bonita, San Diego area
const curated: UpsertProvider[] = [
  // Westfield Plaza Bonita stores
  {
    name: 'Macy\'s - Plaza Bonita',
    category_key: 'retail',
    tags: ['department-store', 'clothing', 'accessories', 'home-goods', 'cosmetics', 'jewelry', 'mid-range', 'premium'],
    address: '3030 Plaza Bonita Road, National City, CA 91950',
    website: 'https://www.macys.com',
    published: true,
  },
  {
    name: 'JCPenney - Plaza Bonita',
    category_key: 'retail',
    tags: ['department-store', 'clothing', 'home-goods', 'appliances', 'mid-range'],
    address: '3030 Plaza Bonita Road, National City, CA 91950',
    website: 'https://www.jcpenney.com',
    published: true,
  },
  {
    name: 'Target - Plaza Bonita',
    category_key: 'retail',
    tags: ['department-store', 'groceries', 'clothing', 'electronics', 'home-goods', 'budget', 'mid-range'],
    address: '3030 Plaza Bonita Road, National City, CA 91950',
    website: 'https://www.target.com',
    published: true,
  },
  {
    name: 'Nordstrom Rack - Plaza Bonita',
    category_key: 'retail',
    tags: ['clothing', 'accessories', 'shoes', 'designer', 'discount', 'mid-range', 'premium'],
    address: '3030 Plaza Bonita Road, National City, CA 91950',
    website: 'https://www.nordstromrack.com',
    published: true,
  },
  {
    name: 'Exchange San Diego',
    category_key: 'retail',
    tags: ['vintage', 'clothing', 'sneakers', 'collectibles', 'unique', 'mid-range'],
    address: '3030 Plaza Bonita Road, National City, CA 91950',
    website: null,
    published: true,
  },
  
  // Bonita Point Shopping Center
  {
    name: 'Ralphs - Bonita Point',
    category_key: 'retail',
    tags: ['grocery', 'supermarket', 'food', 'budget', 'mid-range'],
    address: '1451-1479 East H Street, Chula Vista, CA',
    website: 'https://www.ralphs.com',
    published: true,
  },
  
  // Local Bonita retail stores (general categories)
  {
    name: 'Bonita Village Shopping Center',
    category_key: 'retail',
    tags: ['shopping-center', 'local', 'bonita'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  
  // Additional retail categories for Bonita area
  {
    name: 'Bonita Liquor & Market',
    category_key: 'retail',
    tags: ['convenience', 'liquor', 'groceries', 'local', 'budget'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Smoke Shop',
    category_key: 'retail',
    tags: ['tobacco', 'convenience', 'local'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Dollar Store',
    category_key: 'retail',
    tags: ['discount', 'variety', 'budget', 'local'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Thrift Store',
    category_key: 'retail',
    tags: ['thrift', 'used', 'clothing', 'furniture', 'budget', 'local'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Hardware Store',
    category_key: 'retail',
    tags: ['hardware', 'tools', 'home-improvement', 'local', 'mid-range'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Beauty Supply',
    category_key: 'retail',
    tags: ['beauty', 'cosmetics', 'hair-care', 'local', 'mid-range'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Gift Shop',
    category_key: 'retail',
    tags: ['gifts', 'souvenirs', 'local', 'unique', 'mid-range'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Electronics Store',
    category_key: 'retail',
    tags: ['electronics', 'phones', 'computers', 'local', 'mid-range'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Sporting Goods',
    category_key: 'retail',
    tags: ['sports', 'outdoor', 'fitness', 'local', 'mid-range'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Pet Supply',
    category_key: 'retail',
    tags: ['pet', 'animals', 'pet-food', 'local', 'mid-range'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Bookstore',
    category_key: 'retail',
    tags: ['books', 'reading', 'local', 'mid-range'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Jewelry Store',
    category_key: 'retail',
    tags: ['jewelry', 'accessories', 'premium', 'local'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Florist',
    category_key: 'retail',
    tags: ['flowers', 'plants', 'gifts', 'local', 'mid-range'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
  {
    name: 'Bonita Antique Shop',
    category_key: 'retail',
    tags: ['antiques', 'vintage', 'collectibles', 'unique', 'local', 'mid-range', 'premium'],
    address: 'Bonita, CA',
    website: null,
    published: true,
  },
]

async function main() {
  const sb = getSupabase()
  
  // Load existing providers for retail to dedupe
  const { data: existing, error } = await sb
    .from('providers')
    .select('id,name,category_key')
    .eq('category_key', 'retail')
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
  
  console.log('Inserted retail stores successfully.')
}

main().catch((e) => { 
  console.error(e)
  process.exit(1) 
})

