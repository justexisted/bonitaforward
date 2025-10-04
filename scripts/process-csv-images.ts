import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE')
  console.error('Found:')
  console.error(`  VITE_SUPABASE_URL: ${!!process.env.VITE_SUPABASE_URL}`)
  console.error(`  SUPABASE_URL: ${!!process.env.SUPABASE_URL}`)
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`)
  console.error(`  SUPABASE_SERVICE_ROLE: ${!!process.env.SUPABASE_SERVICE_ROLE}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CSVRow {
  [key: string]: string
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const rows: CSVRow[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    const row: CSVRow = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    rows.push(row)
  }
  
  return rows
}

function parseImageField(imageString: string): string[] {
  if (!imageString || imageString.trim() === '') return []
  
  // Handle different formats:
  // 1. JSON array: ["image1.jpg", "image2.jpg"]
  // 2. Comma-separated: image1.jpg, image2.jpg
  // 3. Pipe-separated: image1.jpg|image2.jpg
  // 4. Semicolon-separated: image1.jpg;image2.jpg
  
  try {
    // Try parsing as JSON first
    const parsed = JSON.parse(imageString)
    if (Array.isArray(parsed)) {
      return parsed.filter(img => img && typeof img === 'string' && img.trim())
    }
  } catch {
    // Not JSON, try other formats
  }
  
  // Try different separators
  const separators = [',', '|', ';', '\n']
  for (const sep of separators) {
    if (imageString.includes(sep)) {
      return imageString
        .split(sep)
        .map(img => img.trim())
        .filter(img => img && img.length > 0)
    }
  }
  
  // Single image
  return [imageString.trim()].filter(img => img)
}

async function processCSVFile(filePath: string) {
  console.log(`📄 Processing CSV file: ${filePath}`)
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const rows = parseCSV(content)
    
    console.log(`📊 Found ${rows.length} rows in CSV`)
    
    if (rows.length === 0) {
      console.log('⚠️ No data rows found')
      return
    }
    
    // Show available columns
    const firstRow = rows[0]
    console.log('📋 Available columns:', Object.keys(firstRow))
    
    // Find image column
    const imageColumns = Object.keys(firstRow).filter(key => 
      key.toLowerCase().includes('image') || 
      key.toLowerCase().includes('photo') || 
      key.toLowerCase().includes('picture')
    )
    
    console.log('🖼️ Image columns found:', imageColumns)
    
    if (imageColumns.length === 0) {
      console.log('❌ No image columns found. Looking for columns that might contain images...')
      // Show all columns for manual inspection
      Object.keys(firstRow).forEach(key => {
        console.log(`  - ${key}: "${firstRow[key]}"`)
      })
      return
    }
    
    const updates = []
    
    for (const row of rows) {
      const businessName = row.name || row.business_name || row.company_name || row.provider_name
      if (!businessName) {
        console.log('⚠️ Skipping row without business name')
        continue
      }
      
      // Collect all images from image columns
      const allImages: string[] = []
      for (const imageCol of imageColumns) {
        const images = parseImageField(row[imageCol])
        allImages.push(...images)
      }
      
      // Remove duplicates and empty strings
      const uniqueImages = Array.from(new Set(allImages.filter(img => img && img.trim())))
      
      if (uniqueImages.length > 0) {
        updates.push({
          name: businessName,
          images: uniqueImages,
          originalRow: row
        })
        
        console.log(`✅ ${businessName}: ${uniqueImages.length} images`)
        console.log(`   Images: ${uniqueImages.join(', ')}`)
      } else {
        console.log(`⚠️ ${businessName}: No valid images found`)
      }
    }
    
    console.log(`\n🔄 Updating ${updates.length} providers in database...`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const update of updates) {
      try {
        // Find the provider by name
        const { data: existingProvider, error: findError } = await supabase
          .from('providers')
          .select('id, name')
          .ilike('name', `%${update.name}%`)
          .limit(1)
        
        if (findError) {
          console.error(`❌ Error finding provider ${update.name}:`, findError)
          errorCount++
          continue
        }
        
        if (!existingProvider || existingProvider.length === 0) {
          console.log(`⚠️ Provider not found: ${update.name}`)
          errorCount++
          continue
        }
        
        const provider = existingProvider[0]
        
        // Update the provider with images
        const { error: updateError } = await supabase
          .from('providers')
          .update({ 
            images: update.images,
            updated_at: new Date().toISOString()
          })
          .eq('id', provider.id)
        
        if (updateError) {
          console.error(`❌ Error updating provider ${update.name}:`, updateError)
          errorCount++
        } else {
          console.log(`✅ Updated ${update.name} with ${update.images.length} images`)
          successCount++
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Unexpected error processing ${update.name}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`✅ Successfully updated: ${successCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    
  } catch (error) {
    console.error('❌ Error processing CSV file:', error)
  }
}

async function main() {
  const csvFiles = process.argv.slice(2)
  
  if (csvFiles.length === 0) {
    console.log('📋 Usage: tsx scripts/process-csv-images.ts <csv-file1> [csv-file2] ...')
    console.log('📋 Example: tsx scripts/process-csv-images.ts providers.csv')
    return
  }
  
  for (const csvFile of csvFiles) {
    if (!fs.existsSync(csvFile)) {
      console.error(`❌ File not found: ${csvFile}`)
      continue
    }
    
    await processCSVFile(csvFile)
    console.log('\n' + '='.repeat(50) + '\n')
  }
}

main().catch(console.error)
