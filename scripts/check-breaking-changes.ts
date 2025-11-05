/**
 * Breaking Changes Checker
 * 
 * This script checks for common breaking change patterns that have caused
 * cascading failures in the past.
 * 
 * See: docs/prevention/CASCADING_FAILURES.md
 * 
 * Run with: npm run check:breaking
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface CheckResult {
  file: string
  line?: number
  rule: string
  severity: 'error' | 'warning'
  message: string
}

const results: CheckResult[] = []
const srcDir = join(process.cwd(), 'src')
const netlifyDir = join(process.cwd(), 'netlify', 'functions')

// Critical files that should have dependency tracking comments
const CRITICAL_FILES = [
  'src/contexts/AuthContext.tsx',
  'src/hooks/useAdminDataLoader.ts',
  'src/hooks/useAdminVerification.ts',
  'src/utils/profileUtils.ts',
  'src/pages/Onboarding.tsx',
  'src/pages/SignIn.tsx',
  'src/utils/adminUserUtils.ts',
  'src/pages/account/components/AccountSettings.tsx',
  'netlify/functions/admin-list-profiles.ts',
  'netlify/functions/admin-delete-user.ts',
  'netlify/functions/admin-verify.ts',
  'netlify/functions/utils/response.ts',
  'netlify/functions/utils/userDeletion.ts',
]

/**
 * Recursively get all TypeScript files in a directory
 */
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir)
  
  files.forEach(file => {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    
    if (stat.isDirectory()) {
      // Skip node_modules and dist
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        getAllTsFiles(filePath, fileList)
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath)
    }
  })
  
  return fileList
}

/**
 * Check for duplicate type definitions
 * Looks for ProfileRow, AdminStatus, etc. defined in multiple places
 */
function checkDuplicateTypes(file: string, content: string): void {
  const duplicateTypePatterns = [
    {
      name: 'ProfileRow',
      expectedLocation: 'src/types/admin.ts',
      pattern: /(?:type|interface)\s+ProfileRow\s*[:=<]/
    },
    {
      name: 'AdminStatus',
      expectedLocation: 'src/hooks/useAdminVerification.ts',
      pattern: /(?:type|interface)\s+AdminStatus\s*[:=<]/,
      // Allow in admin.ts if it's marked as deprecated for backward compatibility
      allowDuplicateIn: ['src/types/admin.ts']
    },
    {
      name: 'CustomerUser',
      expectedLocation: 'src/utils/adminHelpers.ts',
      pattern: /(?:type|interface)\s+CustomerUser\s*[:=<]/
    }
  ]

  duplicateTypePatterns.forEach(({ name, expectedLocation, pattern, allowDuplicateIn = [] }: any) => {
    if (pattern.test(content)) {
      // Normalize paths for comparison (handle Windows vs Unix paths)
      const normalizedFile = file.replace(/\\/g, '/')
      const normalizedExpected = expectedLocation.replace(/\\/g, '/')
      
      // Check if file is the expected location (should NOT flag if it is)
      const isExpectedLocation = normalizedFile.includes(normalizedExpected)
      
      if (!isExpectedLocation) {
        // Check if duplicate is allowed in this file
        const normalizedAllowed = allowDuplicateIn.map((allowed: string) => allowed.replace(/\\/g, '/'))
        const isAllowed = normalizedAllowed.some((allowed: string) => normalizedFile.includes(allowed))
        if (!isAllowed) {
          const line = content.split('\n').findIndex(line => pattern.test(line)) + 1
          results.push({
            file,
            line,
            rule: 'DUPLICATE_TYPE',
            severity: 'error',
            message: `Duplicate type definition: ${name} should only be defined in ${expectedLocation}`
          })
        }
      }
    }
  })
}

/**
 * Check for direct Supabase profile updates (should use profileUtils)
 */
function checkDirectProfileUpdates(file: string, content: string): void {
  // Check for direct .from('profiles').update() or .insert() calls
  const directUpdatePattern = /\.from\(['"]profiles['"]\)\.(update|insert|upsert)\(/
  
  if (directUpdatePattern.test(content)) {
    // Allow if it's in profileUtils.ts itself or a test file
    if (!file.includes('profileUtils.ts') && !file.includes('.test.') && !file.includes('.spec.')) {
      const line = content.split('\n').findIndex(line => directUpdatePattern.test(line)) + 1
      results.push({
        file,
        line,
        rule: 'DIRECT_PROFILE_UPDATE',
        severity: 'error',
        message: 'Direct Supabase profile update detected. Use updateUserProfile() from profileUtils.ts instead'
      })
    }
  }
}

/**
 * Check for direct Supabase queries in migrated files (should use query utility)
 */
function checkDirectSupabaseQueries(file: string, content: string): void {
  // Files that should be migrated to use query utility
  const MIGRATED_FILES = [
    'src/utils/profileUtils.ts',
    'src/utils/adminDataLoadingUtils.ts',
    'src/services/analyticsService.ts',
    'src/services/emailNotificationService.ts',
  ]
  
  const relativePath = file.replace(process.cwd() + '/', '').replace(/\\/g, '/')
  
  if (MIGRATED_FILES.includes(relativePath)) {
    // Check for direct supabase.from() table queries (not storage or auth)
    const directQueryPattern = /supabase\.from\(['"](\w+)['"]\)/
    const matches = content.matchAll(directQueryPattern)
    
    for (const match of matches) {
      const tableName = match[1]
      // Allow storage and auth calls
      if (tableName !== 'storage' && !content.includes('supabase.auth') && !content.includes('supabase.storage')) {
        const line = content.substring(0, match.index).split('\n').length
        results.push({
          file,
          line,
          rule: 'DIRECT_SUPABASE_QUERY',
          severity: 'error',
          message: `Direct Supabase query detected in migrated file. Use query('${tableName}') from supabaseQuery.ts instead`
        })
      }
    }
    
    // Check if query utility is imported
    if (!content.includes("from '../lib/supabaseQuery'") && 
        !content.includes("from '@/lib/supabaseQuery'") &&
        !content.includes("from './lib/supabaseQuery'") &&
        !content.includes("from '../../lib/supabaseQuery'") &&
        !content.includes("from '../../../lib/supabaseQuery'")) {
      results.push({
        file,
        rule: 'MISSING_QUERY_UTILITY_IMPORT',
        severity: 'error',
        message: 'Migrated file missing query utility import. Add: import { query } from "../lib/supabaseQuery"'
      })
    }
  }
}

/**
 * Check for localStorage key mismatches
 */
function checkLocalStorageKeys(file: string, content: string): void {
  // Critical keys that must match exactly
  const criticalKeys = ['bf-pending-profile', 'bf-return-url']
  // Additional allowed keys (not critical but documented)
  const allowedKeys = [
    'bf-pending-profile',
    'bf-return-url',
    'bf-auth',
    'bf-signup-prefill',
    'bf-calendar-info-dismissed',
    'bf-saved-events',
    'bf_analytics_session_id',
    'viewed_',
    'last_viewed_provider',
    'last_viewed_provider_time'
  ]
  const localStoragePattern = /localStorage\.(getItem|setItem|removeItem)\(['"]([^'"]+)['"]\)/g
  
  let match
  while ((match = localStoragePattern.exec(content)) !== null) {
    const key = match[2]
    // Only warn for critical keys that don't match
    if (key.includes('bf-') && !allowedKeys.some(allowed => key === allowed || key.startsWith(allowed))) {
      // Check if it's a critical key but using wrong format
      if (criticalKeys.some(critical => key.includes(critical) && key !== critical)) {
        const line = content.substring(0, match.index).split('\n').length
        results.push({
          file,
          line,
          rule: 'LOCALSTORAGE_KEY',
          severity: 'warning',
          message: `Unexpected localStorage key: "${key}". Critical keys must match exactly: ${criticalKeys.join(', ')}`
        })
      }
      // For other keys, just note them (not an error)
    }
  }
}

/**
 * Check for missing dependency tracking comments in critical files
 */
function checkDependencyTracking(file: string, content: string): void {
  const relativePath = file.replace(process.cwd() + '/', '')
  
  if (CRITICAL_FILES.includes(relativePath)) {
    if (!content.includes('DEPENDENCY TRACKING')) {
      results.push({
        file,
        rule: 'MISSING_DEPENDENCY_TRACKING',
        severity: 'error',
        message: 'Critical file missing dependency tracking comment. Add DEPENDENCY TRACKING comment at top of file.'
      })
    }
  }
}

/**
 * Check for API response format inconsistencies
 */
function checkApiResponseFormat(file: string, content: string): void {
  // Check Netlify functions for response format
  if (file.includes('netlify/functions') && file.endsWith('.ts')) {
    // Check if using successResponse or errorResponse
    const hasSuccessResponse = content.includes('successResponse')
    const hasErrorResponse = content.includes('errorResponse')
    const hasDirectReturn = /return\s*\{\s*statusCode\s*[:=]/.test(content)
    
    if (hasDirectReturn && !hasSuccessResponse && !hasErrorResponse) {
      results.push({
        file,
        rule: 'API_RESPONSE_FORMAT',
        severity: 'warning',
        message: 'Netlify function may not be using standardized response format. Use successResponse() or errorResponse() from utils/response.ts'
      })
    }
  }
}

/**
 * Check for admin verification check order issues
 */
function checkAdminVerificationOrder(file: string, content: string): void {
  if (file.includes('useAdminVerification') || file.includes('AdminVerification')) {
    // Check if !auth.email is checked before auth.loading
    const emailCheckPattern = /if\s*\(\s*!auth\.email\s*\)/
    const loadingCheckPattern = /if\s*\(\s*auth\.loading\s*\)/
    
    const emailCheckIndex = content.search(emailCheckPattern)
    const loadingCheckIndex = content.search(loadingCheckPattern)
    
    if (emailCheckIndex !== -1 && loadingCheckIndex !== -1 && emailCheckIndex < loadingCheckIndex) {
      const line = content.substring(0, emailCheckIndex).split('\n').length
      results.push({
        file,
        line,
        rule: 'AUTH_CHECK_ORDER',
        severity: 'error',
        message: 'Auth check order issue: !auth.email should be checked AFTER auth.loading. This causes logout during navigation.'
      })
    }
  }
}

/**
 * Main check function
 */
function runChecks(): void {
  console.log('🔍 Checking for breaking change patterns...\n')
  
  const srcFiles = getAllTsFiles(srcDir)
  const netlifyFiles = getAllTsFiles(netlifyDir)
  const allFiles = [...srcFiles, ...netlifyFiles]
  
  console.log(`Found ${allFiles.length} TypeScript files to check\n`)
  
  allFiles.forEach(file => {
    try {
      const content = readFileSync(file, 'utf-8')
      
      checkDuplicateTypes(file, content)
      checkDirectProfileUpdates(file, content)
      checkDirectSupabaseQueries(file, content)
      checkLocalStorageKeys(file, content)
      checkDependencyTracking(file, content)
      checkApiResponseFormat(file, content)
      checkAdminVerificationOrder(file, content)
    } catch (error) {
      console.error(`Error reading ${file}:`, error)
    }
  })
  
  // Print results
  const errors = results.filter(r => r.severity === 'error')
  const warnings = results.filter(r => r.severity === 'warning')
  
  if (errors.length > 0) {
    console.log(`\n❌ Found ${errors.length} error(s):\n`)
    errors.forEach(result => {
      console.log(`  ${result.file}${result.line ? `:${result.line}` : ''}`)
      console.log(`    [${result.rule}] ${result.message}\n`)
    })
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Found ${warnings.length} warning(s):\n`)
    warnings.forEach(result => {
      console.log(`  ${result.file}${result.line ? `:${result.line}` : ''}`)
      console.log(`    [${result.rule}] ${result.message}\n`)
    })
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ No breaking change patterns detected!\n')
    process.exit(0)
  } else if (errors.length > 0) {
    console.log(`\n❌ Found ${errors.length} error(s). Please fix before committing.\n`)
    process.exit(1)
  } else {
    console.log(`\n⚠️  Found ${warnings.length} warning(s). Review before committing.\n`)
    process.exit(0)
  }
}

// Run checks
runChecks()

