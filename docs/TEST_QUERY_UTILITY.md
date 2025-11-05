# Quick Test Guide for Supabase Query Utility

## Method 1: Test via Browser Console (Easiest)

### Step 1: Open Your App
1. Start your dev server: `npm run dev`
2. Open your app in browser
3. **Sign in** (required for these functions)

### Step 2: Open Browser Console
- Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
- Or `Cmd+Option+I` (Mac)
- Go to "Console" tab

### Step 3: Get Your User ID
```javascript
// Get user ID from auth context (if available in window)
const userId = window.auth?.userId || 
               JSON.parse(localStorage.getItem('sb-auth-token') || '{}')?.user?.id ||
               prompt('Enter your user ID:')

console.log('Testing with userId:', userId)
```

### Step 4: Test Plan Choice Functions
```javascript
// Import the functions (if using ES modules)
// Or use them directly if they're in window scope

// Test 1: Get current plan choice
const testGetChoice = async () => {
  const { getUserPlanChoice } = await import('./utils/planChoiceDb')
  const choice = await getUserPlanChoice(userId)
  console.log('✅ Plan choice result:', choice)
  return choice
}

// Test 2: Set plan choice
const testSetChoice = async (choice) => {
  const { setUserPlanChoice } = await import('./utils/planChoiceDb')
  const result = await setUserPlanChoice(userId, choice)
  console.log('✅ Set plan choice result:', result)
  return result
}

// Run tests
await testGetChoice()
await testSetChoice('free')
await testGetChoice() // Verify it was saved
```

### Step 5: Test Event Terms Functions
```javascript
const testEventTerms = async () => {
  const { hasAcceptedEventTerms, acceptEventTerms } = await import('./utils/eventTermsDb')
  
  // Check current status
  const accepted = await hasAcceptedEventTerms(userId)
  console.log('✅ Terms accepted:', accepted)
  
  // Accept terms
  const result = await acceptEventTerms(userId)
  console.log('✅ Accept result:', result)
  
  // Verify
  const newAccepted = await hasAcceptedEventTerms(userId)
  console.log('✅ New terms accepted:', newAccepted)
  
  return newAccepted
}

await testEventTerms()
```

### Step 6: Check Logs
Look for standardized log messages in console:
- `[PlanChoice]` or `[EventTerms]` prefix
- Success messages: `Successfully set plan choice to: free`
- Error messages: `[PlanChoice] Non-retryable error: NO_ROWS`

## Method 2: Test via MyBusiness Page

The functions are already integrated into the MyBusiness page:

1. **Navigate to `/my-business`** (after signing in)
2. **Open browser console**
3. **Watch the logs** when the page loads
4. You should see:
   - `[PlanChoice]` logs when checking plan choice
   - `[EventTerms]` logs if checking terms

## Method 3: Test Error Handling

### Test Invalid User ID
```javascript
const { getUserPlanChoice } = await import('./utils/planChoiceDb')
const result = await getUserPlanChoice('invalid-id-12345')
console.log('Should return null:', result)
// Check console for: [PlanChoice] Non-retryable error: NO_ROWS
```

### Test Network Error (Simulate)
1. Open DevTools → Network tab
2. Right-click → "Block request domain"
3. Add `*.supabase.co`
4. Trigger a query
5. Check console for retry logs:
   ```
   [PlanChoice] Retryable error (attempt 1/4): NETWORK_ERROR
   [PlanChoice] Retryable error (attempt 2/4): NETWORK_ERROR
   [PlanChoice] Retryable error (attempt 3/4): NETWORK_ERROR
   [PlanChoice] Max retries (3) exceeded
   ```

## Method 4: Quick Verification Checklist

Run these in browser console:

```javascript
// 1. Functions exist and are importable
const { getUserPlanChoice, setUserPlanChoice } = await import('./utils/planChoiceDb')
console.log('✅ Functions imported successfully')

// 2. Get user ID
const userId = window.auth?.userId || prompt('Enter user ID:')

// 3. Test get (should return null or valid value)
const choice = await getUserPlanChoice(userId)
console.log('✅ Get plan choice:', choice)

// 4. Test set (should return { success: true })
const setResult = await setUserPlanChoice(userId, 'free')
console.log('✅ Set plan choice:', setResult)

// 5. Verify it was saved
const verifyChoice = await getUserPlanChoice(userId)
console.log('✅ Verified plan choice:', verifyChoice)

// 6. Check logs have correct prefix
console.log('✅ Check console above for [PlanChoice] logs')
```

## Expected Results

### ✅ Success Case
- Functions return expected values
- Console shows: `[PlanChoice] Successfully set plan choice to: free`
- Database updated correctly
- No errors in console

### ✅ Error Case
- Invalid user ID returns `null` (not throws)
- Console shows: `[PlanChoice] Non-retryable error: NO_ROWS`
- No uncaught exceptions

### ✅ Retry Case (if network error)
- Console shows retry attempts
- Exponential backoff delays visible
- Max retries respected (3 attempts)

## Troubleshooting

### "Cannot import module"
**Solution:** Make sure you're running from the app, not a separate script. The functions need to be imported within the app context.

### "User ID not found"
**Solution:** 
1. Sign in to your app first
2. Check localStorage: `localStorage.getItem('sb-auth-token')`
3. Or use the auth context if available

### "RLS Error"
**Solution:** This is expected if you don't have permission. The utility will log it and return null safely.

## Next Steps

Once you've verified:
1. ✅ Functions work correctly
2. ✅ Logs are standardized
3. ✅ Error handling works
4. ✅ No breaking changes

You can proceed with migrating more files!

