# Infinite Loop Fix - October 21, 2025

## 🐛 Problem

After refactoring Admin.tsx to use the `useAdminDataLoader` hook, the application entered an infinite loop when running `netlify dev`. The console showed endless requests to:
- `/.netlify/functions/admin-list-change-requests`
- `/.netlify/functions/admin-list-job-posts`
- `/.netlify/functions/admin-list-booking-events`

## 🔍 Root Cause

The `useAdminDataLoader` hook's `useEffect` had dependencies on three loader functions:
```typescript
const loadChangeRequests = () => DataLoadingUtils.loadChangeRequests(setError, setChangeRequests)
const loadJobPosts = () => DataLoadingUtils.loadJobPosts(setError, setJobPosts)
const loadBookingEvents = () => DataLoadingUtils.loadBookingEvents(setError, setBookingEvents)
```

**Problem**: These functions were created inline without `useCallback`, so they received **new references on every render**.

**Effect Chain**:
1. Component renders
2. New function references created for `loadChangeRequests`, `loadJobPosts`, `loadBookingEvents`
3. `useAdminDataLoader`'s `useEffect` sees "changed" dependencies
4. `useEffect` runs, fetching data
5. Data updates state via setters
6. State change triggers re-render
7. **Back to step 1** → Infinite loop! 🔄

## ✅ Solution

Wrapped the loader functions in `useCallback` to memoize them:

```typescript
// CRITICAL: Wrapped in useCallback to prevent infinite loop in useAdminDataLoader
// State setters are stable and don't need to be in dependencies
const loadChangeRequests = useCallback(() => 
  DataLoadingUtils.loadChangeRequests(setError, setChangeRequests), 
  [] // Empty deps: state setters are stable
)
const loadJobPosts = useCallback(() => 
  DataLoadingUtils.loadJobPosts(setError, setJobPosts), 
  [] // Empty deps: state setters are stable
)
const loadBookingEvents = useCallback(() => 
  DataLoadingUtils.loadBookingEvents(setError, setBookingEvents), 
  [] // Empty deps: state setters are stable
)
```

## 🎓 Key Learnings

### 1. Function Dependencies in useEffect
When passing functions as dependencies to `useEffect`, they MUST be memoized with `useCallback` or they'll cause infinite loops.

### 2. State Setters are Stable
React guarantees that `setState` functions from `useState` are stable across renders. They **do NOT** need to be included in `useCallback` or `useEffect` dependency arrays.

### 3. Empty Dependencies are OK
Using empty dependency arrays (`[]`) in `useCallback` is perfectly fine when the function only uses stable references (like state setters).

## 🔧 Files Changed

- `src/pages/Admin.tsx`
  - Added `useCallback` import
  - Wrapped `loadChangeRequests` in `useCallback`
  - Wrapped `loadJobPosts` in `useCallback`
  - Wrapped `loadBookingEvents` in `useCallback`

## ✅ Verification

- ✅ No TypeScript errors
- ✅ No linter errors
- ✅ Infinite loop resolved
- ✅ Functions are now stable references
- ✅ useEffect dependencies are properly memoized

## 📚 React Hook Rules Reminder

**Always remember:**
1. **Functions passed to `useEffect` deps** → Must be memoized with `useCallback`
2. **State setters** → Always stable, never need memoization
3. **Primitive values** (strings, numbers, booleans) → Safe in deps
4. **Objects/Arrays** → Must be memoized with `useMemo` if used in deps
5. **Custom hooks** → Should return stable references

## 🚀 Result

The admin panel now loads data **once** when mounted and when dependencies actually change (user selection, section navigation, admin status), rather than infinitely looping.

**Fixed! ✨**

