import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

// Use service role key if available, otherwise fall back to anon key (with limited permissions)
const supabaseKey = supabaseServiceKey && supabaseServiceKey !== 'your-service-role-key' 
  ? supabaseServiceKey 
  : supabaseAnonKey

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE or VITE_SUPABASE_ANON_KEY')
  console.error('Found:')
  console.error(`  VITE_SUPABASE_URL: ${!!process.env.VITE_SUPABASE_URL}`)
  console.error(`  SUPABASE_URL: ${!!process.env.SUPABASE_URL}`)
  console.error(`  SUPABASE_SERVICE_ROLE: ${!!process.env.SUPABASE_SERVICE_ROLE}`)
  console.error(`  VITE_SUPABASE_ANON_KEY: ${!!process.env.VITE_SUPABASE_ANON_KEY}`)
  process.exit(1)
}

if (supabaseKey === supabaseAnonKey) {
  console.warn('⚠️ Using anon key - some operations may fail due to RLS policies')
  console.warn('For full functionality, set SUPABASE_SERVICE_ROLE in your .env.local file')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// You can manually define image mappings here
const imageMappings: Record<string, string[]> = {
  // Example:
  // 'Business Name': ['image1.jpg', 'image2.jpg'],
  // 'Another Business': ['photo1.png', 'photo2.jpg'],
}

async function updateProviderImages() {
  console.log('🔄 Updating provider images...')
  
  let successCount = 0
  let errorCount = 0
  
  for (const [businessName, images] of Object.entries(imageMappings)) {
    try {
      console.log(`\n🔍 Looking for provider: ${businessName}`)
      
      // Find the provider by name (case-insensitive)
      const { data: providers, error: findError } = await supabase
        .from('providers')
        .select('id, name')
        .ilike('name', `%${businessName}%`)
        .limit(5) // Get multiple matches to handle duplicates
      
      if (findError) {
        console.error(`❌ Error finding provider ${businessName}:`, findError)
        errorCount++
        continue
      }
      
      if (!providers || providers.length === 0) {
        console.log(`⚠️ Provider not found: ${businessName}`)
        errorCount++
        continue
      }
      
      if (providers.length > 1) {
        console.log(`⚠️ Multiple providers found for "${businessName}":`)
        providers.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`))
        console.log(`  Using the first one: ${providers[0].name}`)
      }
      
      const provider = providers[0]
      
      // Update the provider with images
      const { error: updateError } = await supabase
        .from('providers')
        .update({ 
          images: images,
          updated_at: new Date().toISOString()
        })
        .eq('id', provider.id)
      
      if (updateError) {
        console.error(`❌ Error updating provider ${businessName}:`, updateError)
        errorCount++
      } else {
        console.log(`✅ Updated ${provider.name} with ${images.length} images:`)
        images.forEach(img => console.log(`   - ${img}`))
        successCount++
      }
      
    } catch (error) {
      console.error(`❌ Unexpected error processing ${businessName}:`, error)
      errorCount++
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`✅ Successfully updated: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
}

async function listProviders() {
  console.log('📋 Listing all providers in database...\n')
  
  try {
    const { data: providers, error } = await supabase
      .from('providers')
      .select('id, name, category_key, images, published, badges')
      .order('name')
    
    if (error) {
      console.error('❌ Error fetching providers:', error)
      return
    }
    
    if (!providers || providers.length === 0) {
      console.log('📭 No providers found')
      return
    }
    
    console.log(`📊 Found ${providers.length} providers:\n`)
    
    // Find health-related providers
    const healthKeywords = ['salon', 'spa', 'massage', 'therapy', 'physical', 'dental', 'medical', 'wellness', 'health', 'beauty', 'nail', 'hair', 'skin', 'fitness', 'gym', 'yoga', 'pilates', 'chiropractic', 'acupuncture']
    
    const healthRelated = providers.filter(p => {
      const name = p.name?.toLowerCase() || ''
      const category = p.category_key?.toLowerCase() || ''
      return healthKeywords.some(keyword => name.includes(keyword)) || category === 'health-wellness'
    })
    
    console.log(`🏥 Health-related providers found: ${healthRelated.length}\n`)
    
    healthRelated.forEach(provider => {
      const imageCount = provider.images ? (Array.isArray(provider.images) ? provider.images.length : 1) : 0
      console.log(`${provider.name} (${provider.category_key}) - Published: ${provider.published} - Badges: [${provider.badges?.join(', ') || 'none'}] - ${imageCount} images`)
      if (provider.images && Array.isArray(provider.images) && provider.images.length > 0) {
        provider.images.forEach(img => console.log(`  📷 ${img}`))
      }
    })
    
    // Show category breakdown
    const categoryBreakdown: Record<string, number> = {}
    providers.forEach(p => {
      const cat = p.category_key || 'unknown'
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
    })
    
    console.log('\n📊 Category breakdown:')
    Object.entries(categoryBreakdown).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`)
    })
    
  } catch (error) {
    console.error('❌ Error listing providers:', error)
  }
}

async function main() {
  const command = process.argv[2]
  
  if (command === 'list') {
    await listProviders()
  } else if (command === 'update') {
    await updateProviderImages()
  } else {
    console.log('📋 Usage:')
    console.log('  tsx scripts/update-provider-images.ts list    - List all providers')
    console.log('  tsx scripts/update-provider-images.ts update - Update providers with images from mappings')
    console.log('\n📝 To add image mappings, edit the imageMappings object in this script')
  }
}

main().catch(console.error)
