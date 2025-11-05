/**
 * Automated Verification Script for Supabase Query Migration
 * 
 * This script automatically verifies that migrated files:
 * 1. Use the centralized query utility correctly
 * 2. Maintain proper error handling
 * 3. Have appropriate log prefixes
 * 4. Don't have direct Supabase queries remaining
 * 5. Maintain API compatibility
 * 
 * Run: npx tsx scripts/verify-query-migration.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Files that should be migrated (known migrated files)
const MIGRATED_FILES = [
  'src/utils/profileUtils.ts',
  'src/utils/adminDataLoadingUtils.ts',
  'src/services/analyticsService.ts',
  'src/services/emailNotificationService.ts',
]

// Files that might still use direct Supabase (not migrated yet)
// Note: This is for reference only, not actively used in verification
const UNMIGRATED_FILES = [
  'src/pages/Calendar.tsx',
  'src/pages/Account.tsx',
  'src/components/CalendarSection.tsx',
  // Add more as needed
]

interface VerificationResult {
  file: string
  passed: boolean
  errors: string[]
  warnings: string[]
}

const results: VerificationResult[] = []

/**
 * Check if file uses query utility correctly
 */
function verifyQueryUtilityUsage(filePath: string, content: string): VerificationResult {
  const result: VerificationResult = {
    file: filePath,
    passed: true,
    errors: [],
    warnings: [],
  }

  // Check 1: Must import query utility
  if (!content.includes("from '../lib/supabaseQuery'") && 
      !content.includes("from '@/lib/supabaseQuery'") &&
      !content.includes("from './lib/supabaseQuery'") &&
      !content.includes("from '../lib/supabaseQuery'") &&
      !content.includes("from '../../lib/supabaseQuery'") &&
      !content.includes("from '../../../lib/supabaseQuery'")) {
    // Check if it's a migrated file that should have the import
    if (MIGRATED_FILES.includes(filePath)) {
      result.errors.push('Missing query utility import')
      result.passed = false
    }
  }

  // Check 2: Must not use direct supabase.from() for table queries
  const directQueries = content.match(/supabase\.from\(['"](\w+)['"]\)/g)
  if (directQueries && MIGRATED_FILES.includes(filePath)) {
    // Allow supabase.storage.from() and supabase.auth calls
    const tableQueries = directQueries.filter(q => !q.includes('storage') && !q.includes('auth'))
    if (tableQueries.length > 0) {
      result.errors.push(`Found ${tableQueries.length} direct Supabase table queries (should use query utility): ${tableQueries.join(', ')}`)
      result.passed = false
    }
  }

  // Check 3: Must use query() for table queries (if migrated)
  if (MIGRATED_FILES.includes(filePath)) {
    const queryUsage = content.match(/query\(['"]\w+['"]/g)
    if (!queryUsage || queryUsage.length === 0) {
      result.errors.push('No query() calls found (file should use query utility)')
      result.passed = false
    }
  }

  // Check 4: Must have logPrefix in query() calls
  if (content.includes('query(')) {
    const queryCalls = content.match(/query\(['"]\w+['"],\s*\{[^}]*\}/g)
    if (queryCalls) {
      queryCalls.forEach(call => {
        if (!call.includes('logPrefix')) {
          result.warnings.push(`Query call missing logPrefix: ${call.substring(0, 50)}...`)
        }
      })
    }
  }

  // Check 5: Error handling must use error.message or error.code
  if (content.includes('if (error)')) {
    const errorHandling = content.match(/if\s*\(error\)\s*\{[^}]*\}/gs)
    if (errorHandling) {
      errorHandling.forEach((block, index) => {
        // Check if error is accessed in the block (may be in comments or other ways)
        const hasErrorAccess = block.includes('error.message') || 
                              block.includes('error.code') || 
                              block.includes('error.details') ||
                              block.includes('error.originalError') ||
                              block.includes('error ||') ||
                              block.includes('error &&')
        
        // Also check if error is logged (console.error, console.warn with error)
        const hasErrorLogging = block.includes('console.error') && block.includes('error') ||
                                block.includes('console.warn') && block.includes('error')
        
        if (!hasErrorAccess && !hasErrorLogging && block.length > 20) {
          // Only warn if the block is substantial (not just a simple check)
          result.warnings.push(`Error handling block ${index + 1} may not access error properties correctly`)
        }
      })
    }
  }

  // Check 6: Must maintain Supabase-compatible format { data, error }
  if (content.includes('query(')) {
    // Check for destructuring pattern: const { data, error } = await query(...)
    const destructuring = content.match(/const\s*\{[^}]*data[^}]*error[^}]*\}\s*=\s*await\s*query/gs)
    if (!destructuring) {
      // Check if query is used with methods that return { data, error }
      const queryWithMethods = content.match(/query\([^)]+\)\.[\w.()]+/gs)
      if (queryWithMethods) {
        // If query is used with methods, it should return { data, error }
        // This is a warning, not an error, because the query utility handles it
        result.warnings.push('Query result may not be destructured as { data, error } - verify destructuring pattern')
      }
    }
  }

  return result
}

/**
 * Check if file maintains error handling patterns
 */
function verifyErrorHandling(filePath: string, content: string): VerificationResult {
  const result: VerificationResult = {
    file: filePath,
    passed: true,
    errors: [],
    warnings: [],
  }

  // Check for error handling after queries
  const queryCalls = content.match(/await\s+query\([^)]+\)\.[^;]+;/gs)
  if (queryCalls) {
    queryCalls.forEach((queryCall, index) => {
      // Find the next error check after this query
      const afterQuery = content.substring(content.indexOf(queryCall) + queryCall.length)
      const nextErrorCheck = afterQuery.match(/if\s*\(error\)/s)
      
      if (!nextErrorCheck && MIGRATED_FILES.includes(filePath)) {
        result.warnings.push(`Query at position ${index} may not have error handling`)
      }
    })
  }

  return result
}

/**
 * Check if file maintains API compatibility
 */
function verifyAPICompatibility(filePath: string, content: string): VerificationResult {
  const result: VerificationResult = {
    file: filePath,
    passed: true,
    errors: [],
    warnings: [],
  }

  // Check for Supabase query builder methods that should be supported
  const methods = ['select', 'eq', 'maybeSingle', 'single', 'insert', 'update', 'delete', 'gte', 'lte', 'order', 'limit']
  methods.forEach(method => {
    // Check if method is used with query() - look for query(...).method(...) pattern
    const queryMethodPattern = new RegExp(`query\\([^)]+\\)[^.]*\\.${method}\\(`, 'gs')
    const queryWithMethod = content.match(queryMethodPattern)
    
    // Check if method is used with direct supabase.from() - this would be a problem
    const directSupabasePattern = new RegExp(`supabase\\.from\\([^)]+\\)[^.]*\\.${method}\\(`, 'gs')
    const directSupabaseWithMethod = content.match(directSupabasePattern)
    
    // If method is used but not with query utility, warn
    if (directSupabaseWithMethod && !queryWithMethod && MIGRATED_FILES.includes(filePath)) {
      result.warnings.push(`Method ${method} may be used with direct Supabase instead of query utility`)
    }
    
    // If method is used with query utility, it's correct - no warning needed
  })

  return result
}

/**
 * Main verification function
 */
function verifyFile(filePath: string): VerificationResult {
  const fullPath = path.join(process.cwd(), filePath)
  
  if (!fs.existsSync(fullPath)) {
    return {
      file: filePath,
      passed: false,
      errors: ['File not found'],
      warnings: [],
    }
  }

  const content = fs.readFileSync(fullPath, 'utf-8')

  // Run all verification checks
  const queryCheck = verifyQueryUtilityUsage(filePath, content)
  const errorCheck = verifyErrorHandling(filePath, content)
  const apiCheck = verifyAPICompatibility(filePath, content)

  // Combine results
  const combined: VerificationResult = {
    file: filePath,
    passed: queryCheck.passed && errorCheck.passed && apiCheck.passed,
    errors: [...queryCheck.errors, ...errorCheck.errors, ...apiCheck.errors],
    warnings: [...queryCheck.warnings, ...errorCheck.warnings, ...apiCheck.warnings],
  }

  return combined
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Verifying Supabase Query Migration...\n')

  // Verify migrated files
  console.log('📋 Checking migrated files...\n')
  MIGRATED_FILES.forEach(file => {
    const result = verifyFile(file)
    results.push(result)

    if (result.passed) {
      console.log(`✅ ${file}`)
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => console.log(`   ⚠️  ${w}`))
      }
    } else {
      console.log(`❌ ${file}`)
      result.errors.forEach(e => console.log(`   ❌ ${e}`))
      result.warnings.forEach(w => console.log(`   ⚠️  ${w}`))
    }
  })

  // Summary
  console.log('\n📊 Summary:\n')
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const warnings = results.reduce((sum, r) => sum + r.warnings.length, 0)

  console.log(`✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)
  console.log(`⚠️  Warnings: ${warnings}`)

  if (failed > 0) {
    console.log('\n❌ Migration verification failed!')
    process.exit(1)
  } else if (warnings > 0) {
    console.log('\n⚠️  Migration verification passed with warnings')
    process.exit(0)
  } else {
    console.log('\n✅ Migration verification passed!')
    process.exit(0)
  }
}

// Run if executed directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
if (isMainModule || process.argv[1]?.includes('verify-query-migration')) {
  main()
}

export { verifyFile, verifyQueryUtilityUsage, verifyErrorHandling, verifyAPICompatibility }

