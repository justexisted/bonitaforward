#!/usr/bin/env node

/**
 * Diagnostic Script for Bonita Forward
 * 
 * This script checks for common issues that could cause functionalities to fail.
 * Run with: node diagnose-issues.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔍 Bonita Forward - Diagnostic Check\n')

// Check 1: Environment Variables
console.log('1. Checking Environment Variables...')

try {
  const envPath = path.join(__dirname, '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SITE_URL'
    ]
    
    const missingVars = requiredVars.filter(varName => 
      !envContent.includes(varName) || 
      envContent.includes(`${varName}=`) && envContent.includes(`${varName}= `)
    )
    
    if (missingVars.length === 0) {
      console.log('✅ Environment variables appear to be set')
    } else {
      console.log('❌ Missing environment variables:', missingVars.join(', '))
    }
  } else {
    console.log('❌ .env file not found')
  }
} catch (error) {
  console.log('❌ Error reading .env file:', error.message)
}

// Check 2: Netlify Functions
console.log('\n2. Checking Netlify Functions...')
const functionsDir = path.join(__dirname, 'netlify', 'functions')
try {
  if (fs.existsSync(functionsDir)) {
    const functions = fs.readdirSync(functionsDir).filter(file => 
      file.endsWith('.ts') && !file.startsWith('utils')
    )
    
    const expectedFunctions = [
      'admin-delete-user.ts',
      'admin-get-business-details.ts',
      'admin-list-change-requests.ts',
      'admin-list-profiles.ts',
      'admin-verify.ts',
      'delete-business-listing.ts',
      'user-delete.ts'
    ]
    
    const missingFunctions = expectedFunctions.filter(func => !functions.includes(func))
    
    if (missingFunctions.length === 0) {
      console.log('✅ All required Netlify functions are present')
    } else {
      console.log('❌ Missing Netlify functions:', missingFunctions.join(', '))
    }
  } else {
    console.log('❌ netlify/functions directory not found')
  }
} catch (error) {
  console.log('❌ Error checking Netlify functions:', error.message)
}

// Check 3: Package Dependencies
console.log('\n3. Checking Package Dependencies...')
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))
  const requiredDeps = [
    '@netlify/functions',
    '@supabase/supabase-js',
    'react',
    'react-dom',
    'react-router-dom'
  ]
  
  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
  )
  
  if (missingDeps.length === 0) {
    console.log('✅ All required dependencies are installed')
  } else {
    console.log('❌ Missing dependencies:', missingDeps.join(', '))
  }
} catch (error) {
  console.log('❌ Error checking package.json:', error.message)
}

// Check 4: Build Status
console.log('\n4. Checking Build Status...')
try {
  const distPath = path.join(__dirname, 'dist')
  if (fs.existsSync(distPath)) {
    const distFiles = fs.readdirSync(distPath)
    if (distFiles.length > 0) {
      console.log('✅ Build output exists')
    } else {
      console.log('⚠️  Build directory is empty - run "npm run build"')
    }
  } else {
    console.log('⚠️  No build output found - run "npm run build"')
  }
} catch (error) {
  console.log('❌ Error checking build status:', error.message)
}

console.log('\n🎯 Common Solutions:')
console.log('1. If environment variables are missing, check your .env file')
console.log('2. If Netlify functions are missing, ensure all files are committed')
console.log('3. If dependencies are missing, run "npm install"')
console.log('4. If build fails, run "npm run build" to see errors')
console.log('5. For deployment issues, check Netlify dashboard environment variables')
console.log('\n📖 See TROUBLESHOOTING_GUIDE.md for detailed solutions')
