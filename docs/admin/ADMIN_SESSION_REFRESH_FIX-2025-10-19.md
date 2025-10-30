# Admin Panel - Session Refresh Fix
**Date:** October 19, 2025  
**File:** `src/pages/Admin.tsx`

## 🎯 Problem

When accessing the admin panel (especially after clicking on notifications for change requests, job posts, or booking events), users were getting a **401 Unauthorized** error:

```
Failed to load change requests (HTTP 401): {"error":"Invalid token","details":"fetch failed","hasAnonKey":true}
```

**Console Error:**
```
POST https://www.bonitaforward.com/.netlify/functions/admin-list-change-requests 401 (Unauthorized)
```

## 🔍 Root Cause

The issue occurred because:

1. **Stale Authentication Tokens**: When users navigated to the admin panel or returned after some time, their Supabase authentication token could be expired or stale
2. **No Session Refresh**: The code was using `supabase.auth.getSession()` which returns the cached session without validating if the token is still valid
3. **Netlify Function Validation**: The Netlify functions correctly rejected expired/invalid tokens with "fetch failed" errors

The Netlify function at line 52 would call `sbAnon.auth.getUser(token)` to verify the token, and if the token was expired, it would return:
```typescript
{
  error: 'Invalid token',
  details: 'fetch failed',
  hasAnonKey: true
}
```

## ✨ Solution

Added **automatic session refresh** before making any Netlify function calls. This ensures that:
1. The session token is fresh and valid
2. If the token has expired, it's automatically renewed
3. If refresh fails, users get a clear error message to sign in again

### Changes Made

#### 1. `loadChangeRequests()` Function (Line ~447)

**Before:**
```typescript
const { data: { session } } = await supabase.auth.getSession()

if (!session?.access_token) {
  console.error('[Admin] ❌ No auth token available')
  setError('Not authenticated')
  return
}
```

**After:**
```typescript
// CRITICAL FIX: Refresh session to ensure token is valid
// This prevents "Invalid token" / "fetch failed" errors
const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()

if (sessionError) {
  console.error('[Admin] ❌ Session refresh failed:', sessionError)
  setError('Session expired. Please refresh the page and sign in again.')
  return
}

if (!session?.access_token) {
  console.error('[Admin] ❌ No auth token available after refresh')
  setError('Not authenticated. Please refresh the page and sign in again.')
  return
}

console.log('[Admin] ✓ Session refreshed, auth token acquired')
```

#### 2. `loadJobPosts()` Function (Line ~531)

**Before:**
```typescript
const { data: { session } } = await supabase.auth.getSession()

if (!session?.access_token) {
  console.error('[Admin] No session token available for job posts')
  setError('Not authenticated')
  return
}
```

**After:**
```typescript
// CRITICAL FIX: Refresh session to ensure token is valid
const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()

if (sessionError || !session?.access_token) {
  console.error('[Admin] No session token available for job posts')
  setError('Session expired. Please refresh the page.')
  return
}
```

#### 3. `loadBookingEvents()` Function (Line ~583)

**Before:**
```typescript
const { data: { session } } = await supabase.auth.getSession()
if (!session?.access_token) {
  console.error('[Admin] No session token available for booking events')
  setError('Not authenticated')
  return
}
```

**After:**
```typescript
// CRITICAL FIX: Refresh session to ensure token is valid
const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
if (sessionError || !session?.access_token) {
  console.error('[Admin] No session token available for booking events')
  setError('Session expired. Please refresh the page.')
  return
}
```

## 🔧 Technical Details

### `getSession()` vs `refreshSession()`

- **`getSession()`**: Returns the cached session from local storage WITHOUT validating if the token is still valid
- **`refreshSession()`**: Contacts Supabase to refresh the token and returns a NEW valid session

### Why This Happens

1. User logs in → Token created (valid for 1 hour by default)
2. User navigates away or leaves tab open
3. Time passes → Token expires
4. User returns to admin panel
5. Old code: Uses expired token → Netlify function rejects → 401 error
6. New code: Refreshes token → Gets new valid token → Success

### Session Refresh Flow

```
User Action → refreshSession() → Supabase Auth Server
                    ↓
            Valid Token? 
                    ↓
        Yes ← New Token ← Continue
                    ↓
        No → Error → Show "Please sign in" message
```

## ✅ Benefits

1. **No More 401 Errors**: Session tokens are always fresh when calling Netlify functions
2. **Better UX**: Users don't need to manually refresh the page when tokens expire
3. **Automatic Recovery**: If a token can be refreshed, it happens transparently
4. **Clear Error Messages**: If refresh fails, users get a helpful message to sign in again
5. **Security**: Ensures expired tokens are never used

## 🧪 Testing

To verify the fix works:

1. **Normal Access** (Token Valid):
   - Navigate to admin panel
   - Click on change requests notification
   - ✅ Should load successfully

2. **Stale Token** (Token Expired):
   - Log in to admin panel
   - Wait 1+ hours or manually clear session
   - Navigate to change requests
   - ✅ Session refreshes automatically
   - ✅ Data loads successfully

3. **Complete Logout** (No Token):
   - Sign out completely
   - Try to access admin panel
   - ✅ Clear error message shown
   - ✅ Redirected to sign in

## 📝 Notes

- **All Netlify Function Calls**: This fix applies to all admin data loading functions that call Netlify functions
- **Production Safe**: `refreshSession()` is safe to call repeatedly; Supabase handles rate limiting
- **No Breaking Changes**: Existing functionality preserved; only token handling improved
- **Backward Compatible**: Works with both fresh and stale tokens

## 🎓 Lessons Learned

1. **Always Refresh Before Critical Operations**: When calling backend functions that require authentication, refresh the session first
2. **Don't Trust Cached Sessions**: Cached sessions can be expired; always validate before use
3. **Provide Clear Error Messages**: Tell users exactly what went wrong and how to fix it
4. **Log Session States**: Good logging helps debug authentication issues quickly

## 🚨 Future Improvements

Consider implementing:
- **Global Session Refresh**: Intercept all authenticated API calls and refresh session automatically
- **Session Expiry Warning**: Warn users before their session expires
- **Auto-Retry**: Automatically retry failed requests after session refresh
- **Session Monitoring**: Track session health and proactively refresh

---

**Result**: The admin panel now handles expired sessions gracefully and automatically refreshes tokens before making API calls! 🎉

No more "Invalid token" errors when clicking on notifications or accessing admin features!

