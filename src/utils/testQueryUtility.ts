/**
 * TEST UTILITY FOR SUPABASE QUERY UTILITY
 * 
 * This utility allows testing the query utility from the browser console.
 * It's only included in development mode.
 * 
 * Usage in browser console:
 * window.testQueryUtility(userId)
 */

import { getUserPlanChoice, setUserPlanChoice } from './planChoiceDb'
import { hasAcceptedEventTerms, acceptEventTerms } from './eventTermsDb'

/**
 * Test the query utility functions
 * 
 * @param userId - User ID to test with (optional, will try to get from auth if not provided)
 * @returns Promise with test results
 */
export async function testQueryUtility(userId?: string): Promise<{
  planChoice: {
    get: any
    set: { success: boolean; error?: string }
    verify: any
  }
  eventTerms: {
    get: boolean
    set: { success: boolean; error?: string }
    verify: boolean
  }
}> {
  // Try to get userId from window.auth if not provided
  if (!userId && typeof window !== 'undefined') {
    const auth = (window as any).auth
    if (auth?.userId) {
      userId = auth.userId
    } else {
      // Try to get from localStorage
      try {
        const token = localStorage.getItem('sb-auth-token')
        if (token) {
          const parsed = JSON.parse(token)
          userId = parsed?.user?.id
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  if (!userId) {
    console.error('❌ No user ID provided. Please provide userId or sign in first.')
    console.log('Usage: window.testQueryUtility("your-user-id-here")')
    throw new Error('User ID required')
  }

  console.log('🧪 Testing Supabase Query Utility')
  console.log('📋 User ID:', userId)
  console.log('')

  // Test plan choice
  console.log('📋 Test 1: Get plan choice')
  const choice1 = await getUserPlanChoice(userId)
  console.log('   Result:', choice1)

  console.log('\n📋 Test 2: Set plan choice to "free"')
  const setResult = await setUserPlanChoice(userId, 'free')
  console.log('   Result:', setResult)

  console.log('\n📋 Test 3: Verify it was saved')
  const choice2 = await getUserPlanChoice(userId)
  console.log('   Result:', choice2)
  console.log('   ✅ Match:', choice2 === 'free' ? 'PASS' : 'FAIL')

  // Test event terms
  console.log('\n📋 Test 4: Check event terms')
  const accepted1 = await hasAcceptedEventTerms(userId)
  console.log('   Result:', accepted1)

  console.log('\n📋 Test 5: Accept event terms')
  const acceptResult = await acceptEventTerms(userId)
  console.log('   Result:', acceptResult)

  console.log('\n📋 Test 6: Verify terms accepted')
  const accepted2 = await hasAcceptedEventTerms(userId)
  console.log('   Result:', accepted2)
  console.log('   ✅ Match:', accepted2 === true ? 'PASS' : 'FAIL')

  console.log('\n✅ All tests complete!')
  console.log('📝 Check logs above for [PlanChoice] and [EventTerms] prefixes.')

  return {
    planChoice: {
      get: choice1,
      set: setResult,
      verify: choice2
    },
    eventTerms: {
      get: accepted1,
      set: acceptResult,
      verify: accepted2
    }
  }
}

/**
 * Make test function available on window object in development mode
 * This needs to run immediately when the module loads
 */
if (typeof window !== 'undefined') {
  // Attach to window immediately
  (window as any).testQueryUtility = testQueryUtility
  
  // Also log when it's available (only in dev)
  if (import.meta.env.DEV) {
    console.log('✅ Test utility available! Use: window.testQueryUtility(userId)')
    console.log('   Or: window.testQueryUtility() - will try to get userId from auth')
  }
}

