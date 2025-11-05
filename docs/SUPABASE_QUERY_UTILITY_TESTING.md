# Testing the Supabase Query Utility

## Quick Test Steps

### 1. Manual Testing in Browser Console

Open your browser console on your local development site and test the migrated functions:

```javascript
// Test plan choice functions (requires authenticated user)
import { getUserPlanChoice, setUserPlanChoice } from './utils/planChoiceDb'

// Get current plan choice
const choice = await getUserPlanChoice('your-user-id-here')
console.log('Current plan choice:', choice)

// Set plan choice
const result = await setUserPlanChoice('your-user-id-here', 'free')
console.log('Set plan choice result:', result)
```

### 2. Test Error Handling

To test error handling, you can:
- Temporarily break your Supabase connection (wrong URL/key)
- Check logs in browser console for standardized error format
- Verify retry logic (you'll see retry messages in console)

### 3. Test Retry Logic

To test retry logic:
1. Open browser DevTools → Network tab
2. Set network throttling to "Slow 3G" or "Offline"
3. Trigger a query that uses the utility
4. Check console logs - you should see retry attempts with exponential backoff

### 4. Verify Logs

Check browser console for standardized log format:
- Success: `[PlanChoice]` or `[EventTerms]` prefix
- Errors: `[PlanChoice] Non-retryable error:` or `[PlanChoice] Retryable error:`
- Retries: `[PlanChoice] Retryable error (attempt 1/4): retryingIn: 500ms`

## Testing Checklist

### ✅ Basic Functionality
- [ ] `getUserPlanChoice()` returns correct value
- [ ] `setUserPlanChoice()` updates successfully
- [ ] `hasAcceptedEventTerms()` returns correct boolean
- [ ] `acceptEventTerms()` updates successfully

### ✅ Error Handling
- [ ] Invalid user ID returns `null` (not throws)
- [ ] Error logs appear with correct prefix
- [ ] Error messages are clear and helpful

### ✅ Retry Logic (if possible)
- [ ] Network errors trigger retry attempts
- [ ] Retry logs show exponential backoff delays
- [ ] Max retries respected (3 attempts)

### ✅ Logging
- [ ] Logs use standardized prefix (`[PlanChoice]`, `[EventTerms]`)
- [ ] Error logs include error code and message
- [ ] Success operations log appropriately

## Testing in Development

### Test Plan Choice Functions

1. **Sign in to your app**
2. **Open browser console**
3. **Run these commands:**

```javascript
// Get your user ID from localStorage or auth context
const userId = 'your-user-id'

// Test getting plan choice
const choice = await getUserPlanChoice(userId)
console.log('Plan choice:', choice)

// Test setting plan choice
const result = await setUserPlanChoice(userId, 'free')
console.log('Set result:', result)

// Verify it was saved
const newChoice = await getUserPlanChoice(userId)
console.log('New plan choice:', newChoice)
```

### Test Event Terms Functions

```javascript
const userId = 'your-user-id'

// Check if terms accepted
const accepted = await hasAcceptedEventTerms(userId)
console.log('Terms accepted:', accepted)

// Accept terms
const result = await acceptEventTerms(userId)
console.log('Accept result:', result)

// Verify it was saved
const newAccepted = await hasAcceptedEventTerms(userId)
console.log('New terms accepted:', newAccepted)
```

## Testing Error Scenarios

### Test Invalid User ID

```javascript
// This should return null, not throw
const choice = await getUserPlanChoice('invalid-user-id')
console.log('Result (should be null):', choice)
// Check console for error log: [PlanChoice] Non-retryable error: NO_ROWS
```

### Test Network Error Simulation

1. Open DevTools → Network tab
2. Right-click → "Block request domain" → Add `*.supabase.co`
3. Trigger a query
4. Check console for retry logs:
   ```
   [PlanChoice] Retryable error (attempt 1/4): NETWORK_ERROR
   [PlanChoice] Retryable error (attempt 2/4): NETWORK_ERROR
   [PlanChoice] Retryable error (attempt 3/4): NETWORK_ERROR
   [PlanChoice] Max retries (3) exceeded
   ```

## Verification Points

### ✅ Success Indicators
- Functions return expected values
- No errors in console
- Database updated correctly
- Logs show success operations

### ✅ Error Indicators
- Errors logged with correct prefix
- Error messages are clear
- Functions return safe defaults (null, empty array, etc.)
- No uncaught exceptions

### ✅ Retry Indicators
- Retryable errors logged with retry info
- Exponential backoff delays visible in logs
- Max retries respected
- Non-retryable errors returned immediately

## Common Issues

### Issue: "Function not found"
**Solution:** Make sure you're importing from the correct path:
```typescript
import { getUserPlanChoice } from '../utils/planChoiceDb'
```

### Issue: "User ID not found"
**Solution:** Get your user ID from:
- Browser localStorage (auth token)
- AuthContext (if available)
- Supabase dashboard

### Issue: "RLS Error"
**Solution:** This is expected for non-retryable errors. The utility will log it and return null/empty safely.

## Next Steps

Once you've verified these functions work:
1. Test in production-like environment
2. Monitor logs for any issues
3. Proceed with migrating more files
4. Test each migrated file before moving to next

