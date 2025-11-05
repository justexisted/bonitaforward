# Comprehensive Testing Guide - Supabase Query Utility Refactoring

**Date:** November 4, 2025  
**Purpose:** Test all migrated files and verify query utility functionality

---

## 🎯 Testing Overview

### What We're Testing

1. **Query Utility Core Functionality**
   - Retry logic for transient errors
   - Error classification (retryable vs non-retryable)
   - Standardized logging
   - Error handling

2. **Migrated Files** (11 files total)
   - Utility functions (planChoiceDb, eventTermsDb, savedEventsDb)
   - Admin utilities (adminUserUtils, adminProviderUtils, adminBusinessApplicationUtils)
   - Data loaders (account/dataLoader, useAdminDataLoader)
   - Services (adminDataService, supabaseData)
   - Pages (CreateBusinessForm)

3. **Integration Testing**
   - Functions work correctly in real app context
   - No breaking changes
   - Performance is acceptable

---

## 📋 Pre-Testing Setup

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Open Browser DevTools

- Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
- Or `Cmd+Option+I` (Mac)
- Go to **Console** tab
- Keep **Network** tab open for monitoring

### Step 3: Sign In to Your App

All tests require authentication. Make sure you're signed in.

### Step 4: Get Your User ID

Run this in browser console:

```javascript
// Method 1: From localStorage
const authToken = localStorage.getItem('sb-auth-token')
const userId = authToken ? JSON.parse(authToken).user?.id : null
console.log('User ID:', userId)

// Method 2: From auth context (if available)
const userIdAlt = window.auth?.userId || window.__authContext?.user?.id
console.log('User ID (alt):', userIdAlt)

// Save for testing
window.testUserId = userId || userIdAlt
```

---

## 🧪 Test Suite 1: Core Query Utility Functions

### Test 1.1: Basic Select Query

**Purpose:** Verify basic query functionality

```javascript
// Test in browser console
const { query } = await import('./lib/supabaseQuery')

// Test 1: Simple select
const { data, error } = await query('profiles', { logPrefix: '[Test]' })
  .select('*')
  .eq('id', window.testUserId)
  .maybeSingle()

console.log('✅ Test 1.1 Result:', { data, error })
```

**Expected Results:**
- ✅ `data` contains your profile or `null`
- ✅ `error` is `null` if successful
- ✅ Console shows `[Test]` prefix in logs
- ✅ No uncaught exceptions

**Success Criteria:**
- [ ] Query executes successfully
- [ ] Logs use correct prefix
- [ ] Error handling works

---

### Test 1.2: Error Classification (Non-Retryable)

**Purpose:** Verify RLS/permission errors are handled correctly

```javascript
// Test with invalid user ID (should return NO_ROWS error)
const { query } = await import('./lib/supabaseQuery')

const { data, error } = await query('profiles', { logPrefix: '[Test]' })
  .select('*')
  .eq('id', 'invalid-user-id-12345')
  .maybeSingle()

console.log('✅ Test 1.2 Result:', { data, error })
```

**Expected Results:**
- ✅ `data` is `null`
- ✅ `error` is not null
- ✅ `error.code` is `'NO_ROWS'` or `'RLS_ERROR'`
- ✅ `error.retryable` is `false`
- ✅ Console shows: `[Test] Non-retryable error: NO_ROWS`
- ✅ No retry attempts

**Success Criteria:**
- [ ] Error classified correctly
- [ ] No retries attempted
- [ ] Log shows correct error type

---

### Test 1.3: Retry Logic (Network Error Simulation)

**Purpose:** Verify retry logic works for transient errors

**Steps:**
1. Open DevTools → **Network** tab
2. Right-click → **Block request domain**
3. Add `*.supabase.co` to blocked domains
4. Run test query
5. Watch console for retry attempts

```javascript
const { query } = await import('./lib/supabaseQuery')

// This should trigger retry logic
const { data, error } = await query('profiles', { 
  logPrefix: '[Test]',
  maxRetries: 3
})
  .select('*')
  .eq('id', window.testUserId)
  .maybeSingle()

console.log('✅ Test 1.3 Result:', { data, error })
```

**Expected Results:**
- ✅ Console shows retry attempts: `[Test] Retryable error (attempt 1/4): NETWORK_ERROR`
- ✅ Exponential backoff delays visible (500ms, 1000ms, 2000ms)
- ✅ Max retries respected (3 attempts)
- ✅ Final error after max retries

**Success Criteria:**
- [ ] Retry attempts visible in logs
- [ ] Exponential backoff working
- [ ] Max retries respected

**After Test:**
- Remove domain block from Network tab

---

### Test 1.4: Helper Functions

**Purpose:** Test convenience helper functions

```javascript
const { selectAll, selectOne, update, insert, deleteRows } = await import('./lib/supabaseQuery')

// Test selectAll
const profiles = await selectAll('profiles', 
  { id: window.testUserId },
  { logPrefix: '[Test]' }
)
console.log('✅ selectAll:', profiles)

// Test selectOne
const profile = await selectOne('profiles', 
  { id: window.testUserId },
  { logPrefix: '[Test]' }
)
console.log('✅ selectOne:', profile)
```

**Expected Results:**
- ✅ `selectAll` returns array (even if empty)
- ✅ `selectOne` returns object or `null`
- ✅ Logs use correct prefix
- ✅ No errors

**Success Criteria:**
- [ ] All helper functions work
- [ ] Return types are correct
- [ ] Error handling works

---

## 🧪 Test Suite 2: Migrated Utility Files

### Test 2.1: Plan Choice Functions

**File:** `src/utils/planChoiceDb.ts`

```javascript
const { getUserPlanChoice, setUserPlanChoice } = await import('./utils/planChoiceDb')

// Test 1: Get current plan choice
const currentChoice = await getUserPlanChoice(window.testUserId)
console.log('✅ Current plan choice:', currentChoice)

// Test 2: Set plan choice
const setResult = await setUserPlanChoice(window.testUserId, 'free')
console.log('✅ Set plan choice result:', setResult)

// Test 3: Verify it was saved
const verifyChoice = await getUserPlanChoice(window.testUserId)
console.log('✅ Verified plan choice:', verifyChoice)

// Test 4: Test with invalid user ID
const invalidChoice = await getUserPlanChoice('invalid-id-12345')
console.log('✅ Invalid user ID result (should be null):', invalidChoice)
```

**Expected Results:**
- ✅ `getUserPlanChoice` returns `'free'` or `'featured'` or `null`
- ✅ `setUserPlanChoice` returns `{ success: true }`
- ✅ Value persists after setting
- ✅ Invalid user ID returns `null` (not throws)
- ✅ Console shows `[PlanChoice]` prefix in logs

**Success Criteria:**
- [ ] Get works correctly
- [ ] Set works correctly
- [ ] Value persists
- [ ] Error handling works
- [ ] Logs standardized

---

### Test 2.2: Event Terms Functions

**File:** `src/utils/eventTermsDb.ts`

```javascript
const { hasAcceptedEventTerms, acceptEventTerms } = await import('./utils/eventTermsDb')

// Test 1: Check current status
const accepted = await hasAcceptedEventTerms(window.testUserId)
console.log('✅ Terms accepted:', accepted)

// Test 2: Accept terms
const acceptResult = await acceptEventTerms(window.testUserId)
console.log('✅ Accept result:', acceptResult)

// Test 3: Verify it was saved
const verifyAccepted = await hasAcceptedEventTerms(window.testUserId)
console.log('✅ Verified terms accepted:', verifyAccepted)

// Test 4: Test with invalid user ID
const invalidAccepted = await hasAcceptedEventTerms('invalid-id-12345')
console.log('✅ Invalid user ID result (should be false):', invalidAccepted)
```

**Expected Results:**
- ✅ `hasAcceptedEventTerms` returns `boolean`
- ✅ `acceptEventTerms` returns `{ success: true }`
- ✅ Value persists after accepting
- ✅ Invalid user ID returns `false` (not throws)
- ✅ Console shows `[EventTerms]` prefix in logs

**Success Criteria:**
- [ ] Check works correctly
- [ ] Accept works correctly
- [ ] Value persists
- [ ] Error handling works
- [ ] Logs standardized

---

### Test 2.3: Saved Events Functions

**File:** `src/utils/savedEventsDb.ts`

```javascript
const { fetchSavedEvents, saveEvent, unsaveEvent } = await import('./utils/savedEventsDb')

// Test 1: Fetch saved events
const savedEvents = await fetchSavedEvents(window.testUserId)
console.log('✅ Saved events:', savedEvents)
console.log('✅ Saved events count:', savedEvents.size)

// Test 2: Save an event (replace with real event ID if you have one)
const eventId = 'test-event-id-12345' // Replace with actual event ID
const saveResult = await saveEvent(window.testUserId, eventId)
console.log('✅ Save event result:', saveResult)

// Test 3: Verify it was saved
const verifySaved = await fetchSavedEvents(window.testUserId)
console.log('✅ Verified saved events:', verifySaved)
console.log('✅ Is event saved?', verifySaved.has(eventId))

// Test 4: Unsave event
const unsaveResult = await unsaveEvent(window.testUserId, eventId)
console.log('✅ Unsave event result:', unsaveResult)

// Test 5: Verify it was removed
const verifyUnsaved = await fetchSavedEvents(window.testUserId)
console.log('✅ Verified after unsave:', verifyUnsaved)
console.log('✅ Is event still saved?', verifyUnsaved.has(eventId))
```

**Expected Results:**
- ✅ `fetchSavedEvents` returns `Set<string>`
- ✅ `saveEvent` returns `{ success: true }`
- ✅ `unsaveEvent` returns `{ success: true }`
- ✅ Events persist correctly
- ✅ Console shows `[SavedEvents]` prefix in logs

**Success Criteria:**
- [ ] Fetch works correctly
- [ ] Save works correctly
- [ ] Unsave works correctly
- [ ] Values persist
- [ ] Logs standardized

---

## 🧪 Test Suite 3: Admin Utility Functions

### Test 3.1: Admin User Utils

**File:** `src/utils/adminUserUtils.ts`  
**Note:** Requires admin authentication

```javascript
const { deleteUser } = await import('./utils/adminUserUtils')

// ⚠️ WARNING: Only test with test accounts, not real users!
// Test user deletion (use test account only)
const testUserId = 'test-user-id-here' // Use test account
const deleteResult = await deleteUser(testUserId)
console.log('✅ Delete user result:', deleteResult)
```

**Expected Results:**
- ✅ Functions work correctly
- ✅ Logs use correct prefix
- ✅ Error handling works

**Success Criteria:**
- [ ] Functions work (if admin)
- [ ] Error handling works
- [ ] Logs standardized

---

### Test 3.2: Admin Provider Utils

**File:** `src/utils/adminProviderUtils.ts`

```javascript
const { 
  toggleFeaturedStatus,
  updateProviderSubscriptionType,
  // ... other functions
} = await import('./utils/adminProviderUtils')

// Test featured toggle (use test provider ID)
const providerId = 'test-provider-id-here'
const toggleResult = await toggleFeaturedStatus(providerId, true)
console.log('✅ Toggle featured result:', toggleResult)
```

**Expected Results:**
- ✅ Functions work correctly
- ✅ Logs use correct prefix
- ✅ Error handling works

---

### Test 3.3: Admin Business Application Utils

**File:** `src/utils/adminBusinessApplicationUtils.ts`

```javascript
const { 
  updateBusinessApplicationStatus,
  // ... other functions
} = await import('./utils/adminBusinessApplicationUtils')

// Test status update (use test application ID)
const applicationId = 'test-application-id-here'
const updateResult = await updateBusinessApplicationStatus(applicationId, 'approved')
console.log('✅ Update status result:', updateResult)
```

**Expected Results:**
- ✅ Functions work correctly
- ✅ Logs use correct prefix
- ✅ Error handling works

---

## 🧪 Test Suite 4: Data Loader Functions

### Test 4.1: Account Data Loader

**File:** `src/pages/account/dataLoader.ts`

```javascript
const { 
  loadMyEvents,
  loadMyCreatedEvents,
  // ... other functions
} = await import('./pages/account/dataLoader')

// Test load saved events
const myEvents = await loadMyEvents(window.testUserId)
console.log('✅ My saved events:', myEvents)
console.log('✅ Events count:', myEvents.length)

// Test load created events
const createdEvents = await loadMyCreatedEvents(window.testUserId)
console.log('✅ My created events:', createdEvents)
console.log('✅ Created events count:', createdEvents.length)
```

**Expected Results:**
- ✅ Functions return arrays
- ✅ Data is correct
- ✅ Logs use correct prefix
- ✅ Error handling works

**Success Criteria:**
- [ ] Load functions work
- [ ] Data is correct
- [ ] Logs standardized

---

### Test 4.2: Admin Data Loader Hook

**File:** `src/hooks/useAdminDataLoader.ts`  
**Note:** This requires testing in a React component context

**Test via Admin Page:**
1. Navigate to `/admin` (as admin)
2. Open browser console
3. Watch logs when page loads
4. Verify:
   - ✅ Data loads correctly
   - ✅ Logs use correct prefix
   - ✅ No errors

---

## 🧪 Test Suite 5: Service Functions

### Test 5.1: Admin Data Service

**File:** `src/services/adminDataService.ts`

```javascript
const { 
  fetchProviders,
  fetchAllAdminData,
  // ... other functions
} = await import('./services/adminDataService')

// Test fetch providers (if admin)
const providers = await fetchProviders()
console.log('✅ Providers:', providers)
console.log('✅ Providers count:', providers.length)

// Test fetch all data
const allData = await fetchAllAdminData()
console.log('✅ All admin data:', allData)
```

**Expected Results:**
- ✅ Functions work correctly
- ✅ Data structure is correct
- ✅ Logs use correct prefix
- ✅ Error handling works

**Success Criteria:**
- [ ] Functions work (if admin)
- [ ] Data structure correct
- [ ] Logs standardized

---

### Test 5.2: Supabase Data Service

**File:** `src/lib/supabaseData.ts`

```javascript
const { 
  fetchProvidersFromSupabase,
  fetchAllBlogPosts,
  // ... other functions
} = await import('./lib/supabaseData')

// Test fetch providers
const providers = await fetchProvidersFromSupabase()
console.log('✅ Providers:', providers)
console.log('✅ Providers count:', providers.length)

// Test fetch blog posts
const blogPosts = await fetchAllBlogPosts()
console.log('✅ Blog posts:', blogPosts)
console.log('✅ Blog posts count:', blogPosts.length)
```

**Expected Results:**
- ✅ Functions work correctly
- ✅ Data structure is correct
- ✅ Logs use correct prefix
- ✅ Error handling works

---

## 🧪 Test Suite 6: Integration Testing

### Test 6.1: MyBusiness Page Integration

**Purpose:** Verify functions work in real page context

**Steps:**
1. Navigate to `/my-business` (as business user)
2. Open browser console
3. Watch logs when page loads
4. Verify:
   - ✅ Plan choice functions work
   - ✅ Event terms functions work
   - ✅ Logs use correct prefix
   - ✅ No errors

**Expected Console Output:**
```
[PlanChoice] Successfully fetched plan choice: free
[EventTerms] Terms accepted: true
```

---

### Test 6.2: Account Page Integration

**Purpose:** Verify data loader works in real page context

**Steps:**
1. Navigate to `/account`
2. Open browser console
3. Watch logs when page loads
4. Verify:
   - ✅ Saved events load correctly
   - ✅ Logs use correct prefix
   - ✅ No errors

---

### Test 6.3: Admin Page Integration

**Purpose:** Verify admin functions work in real page context

**Steps:**
1. Navigate to `/admin` (as admin)
2. Open browser console
3. Watch logs when page loads
4. Verify:
   - ✅ All data loads correctly
   - ✅ Logs use correct prefix
   - ✅ No errors

---

## 📊 Testing Checklist

### Core Functionality
- [ ] Basic query works
- [ ] Error classification works (retryable vs non-retryable)
- [ ] Retry logic works (network errors)
- [ ] Helper functions work
- [ ] Logs use correct prefix

### Migrated Files
- [ ] `planChoiceDb.ts` - Get/Set work correctly
- [ ] `eventTermsDb.ts` - Check/Accept work correctly
- [ ] `savedEventsDb.ts` - Fetch/Save/Unsave work correctly
- [ ] `adminUserUtils.ts` - Functions work (if admin)
- [ ] `adminProviderUtils.ts` - Functions work (if admin)
- [ ] `adminBusinessApplicationUtils.ts` - Functions work (if admin)
- [ ] `account/dataLoader.ts` - Load functions work
- [ ] `useAdminDataLoader.ts` - Hook works (if admin)
- [ ] `adminDataService.ts` - Service functions work (if admin)
- [ ] `supabaseData.ts` - Service functions work
- [ ] `CreateBusinessForm.tsx` - Form works

### Error Handling
- [ ] Invalid user IDs handled gracefully
- [ ] RLS errors handled correctly
- [ ] Network errors trigger retries
- [ ] Max retries respected
- [ ] No uncaught exceptions

### Logging
- [ ] All logs use correct prefix
- [ ] Error logs are clear and helpful
- [ ] Retry logs show attempt numbers
- [ ] Success operations log appropriately

### Integration
- [ ] MyBusiness page works
- [ ] Account page works
- [ ] Admin page works (if admin)
- [ ] No breaking changes
- [ ] Performance is acceptable

---

## 🐛 Troubleshooting

### Issue: "Cannot import module"
**Solution:** Make sure you're running from the app context, not a separate script. The functions need to be imported within the app.

### Issue: "User ID not found"
**Solution:** 
1. Sign in to your app first
2. Check localStorage: `localStorage.getItem('sb-auth-token')`
3. Use the auth context if available

### Issue: "RLS Error"
**Solution:** This is expected if you don't have permission. The utility will log it and return null/empty safely.

### Issue: "Functions return undefined"
**Solution:** Check that the file is properly migrated. Verify imports are correct.

### Issue: "No retry attempts visible"
**Solution:** 
1. Make sure you blocked the domain in Network tab
2. Check that the error is actually retryable (network/connection errors)
3. Verify maxRetries is set correctly

---

## 📝 Test Results Template

Create a test results file:

```markdown
# Test Results - [Date]

## Test Environment
- Browser: [Chrome/Firefox/etc]
- User ID: [your-user-id]
- Date: [date]

## Test Results

### Core Functionality
- [ ] Test 1.1: Basic Select Query
- [ ] Test 1.2: Error Classification
- [ ] Test 1.3: Retry Logic
- [ ] Test 1.4: Helper Functions

### Migrated Files
- [ ] Test 2.1: Plan Choice Functions
- [ ] Test 2.2: Event Terms Functions
- [ ] Test 2.3: Saved Events Functions
- [ ] Test 3.1: Admin User Utils
- [ ] Test 3.2: Admin Provider Utils
- [ ] Test 3.3: Admin Business Application Utils
- [ ] Test 4.1: Account Data Loader
- [ ] Test 4.2: Admin Data Loader Hook
- [ ] Test 5.1: Admin Data Service
- [ ] Test 5.2: Supabase Data Service

### Integration
- [ ] Test 6.1: MyBusiness Page
- [ ] Test 6.2: Account Page
- [ ] Test 6.3: Admin Page

## Issues Found
[List any issues found]

## Notes
[Any additional notes]
```

---

## ✅ Next Steps After Testing

1. **Document any issues found**
2. **Fix any bugs discovered**
3. **Re-test after fixes**
4. **Proceed with migrating more files**
5. **Update migration status**

---

## 📚 Related Documentation

- `docs/SUPABASE_QUERY_UTILITY.md` - Main refactoring plan
- `docs/TEST_QUERY_UTILITY.md` - Quick test guide
- `docs/SUPABASE_QUERY_UTILITY_TESTING.md` - Original testing doc

---

**Status:** Ready for testing  
**Last Updated:** November 4, 2025

