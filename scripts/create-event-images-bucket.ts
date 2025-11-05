/**
 * Create Supabase Storage Bucket for Event Images
 * 
 * This script creates the "event-images" bucket if it doesn't exist.
 * The bucket must exist before running populate-event-images.ts
 * 
 * Usage:
 *   npx tsx scripts/create-event-images-bucket.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from BOTH .env and .env.local
const envPath = resolve(process.cwd(), '.env')
const envLocalPath = resolve(process.cwd(), '.env.local')

if (existsSync(envPath)) {
  config({ path: envPath })
}
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true })
}

if (!existsSync(envPath) && !existsSync(envLocalPath)) {
  console.error('❌ No .env or .env.local file found')
  process.exit(1)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('Please add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createEventImagesBucket() {
  console.log('🚀 Creating event-images storage bucket...\n')

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      throw listError
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'event-images')
    
    if (bucketExists) {
      console.log('✅ Bucket "event-images" already exists!')
      console.log('✅ No action needed - bucket is ready to use\n')
      return
    }

    // Create the bucket
    console.log('📦 Creating bucket "event-images"...')
    const { data, error } = await supabase.storage.createBucket('event-images', {
      public: true, // Make bucket public so images can be accessed
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880 // 5MB limit
    })

    if (error) {
      console.error('❌ Error creating bucket:', error)
      throw error
    }

    console.log('✅ Bucket "event-images" created successfully!')
    console.log('✅ Bucket is public - images can be accessed directly')
    console.log('✅ Bucket is ready for event images\n')

    // Verify bucket was created
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets()
    
    if (verifyError) {
      console.warn('⚠️  Could not verify bucket creation:', verifyError)
    } else {
      const verified = verifyBuckets?.some(bucket => bucket.name === 'event-images')
      if (verified) {
        console.log('✅ Verification: Bucket exists and is ready\n')
      } else {
        console.error('❌ Verification failed: Bucket not found after creation')
        process.exit(1)
      }
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    console.error('\nIf bucket creation failed, you can create it manually:')
    console.error('1. Go to Supabase Dashboard → Storage')
    console.error('2. Click "Create bucket"')
    console.error('3. Name: "event-images"')
    console.error('4. Check "Public bucket"')
    console.error('5. Click "Create bucket"')
    process.exit(1)
  }
}

// Run the script
createEventImagesBucket()
  .then(() => {
    console.log('✨ Done!')
    console.log('\n📝 Next step: Run populate-event-images.ts to store images:')
    console.log('   npx tsx scripts/populate-event-images.ts\n')
    setTimeout(() => {
      process.exit(0)
    }, 100)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    setTimeout(() => {
      process.exit(1)
    }, 100)
  })


