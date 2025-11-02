# Dependency Tracking Comments - Implementation Complete

## Summary

Added comprehensive dependency tracking comments to all files that broke recently. These comments document:
- What each file depends on
- What depends on each file
- Breaking changes to watch for
- How to safely update each file
- Related files that need to be updated together

---

## Files Updated with Dependency Tracking

### ✅ High Priority (Recently Broken)

1. **src/contexts/AuthContext.tsx** ⭐
   - Issue: Name display after signup
   - Dependencies: localStorage, Supabase auth, profiles table, ensureProfile()
   - Consumers: Admin.tsx, Account.tsx, useAdminDataLoader, all pages
   - Breaking Changes: Async order, localStorage keys, auth state structure

2. **src/hooks/useAdminDataLoader.ts** ⭐
   - Issue: Resident verification empty (duplicate ProfileRow type)
   - Dependencies: AuthContext, ProfileRow type, admin-list-profiles, successResponse()
   - Consumers: Admin.tsx, ResidentVerificationSection, UsersSection
   - Breaking Changes: ProfileRow type, response format, auth.email

3. **netlify/functions/admin-list-profiles.ts** ⭐
   - Issue: API response format mismatch
   - Dependencies: verifyAuthAndAdmin(), successResponse(), profiles table
   - Consumers: useAdminDataLoader, Admin.tsx, ResidentVerificationSection
   - Breaking Changes: Response format, ProfileRow type, successResponse()

4. **netlify/functions/utils/response.ts** ⭐
   - Issue: Inconsistent response format (result.ok vs result.success)
   - Dependencies: CORS_HEADERS
   - Consumers: ALL Netlify functions, ALL frontend code
   - Breaking Changes: Response format affects EVERYTHING

### ✅ Medium Priority

5. **netlify/functions/admin-delete-user.ts**
   - Issue: User deletion failing (wrong order)
   - Dependencies: verifyAuthAndAdmin(), utils/userDeletion, utils/response
   - Consumers: adminUserUtils, Admin.tsx, UsersSection
   - Breaking Changes: Deletion order, response format

6. **src/utils/adminUserUtils.ts**
   - Issue: API response format mismatch
   - Dependencies: admin-delete-user, AuthContext, successResponse()
   - Consumers: Admin.tsx, UsersSection
   - Breaking Changes: Response format, session token format

7. **netlify/functions/admin-list-change-requests.ts**
   - Issue: Wrong table name (owner_change_requests vs provider_change_requests)
   - Dependencies: verifyAuthAndAdmin(), provider_change_requests table, utils/response
   - Consumers: Admin.tsx, ChangeRequestsSection
   - Breaking Changes: Table name, response format, table schema

8. **netlify/functions/utils/userDeletion.ts**
   - Issue: New shared utility (prevention measure)
   - Dependencies: SupabaseClient, table schemas
   - Consumers: admin-delete-user, user-delete
   - Breaking Changes: Deletion order, table schema

---

## Dependency Tracking Format

All files now include this standard format:

```typescript
/**
 * DEPENDENCY TRACKING
 * 
 * WHAT THIS DEPENDS ON:
 * - [dependency]: Why it matters
 * 
 * WHAT DEPENDS ON THIS:
 * - [consumer]: What breaks if this changes
 * 
 * BREAKING CHANGES:
 * - If you change X → Y breaks
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Check dependencies first
 * 2. Check all consumers
 * 3. Update related files together
 * 4. Test everything
 * 
 * RELATED FILES:
 * - [file]: Why related
 * 
 * RECENT BREAKS:
 * - [issue]: Fix applied
 * 
 * See: docs/prevention/[relevant-guide].md
 */
```

---

## How to Use This Information

### Before Making Any Change:

1. **Read the dependency tracking comment** in the file you're changing
2. **Check all dependencies** - are they still valid?
3. **Check all consumers** - will they break?
4. **Read the breaking changes section** - what could go wrong?
5. **Follow the "HOW TO SAFELY UPDATE" steps**
6. **Test all related files** from the "RELATED FILES" section

### Example Workflow:

```bash
# You want to change AuthContext.tsx:

# 1. Read dependency tracking comment
# 2. Check dependencies:
grep -r "bf-pending-profile" src/  # localStorage key
grep -r "auth.name" src/            # All consumers

# 3. Check consumers:
# - Admin.tsx: Uses auth.name
# - Account.tsx: Uses auth.name
# - useAdminDataLoader: Uses auth.email

# 4. Test everything:
# - Signup flow
# - Admin page
# - Resident verification
# - Account page
```

---

## Prevention Strategies

Each dependency tracking comment includes:

1. **Dependencies**: What this file needs to work
2. **Consumers**: What depends on this file
3. **Breaking Changes**: What breaks if changed
4. **Safe Update Steps**: How to change without breaking
5. **Related Files**: Files that need to be updated together
6. **Recent Breaks**: What broke before and how it was fixed

---

## Quick Reference

### Files That Broke Recently (in order):

1. AuthContext.tsx → Name display issue
2. useAdminDataLoader.ts → Resident verification empty
3. admin-list-profiles.ts → API response format
4. response.ts → Response format inconsistency
5. admin-delete-user.ts → User deletion failing
6. admin-list-change-requests.ts → Wrong table name
7. adminUserUtils.ts → API response parsing
8. userDeletion.ts → New utility (prevention)

---

## Next Steps

1. ✅ All recently broken files have dependency tracking comments
2. ⏳ Add dependency tracking to other critical files (future)
3. ⏳ Create automated checks for breaking changes (future)
4. ⏳ Set up integration tests that verify dependencies (future)

---

## Benefits

With dependency tracking comments:

- ✅ **Clear documentation** of what depends on what
- ✅ **Breaking changes** are documented before they happen
- ✅ **Safe update paths** are provided
- ✅ **Related files** are identified
- ✅ **Recent breaks** are documented for reference

This should significantly reduce cascading failures going forward!

