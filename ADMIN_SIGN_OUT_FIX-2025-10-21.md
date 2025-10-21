# Admin Page Sign-Out Issue Fix - October 21, 2025

## Issue
When navigating to `/admin`, users were being unexpectedly signed out, making the admin panel inaccessible.

## Root Cause
The `adminList` array was being recreated on every component render, which caused:

1. **New Reference on Every Render**: The array got a new object reference each time the component re-rendered
2. **useMemo Recalculation**: This new reference caused `isClientAdmin` to recalculate unnecessarily
3. **Auth State Cascade**: The recalculation triggered the admin verification `useEffect` to run repeatedly
4. **Race Conditions**: During verification, temporary auth state changes could cause the user to appear as not authenticated
5. **Sign-Out Behavior**: The auth system interpreted these state changes as requiring a sign-out

### Code Before (Problematic)
```typescript
// ❌ PROBLEM: adminList gets recreated on every render
const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean)
const adminList = adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
const isClientAdmin = useMemo(() => !!auth.email && adminList.includes(auth.email.toLowerCase()), [auth.email, adminList])
```

## Solution
Wrapped `adminList` in `useMemo` with an empty dependency array, ensuring it's only created once:

### Code After (Fixed)
```typescript
// ✅ FIXED: adminList is memoized and only created once
const adminList = useMemo(() => {
  const adminEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  return adminEnv.length > 0 ? adminEnv : ['justexisted@gmail.com']
}, []) // Empty deps - admin emails don't change during runtime

const isClientAdmin = useMemo(
  () => !!auth.email && adminList.includes(auth.email.toLowerCase()), 
  [auth.email, adminList]
)
```

## Why This Works

### 1. **Stable Reference**
- `adminList` now has a stable reference that persists across renders
- Only created once when the component mounts

### 2. **Controlled Recalculation**
- `isClientAdmin` only recalculates when `auth.email` actually changes
- No longer recalculates on every render

### 3. **No Race Conditions**
- Admin verification `useEffect` no longer triggered unnecessarily
- Auth state remains stable during navigation

### 4. **Performance Benefit**
- Reduces unnecessary calculations
- Prevents excessive re-renders

## Technical Details

### useMemo Dependency Arrays
```typescript
// Wrong approach - adminList changes every render
const adminList = ['admin@example.com']  // New array reference each render
const isClientAdmin = useMemo(..., [auth.email, adminList])  // Recalcs every render

// Correct approach - adminList is stable
const adminList = useMemo(() => [...], [])  // Same reference always
const isClientAdmin = useMemo(..., [auth.email, adminList])  // Only recalcs when email changes
```

### React Memo Behavior
- `useMemo` performs shallow comparison on dependencies
- Arrays and objects use reference equality (`===`)
- New reference = recalculation, even if content is identical

## Testing
- ✅ No linting errors
- ✅ Admin page loads without signing out
- ✅ Authentication state remains stable
- ✅ Admin verification works correctly

## Related Files Modified
- `src/pages/Admin.tsx` - Fixed admin list memoization

## Impact
- **Critical**: Fixes admin panel accessibility
- **Security**: Maintains proper admin verification
- **Stability**: Prevents unexpected sign-outs
- **Performance**: Reduces unnecessary recalculations

## Prevention
This type of issue can be prevented by:
1. Always memoizing arrays/objects used in dependency arrays
2. Being careful with `useMemo` and `useEffect` dependencies
3. Using React DevTools Profiler to catch excessive re-renders
4. Testing navigation flows thoroughly

---

**Date**: October 21, 2025  
**Priority**: 🔴 CRITICAL  
**Status**: ✅ FIXED  
**Linting**: ✅ No errors

