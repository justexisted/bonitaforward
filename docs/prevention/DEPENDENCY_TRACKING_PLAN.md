# Dependency Tracking Comments - Implementation Plan

**See Also:**
- `DATA_INTEGRITY_PREVENTION.md` - **CRITICAL**: Prevents missing fields in profile updates (like missing name during signup)

## Goal
Add comprehensive dependency tracking comments to all files that broke recently to prevent cascading failures.

---

## Files That Broke Recently

### 1. **AuthContext.tsx** ⭐ HIGH PRIORITY
**Issue:** Name display after signup  
**Break Chain:** AuthContext → useAdminDataLoader → ResidentVerificationSection  
**Status:** Fixed, needs dependency docs

### 2. **useAdminDataLoader.ts** ⭐ HIGH PRIORITY
**Issue:** Resident verification empty (duplicate ProfileRow type)  
**Break Chain:** Netlify function → useAdminDataLoader → ResidentVerificationSection  
**Status:** Fixed, needs dependency docs

### 3. **admin-delete-user.ts** ⭐ MEDIUM PRIORITY
**Issue:** User deletion failing (wrong order)  
**Break Chain:** admin-delete-user → adminUserUtils → Admin.tsx  
**Status:** Fixed, needs dependency docs

### 4. **admin-list-change-requests.ts** ⭐ MEDIUM PRIORITY
**Issue:** Wrong table name (owner_change_requests vs provider_change_requests)  
**Break Chain:** admin-list-change-requests → Admin.tsx  
**Status:** Fixed, needs dependency docs

### 5. **admin-list-profiles.ts** ⭐ HIGH PRIORITY
**Issue:** API response format (result.ok vs result.success)  
**Break Chain:** admin-list-profiles → useAdminDataLoader → Admin.tsx  
**Status:** Fixed, needs dependency docs

### 6. **adminUserUtils.ts** ⭐ MEDIUM PRIORITY
**Issue:** API response format mismatch  
**Break Chain:** admin-delete-user → adminUserUtils → Admin.tsx  
**Status:** Fixed, needs dependency docs

### 7. **utils/response.ts** ⭐ HIGH PRIORITY
**Issue:** Inconsistent response format  
**Break Chain:** ALL Netlify functions → ALL frontend code  
**Status:** Fixed, needs dependency docs

### 8. **utils/userDeletion.ts** ⭐ MEDIUM PRIORITY
**Issue:** New shared utility (prevention)  
**Break Chain:** user-delete → admin-delete-user → userDeletion utility  
**Status:** New, needs dependency docs

---

## Dependency Tracking Template

```typescript
/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - [dependency 1]: Why it matters
 * - [dependency 2]: Why it matters
 * 
 * WHAT DEPENDS ON THIS:
 * - [consumer 1]: What breaks if this changes
 * - [consumer 2]: What breaks if this changes
 * 
 * BREAKING CHANGES:
 * - If you change X, you MUST update Y and Z
 * - If you change the response format, you MUST update all consumers
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Check all dependencies first
 * 2. Check all consumers
 * 3. Update related files together
 * 4. Test everything
 * 
 * RELATED FILES:
 * - [file1]: Why related
 * - [file2]: Why related
 */
```

---

## Implementation Plan

### Phase 1: High Priority Files (30 min)

1. **AuthContext.tsx**
   - Document dependencies on localStorage, Supabase, ensureProfile
   - Document consumers: Admin pages, Account pages, SignIn
   - Document order dependencies (save before read)

2. **useAdminDataLoader.ts**
   - Document dependencies on ProfileRow type, admin-list-profiles function
   - Document consumers: Admin.tsx, all admin sections
   - Document type consistency requirement

3. **utils/response.ts**
   - Document dependencies: None (base utility)
   - Document consumers: ALL Netlify functions, ALL frontend code
   - Document response format contract

4. **admin-list-profiles.ts**
   - Document dependencies: ProfileRow type, response utility
   - Document consumers: useAdminDataLoader, Admin.tsx
   - Document response format (success/ok fields)

### Phase 2: Medium Priority Files (20 min)

5. **admin-delete-user.ts**
   - Document dependencies: userDeletion utility, response utility
   - Document consumers: adminUserUtils, Admin.tsx
   - Document deletion order requirement

6. **adminUserUtils.ts**
   - Document dependencies: admin-delete-user function, response format
   - Document consumers: Admin.tsx
   - Document API response format contract

7. **admin-list-change-requests.ts**
   - Document dependencies: provider_change_requests table, response utility
   - Document consumers: Admin.tsx, ChangeRequestsSection
   - Document table name requirement

8. **utils/userDeletion.ts**
   - Document dependencies: Supabase client, profiles table structure
   - Document consumers: admin-delete-user, user-delete
   - Document deletion order requirement

---

## Dependency Graph

```
AuthContext.tsx
    ↓ (provides auth state)
Admin.tsx
    ↓ (uses profiles)
useAdminDataLoader.ts
    ↓ (calls)
admin-list-profiles.ts
    ↓ (returns)
ProfileRow type (types/admin.ts)
    ↓ (used by)
ResidentVerificationSection
```

```
admin-delete-user.ts
    ↓ (uses)
utils/userDeletion.ts
    ↓ (depends on)
profiles table structure
```

```
utils/response.ts
    ↓ (used by)
ALL Netlify functions
    ↓ (response format)
ALL frontend code
```

---

## Next Steps

1. Add dependency comments to each file
2. Document the dependency graph
3. Create a checklist for changes
4. Set up automated checks if possible

