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

### ✅ User Deletion System (TESTED & VERIFIED - 2025-01-XX)

**Recent Updates:**
- ✅ **Profile reload after deletion** - Prevents stale data, verified with business and customer account deletion
- ✅ **Email-only deletion** - Handles users without profiles, verified successfully deletes all email-keyed data
- ✅ **Complete deletion coverage** - Deletes from all tables: `funnel_responses`, `bookings`, `booking_events` (uses `customer_email`)
- ✅ **Testing Status:** Successfully deleted business accounts, customer accounts, and users without profiles

**Critical Pattern:**
> Always reload from database after deletion to verify it worked, and handle both cases: users WITH profiles (full deletion) and users WITHOUT profiles (email-only deletion).

See: `docs/prevention/CASCADING_FAILURES.md` - Sections #11 and #12

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

### ✅ New Critical Files (COMPLETED)

9. ✅ **src/utils/profileUtils.ts** ⭐ HIGH PRIORITY
   - Issue: New shared utility for profile updates (prevention system)
   - Dependencies: Supabase client, profiles table schema, localStorage (bf-pending-profile), auth user metadata
   - Consumers: Onboarding.tsx (current), AuthContext.tsx (future), AccountSettings.tsx (future)
   - Breaking Changes: Field completeness, validation logic, localStorage key format, CompleteProfileData interface
   - **Status:** ✅ Completed - dependency tracking added

10. ✅ **src/pages/Onboarding.tsx** ⭐ MEDIUM PRIORITY
   - Issue: Part of signup flow, uses profileUtils
   - Dependencies: profileUtils, localStorage (bf-pending-profile, bf-return-url), resident verification utils, Supabase auth
   - Consumers: SignIn.tsx → Onboarding.tsx signup flow, App.tsx routing, AuthContext, Admin panel
   - Breaking Changes: profileUtils API, localStorage keys, resident verification flow, password validation, redirect logic
   - **Status:** ✅ Completed - dependency tracking added

### ✅ Navigation State Management (COMPLETED)

11. ✅ **src/hooks/useAdminVerification.ts** ⭐ HIGH PRIORITY
   - Issue: Navigation logout bug (wrong check order)
   - Dependencies: AuthContext (email, loading, isAuthed, userId), Supabase session, admin-verify function
   - Consumers: Admin.tsx, any page using admin verification
   - Breaking Changes: Check order (loading → verified → email), state preservation during navigation
   - **Status:** ✅ Fixed and documented
   - **Fix Applied:** Reordered checks to preserve verified admin status during navigation

### ✅ Additional Critical Files (COMPLETED)

12. ✅ **src/pages/SignIn.tsx** ⭐ HIGH PRIORITY
   - Issue: Critical signup flow file, saves to localStorage
   - Dependencies: AuthContext, localStorage ('bf-pending-profile', 'bf-return-url'), residentVerification utils
   - Consumers: Onboarding.tsx, AuthContext.tsx, profileUtils.ts
   - Breaking Changes: localStorage key changes, localStorage format changes, auth.signUpWithEmail() API
   - **Status:** ✅ Completed - dependency tracking added

13. ✅ **src/pages/account/components/AccountSettings.tsx** ⭐ MEDIUM PRIORITY
   - Issue: Updates profiles directly (should migrate to profileUtils)
   - Dependencies: dataLoader (updateProfile, loadEmailPreferences), profiles table, email_preferences table
   - Consumers: Account.tsx, all users updating profiles
   - Breaking Changes: updateProfile() API, email preferences API, RLS policies
   - **Status:** ✅ Completed - dependency tracking added
   - **Future Work:** Migrate to use updateUserProfile() from profileUtils.ts

14. ✅ **netlify/functions/admin-verify.ts** ⭐ HIGH PRIORITY
   - Issue: Used by useAdminVerification hook for server-side verification
   - Dependencies: utils/authAdmin, utils/response, admin_audit_log table
   - Consumers: useAdminVerification.ts, Admin.tsx
   - Breaking Changes: verifyAuthAndAdmin() API, response format changes
   - **Status:** ✅ Completed - dependency tracking added

### ✅ Immutable Database Fields Fix (COMPLETED)

**Issue:** `profiles.role is immutable once set` error on login  
**File:** `src/utils/profileUtils.ts`  
**Fix:** Added check to exclude immutable fields from update payload if already set

**What Was Fixed:**
- `updateUserProfile()` now checks if `role` is already set before UPDATE
- If `role` is already set, it's excluded from update payload (immutable field)
- Only sets `role` during INSERT (when profile doesn't exist)
- Prevents 400 errors on login for existing users with roles

**Documentation Added:**
- New section in `CASCADING_FAILURES.md` (#8: Immutable Database Fields)
- Updated dependency tracking comment in `profileUtils.ts` (recent breaks section)
- Added to smoke test checklist in CASCADING_FAILURES.md

**Files Updated:**
- `src/utils/profileUtils.ts` - Added immutable field check
- `src/contexts/AuthContext.tsx` - Simplified (now handled in profileUtils)
- `docs/prevention/CASCADING_FAILURES.md` - New section #8
- `docs/prevention/DEPENDENCY_TRACKING_PLAN.md` - Recent breaks section

**Status:** ✅ Completed - immutable field handling implemented and documented

See: `docs/prevention/CASCADING_FAILURES.md` - Section #8

### ✅ Incomplete User Deletion Fix (COMPLETED)

**Issue:** Admin/user deletion only deleted some related data, leaving orphaned records  
**File:** `netlify/functions/utils/userDeletion.ts`  
**Fix:** Added deletion logic for all missing user-related tables

**What Was Fixed:**
- Added deletion for 9 missing tables:
  - `user_saved_events` (saved calendar events)
  - `saved_providers` (saved businesses)
  - `coupon_redemptions` (saved coupons)
  - `calendar_events` (events created by user)
  - `business_applications` (business listing applications)
  - `event_flags` (event flags by user)
  - `event_votes` (event votes by user)
  - `email_preferences` (email settings)
  - `dismissed_notifications` (dismissed notifications)
- Deletion now handles all 17+ tables with user-related data
- Complete deletion ensures no orphaned records remain

**Documentation Added:**
- New section in `CASCADING_FAILURES.md` (#9: Incomplete Deletion Logic)
- Updated dependency tracking comment in `userDeletion.ts`
- Documented all tables that must be deleted in deletion utility
- Added checklist for finding all user-related tables

**Files Updated:**
- `netlify/functions/utils/userDeletion.ts` - Added 9 missing deletion steps
- `docs/prevention/CASCADING_FAILURES.md` - New section #9
- `docs/prevention/DEPENDENCY_TRACKING_PLAN.md` - Recent breaks section
- `docs/prevention/DEPENDENCY_TRACKING_COMPLETE.md` - Status update

**Status:** ✅ Completed - comprehensive user deletion implemented and documented

See: `docs/prevention/CASCADING_FAILURES.md` - Section #9

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
9. profileUtils.ts → Immutable role error on login (fixed)
10. useAdminVerification.ts → Navigation logout bug (fixed)
11. userDeletion.ts → Incomplete user deletion leaving orphaned records (fixed)
12. CustomerUsersSection-2025-10-19.tsx → Missing props in destructuring causing "is not a function" error (fixed)
13. adminUserUtils.ts → Stale data after deletion (deleted users reappear on refresh) (fixed)
14. adminUserUtils.ts → Cannot delete users without profiles (fixed)
15. business_applications RLS policies → Duplicate policies blocking inserts (fixed)

---

## Next Steps

1. ✅ All recently broken files (8 files) have dependency tracking comments
2. ✅ Added dependency tracking to `useAdminVerification.ts` (navigation logout fix)
3. ✅ Added dependency tracking to `profileUtils.ts` (critical - high priority)
4. ✅ Added dependency tracking to `Onboarding.tsx` (important - medium priority)
5. ✅ Added dependency tracking to `SignIn.tsx` (critical - high priority)
6. ✅ Added dependency tracking to `AccountSettings.tsx` (important - medium priority)
7. ✅ Added dependency tracking to `admin-verify.ts` (critical - high priority)
8. ✅ Set up automated checks for breaking changes (completed)
9. ✅ Refactored `AuthContext.tsx` to use `updateUserProfile()` from profileUtils (completed)
10. ✅ Refactored `AccountSettings.tsx` (via dataLoader.ts) to use `updateUserProfile()` from profileUtils (completed)
11. ✅ Fixed immutable role error in `profileUtils.ts` - handles immutable database fields (completed)
12. ✅ Fixed incomplete user deletion - added deletion for all missing user-related tables (completed)
13. ✅ Fixed missing props in destructuring in `CustomerUsersSection-2025-10-19.tsx` - added missing props and guard checks (completed)
14. ✅ Fixed stale data after deletion in `adminUserUtils.ts` - added profile reload after deletion to verify deletion worked (completed, tested with business and customer accounts)
15. ✅ Fixed users without profiles deletion in `adminUserUtils.ts` - added `deleteUserByEmailOnly()` to handle users without profiles (completed, tested successfully)
        - ✅ Successfully deletes from `funnel_responses`, `bookings`, and `booking_events` tables
        - ✅ Note: `booking_events` uses `customer_email` column, not `user_email`
16. ✅ Fixed name clearing during auth refresh in `AuthContext.tsx` and `profileUtils.ts` - preserve existing data when null/undefined is passed (completed, tested successfully)
        - ✅ Names preserved during auth refresh/login
        - ✅ Names still saved correctly during signup
        - ✅ Names can still be updated in account settings
17. ✅ Fixed business applications RLS policy blocking inserts (2025-01-XX) - removed duplicate policies and created single public INSERT policy (completed, tested successfully)
        - ✅ Removed duplicate `applications_insert_all` and `applications_insert_public` policies
        - ✅ Created single `applications_insert_public` policy matching master RLS file
        - ✅ Security maintained: SELECT/DELETE policies still enforce email matching
        - ✅ Users can now submit business applications without RLS errors
        - ✅ See: `docs/prevention/BUSINESS_APPLICATIONS_INSERT_RLS_FIX.md` for complete dependency tracking
        - ✅ See: `docs/prevention/CASCADING_FAILURES.md` - Section #24 for RLS policy prevention patterns
18. ✅ Fixed direct Supabase queries breaking after refactoring (2025-01-XX) - migrated adminService.ts and BusinessPage.tsx to centralized utility (completed)
        - ✅ Migrated `adminService.ts` to use centralized `query()`, `update()`, and `deleteRows()` utilities
        - ✅ Migrated `BusinessPage.tsx` to use centralized `insert()` utility
        - ✅ Added new section to CASCADING_FAILURES.md (#25) documenting this pattern
        - ✅ Updated smoke test checklist to include verification of centralized utility usage
        - ✅ Added prevention checklist for finding and migrating direct Supabase queries
        - ✅ See: `docs/prevention/CASCADING_FAILURES.md` - Section #25 for complete prevention patterns
  19. ⏳ Set up integration tests that verify dependencies (future)

---

## Benefits

With dependency tracking comments:

- ✅ **Clear documentation** of what depends on what
- ✅ **Breaking changes** are documented before they happen
- ✅ **Safe update paths** are provided
- ✅ **Related files** are identified
- ✅ **Recent breaks** are documented for reference

This should significantly reduce cascading failures going forward!

