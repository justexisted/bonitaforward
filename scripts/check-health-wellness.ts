import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkHealthWellnessProviders() {
  console.log('🔍 Checking health-wellness providers in database...')
  
  try {
    // Get ALL providers (no filtering)
    const { data: allProviders, error } = await supabase
      .from('providers')
      .select('*')
      .limit(500)
    
    if (error) {
      console.error('❌ Error fetching providers:', error)
      return
    }
    
    console.log(`📊 Total providers in database: ${allProviders.length}`)
    
    // Find all providers that might be health-wellness related
    const healthRelated = allProviders.filter(p => {
      const name = p.name?.toLowerCase() || ''
      const category = p.category_key?.toLowerCase() || ''
      
      // Check if name contains health-related keywords
      const healthKeywords = [
        'salon', 'spa', 'massage', 'therapy', 'physical', 'dental', 'medical', 
        'wellness', 'health', 'beauty', 'nail', 'hair', 'skin', 'fitness',
        'gym', 'yoga', 'pilates', 'chiropractic', 'acupuncture', 'med spa'
      ]
      
      return healthKeywords.some(keyword => name.includes(keyword)) || category === 'health-wellness'
    })
    
    console.log(`\n🏥 Health-related providers found: ${healthRelated.length}`)
    
    healthRelated.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.name}`)
      console.log(`   Category: ${p.category_key}`)
      console.log(`   Published: ${p.published} (${typeof p.published})`)
      console.log(`   Badges: [${p.badges?.join(', ') || 'none'}]`)
      console.log(`   Tags: [${p.tags?.join(', ') || 'none'}]`)
    })
    
    // Show category breakdown
    const categoryBreakdown: Record<string, number> = {}
    allProviders.forEach(p => {
      const cat = p.category_key || 'unknown'
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
    })
    
    console.log('\n📊 Category breakdown:')
    Object.entries(categoryBreakdown).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`)
    })
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

checkHealthWellnessProviders()
