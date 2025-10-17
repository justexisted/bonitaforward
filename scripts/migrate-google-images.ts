/**
 * Migrate Google User Content Images to Supabase Storage
 * 
 * This script downloads Google images from providers and uploads them to Supabase storage.
 * Run this once to permanently fix the Google image blocking issue.
 * 
 * Usage:
 *   npm run migrate:images
 */

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import { randomUUID } from 'crypto'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('Current values:', {
    supabaseUrl: supabaseUrl ? '✓ Set' : '✗ Missing',
    supabaseKey: supabaseKey ? '✓ Set' : '✗ Missing'
  })
  process.exit(1)
}

console.log('✓ Supabase credentials loaded')

const supabase = createClient(supabaseUrl, supabaseKey)

type Provider = {
  id: string
  name: string
  images: string[] | null
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    console.log(`  Downloading: ${url.substring(0, 80)}...`)
    
    // Try to fetch with browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      // @ts-ignore - node-fetch types
      timeout: 30000,
    })

    if (!response.ok) {
      console.warn(`  ⚠️  Failed to download (${response.status}): ${url}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error(`  ❌ Error downloading image:`, error)
    return null
  }
}

async function uploadToSupabase(
  imageBuffer: Buffer,
  providerId: string,
  index: number,
  originalUrl: string
): Promise<string | null> {
  try {
    // Determine file extension from URL or default to jpg
    let extension = 'jpg'
    const urlLower = originalUrl.toLowerCase()
    if (urlLower.includes('.png')) extension = 'png'
    else if (urlLower.includes('.webp')) extension = 'webp'
    else if (urlLower.includes('.gif')) extension = 'gif'

    // Generate unique filename
    const filename = `${providerId}-${index}-${randomUUID()}.${extension}`
    const path = `business-images/${filename}`

    console.log(`  Uploading to: ${path}`)

    const { data, error } = await supabase.storage
      .from('business-images')
      .upload(path, imageBuffer, {
        contentType: `image/${extension}`,
        cacheControl: '31536000', // 1 year
      })

    if (error) {
      console.error(`  ❌ Upload error:`, error.message)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('business-images')
      .getPublicUrl(path)

    console.log(`  ✅ Uploaded successfully!`)
    return urlData.publicUrl
  } catch (error) {
    console.error(`  ❌ Error uploading:`, error)
    return null
  }
}

async function migrateProviderImages(provider: Provider): Promise<boolean> {
  if (!provider.images || provider.images.length === 0) {
    return false
  }

  console.log(`\n📦 Processing: ${provider.name}`)

  const googleImages = provider.images.filter(img => 
    img && img.startsWith('https://lh3.googleusercontent.com/')
  )

  if (googleImages.length === 0) {
    console.log(`  ℹ️  No Google images to migrate`)
    return false
  }

  console.log(`  Found ${googleImages.length} Google image(s)`)

  const newImages: string[] = []
  let migratedCount = 0

  for (let i = 0; i < provider.images.length; i++) {
    const imageUrl = provider.images[i]

    // If not a Google image, keep as-is
    if (!imageUrl.startsWith('https://lh3.googleusercontent.com/')) {
      newImages.push(imageUrl)
      continue
    }

    console.log(`  [${i + 1}/${provider.images.length}] Migrating image...`)

    // Download the image
    const imageBuffer = await downloadImage(imageUrl)
    if (!imageBuffer) {
      console.log(`  ⚠️  Skipping this image (download failed)`)
      continue
    }

    // Upload to Supabase
    const newUrl = await uploadToSupabase(imageBuffer, provider.id, i, imageUrl)
    if (!newUrl) {
      console.log(`  ⚠️  Skipping this image (upload failed)`)
      continue
    }

    newImages.push(newUrl)
    migratedCount++

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  if (migratedCount === 0) {
    console.log(`  ❌ No images successfully migrated`)
    return false
  }

  // Update provider in database
  console.log(`  💾 Updating database with ${newImages.length} image(s)...`)
  const { error } = await supabase
    .from('providers')
    .update({ images: newImages })
    .eq('id', provider.id)

  if (error) {
    console.error(`  ❌ Database update failed:`, error.message)
    return false
  }

  console.log(`  ✅ Successfully migrated ${migratedCount} image(s)!`)
  return true
}

async function main() {
  console.log('🚀 Google Images Migration Script')
  console.log('=' .repeat(60))

  // Fetch all providers with Google images
  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, name, images')
    .not('images', 'is', null)

  if (error) {
    console.error('Failed to fetch providers:', error)
    process.exit(1)
  }

  if (!providers || providers.length === 0) {
    console.log('No providers found with images.')
    return
  }

  // Filter providers that have Google images
  const providersWithGoogleImages = providers.filter(p => 
    p.images && p.images.some((img: string) => 
      img && img.startsWith('https://lh3.googleusercontent.com/')
    )
  )

  console.log(`\nFound ${providers.length} providers with images`)
  console.log(`Found ${providersWithGoogleImages.length} providers with Google images\n`)

  if (providersWithGoogleImages.length === 0) {
    console.log('✨ No Google images to migrate!')
    return
  }

  let successCount = 0
  let failureCount = 0

  for (const provider of providersWithGoogleImages) {
    try {
      const success = await migrateProviderImages(provider as Provider)
      if (success) {
        successCount++
      } else {
        failureCount++
      }
    } catch (error) {
      console.error(`\n❌ Unexpected error processing ${provider.name}:`, error)
      failureCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`Total providers with Google images: ${providersWithGoogleImages.length}`)
  console.log(`Successfully migrated: ${successCount}`)
  console.log(`Failed: ${failureCount}`)
  console.log('\n✨ Migration complete!')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

