# Dependency Tracking Comments - Implementation Plan

**See Also:**
- `DATA_INTEGRITY_PREVENTION.md` - **CRITICAL**: Prevents missing fields in profile updates (like missing name during signup)

## Goal
Add comprehensive dependency tracking comments to all files that broke recently to prevent cascading failures.

---

## Files That Broke Recently

### ✅ Phase 1: High Priority Files (COMPLETED)

### 1. ✅ **AuthContext.tsx** ⭐ HIGH PRIORITY
**Issue:** Name display after signup  
**Break Chain:** AuthContext → useAdminDataLoader → ResidentVerificationSection  
**Status:** ✅ Fixed, dependency tracking added

### 2. ✅ **useAdminDataLoader.ts** ⭐ HIGH PRIORITY
**Issue:** Resident verification empty (duplicate ProfileRow type)  
**Break Chain:** Netlify function → useAdminDataLoader → ResidentVerificationSection  
**Status:** ✅ Fixed, dependency tracking added

### 3. ✅ **admin-list-profiles.ts** ⭐ HIGH PRIORITY
**Issue:** API response format (result.ok vs result.success)  
**Break Chain:** admin-list-profiles → useAdminDataLoader → Admin.tsx  
**Status:** ✅ Fixed, dependency tracking added

### 4. ✅ **utils/response.ts** ⭐ HIGH PRIORITY
**Issue:** Inconsistent response format  
**Break Chain:** ALL Netlify functions → ALL frontend code  
**Status:** ✅ Fixed, dependency tracking added

### ✅ Phase 2: Medium Priority Files (COMPLETED)

### 5. ✅ **admin-delete-user.ts** ⭐ MEDIUM PRIORITY
**Issue:** User deletion failing (wrong order)  
**Break Chain:** admin-delete-user → adminUserUtils → Admin.tsx  
**Status:** ✅ Fixed, dependency tracking added
**Recent Update (2025-01-XX):** Added deleteBusinesses parameter support
- ✅ Accepts deleteBusinesses parameter (true = hard delete, false = soft delete)
- ✅ Passes parameter to userDeletion utility
- ✅ Dependency tracking updated to document business deletion logic

### 6. ✅ **adminUserUtils.ts** ⭐ MEDIUM PRIORITY
**Issue:** API response format mismatch  
**Break Chain:** admin-delete-user → adminUserUtils → Admin.tsx  
**Status:** ✅ Fixed, dependency tracking added
**Recent Update (2025-01-XX):** Added business deletion prompt for admin
- ✅ Checks for businesses before deletion (queries providers table)
- ✅ Prompts admin about deleting businesses if user has businesses
- ✅ Passes deleteBusinesses parameter to backend
- ✅ Success message indicates what happened with businesses
- ✅ Dependency tracking updated to document business check logic and RLS requirements

### 7. ✅ **admin-list-change-requests.ts** ⭐ MEDIUM PRIORITY
**Issue:** Wrong table name (owner_change_requests vs provider_change_requests)  
**Break Chain:** admin-list-change-requests → Admin.tsx  
**Status:** ✅ Fixed, dependency tracking added

### 8. ✅ **utils/userDeletion.ts** ⭐ MEDIUM PRIORITY
**Issue:** New shared utility (prevention)  
**Break Chain:** user-delete → admin-delete-user → userDeletion utility  
**Status:** ✅ Fixed, dependency tracking added
**Recent Update (2025-01-XX):** Added deleteBusinesses parameter support
- ✅ Handles hard delete (deleteBusinesses=true) - permanently removes businesses
- ✅ Handles soft delete (deleteBusinesses=false) - unlinks businesses (owner_user_id=null, badges=['deleted'])
- ✅ Dependency tracking updated to document providers table requirements and deletion logic

---

## New Critical Files (Need Dependency Tracking)

### 9. **profileUtils.ts** ⭐ HIGH PRIORITY
**Issue:** New shared utility for profile updates (prevention)  
**Break Chain:** Onboarding.tsx → AuthContext.tsx → profileUtils → profiles table  
**Status:** ⚠️ New, needs dependency tracking  
**Why Critical:** This is the single source of truth for ALL profile updates. Any change here affects ALL signup flows.

### 10. **Onboarding.tsx** ⭐ MEDIUM PRIORITY
**Issue:** Part of signup flow, uses profileUtils  
**Break Chain:** SignIn.tsx → Onboarding.tsx → profileUtils → profiles table  
**Status:** ⚠️ Uses profileUtils, should have dependency tracking  
**Why Important:** This is where business account signups complete their profile. Missing fields here cause incomplete profiles.

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

## Implementation Status

### ✅ Phase 1: High Priority Files (COMPLETED - 30 min)

1. ✅ **AuthContext.tsx**
   - ✅ Documented dependencies on localStorage, Supabase, ensureProfile
   - ✅ Documented consumers: Admin pages, Account pages, SignIn
   - ✅ Documented order dependencies (save before read)
   - ✅ Links to ASYNC_FLOW_PREVENTION.md

2. ✅ **useAdminDataLoader.ts**
   - ✅ Documented dependencies on ProfileRow type, admin-list-profiles function
   - ✅ Documented consumers: Admin.tsx, all admin sections
   - ✅ Documented type consistency requirement
   - ✅ Removed duplicate ProfileRow type definition

3. ✅ **utils/response.ts**
   - ✅ Documented dependencies: CORS_HEADERS
   - ✅ Documented consumers: ALL Netlify functions, ALL frontend code
   - ✅ Documented response format contract (success/ok fields)
   - ✅ Links to API_CONTRACT_PREVENTION.md

4. ✅ **admin-list-profiles.ts**
   - ✅ Documented dependencies: ProfileRow type, response utility
   - ✅ Documented consumers: useAdminDataLoader, Admin.tsx
   - ✅ Documented response format (success/ok fields)

### ✅ Phase 2: Medium Priority Files (COMPLETED - 20 min)

5. ✅ **admin-delete-user.ts**
   - ✅ Documented dependencies: userDeletion utility, response utility
   - ✅ Documented consumers: adminUserUtils, Admin.tsx
   - ✅ Documented deletion order requirement

6. ✅ **adminUserUtils.ts**
   - ✅ Documented dependencies: admin-delete-user function, response format
   - ✅ Documented consumers: Admin.tsx
   - ✅ Documented API response format contract

7. ✅ **admin-list-change-requests.ts**
   - ✅ Documented dependencies: provider_change_requests table, response utility
   - ✅ Documented consumers: Admin.tsx, ChangeRequestsSection
   - ✅ Documented table name requirement

8. ✅ **utils/userDeletion.ts**
   - ✅ Documented dependencies: Supabase client, profiles table structure
   - ✅ Documented consumers: admin-delete-user, user-delete
   - ✅ Documented deletion order requirement

### ✅ Phase 3: New Critical Files (COMPLETED)

9. ✅ **profileUtils.ts** ⭐ HIGH PRIORITY
   - ✅ Documented dependencies: Supabase client, profiles table schema, localStorage (bf-pending-profile), auth user metadata
   - ✅ Documented consumers: Onboarding.tsx (current), AuthContext.tsx (future), AccountSettings.tsx (future)
   - ✅ Documented field completeness requirement (ALL fields must be included)
   - ✅ Documented validation logic and breaking changes
   - ✅ Link to DATA_INTEGRITY_PREVENTION.md and CASCADING_FAILURES.md
   - **Why Critical:** This is the single source of truth for ALL profile updates. Changing this affects every signup flow.
   - **Status:** ✅ Completed - dependency tracking added

10. ✅ **Onboarding.tsx** ⭐ MEDIUM PRIORITY
   - ✅ Documented dependencies: profileUtils, localStorage (bf-pending-profile, bf-return-url), resident verification utils, Supabase auth
   - ✅ Documented consumers: SignIn.tsx → Onboarding.tsx flow, App.tsx routing, AuthContext, Admin panel
   - ✅ Documented that it's part of business account signup flow
   - ✅ Documented name retrieval from localStorage and auth metadata
   - ✅ Link to DATA_INTEGRITY_PREVENTION.md and CASCADING_FAILURES.md
   - **Status:** ✅ Completed - dependency tracking added

### ✅ Phase 4: Navigation State Management (COMPLETED)

11. ✅ **useAdminVerification.ts** ⭐ HIGH PRIORITY
   - ✅ Documented dependencies: AuthContext, Supabase session, admin-verify function
   - ✅ Documented consumers: Admin.tsx, any page using admin verification
   - ✅ Documented check order (loading → verified → email)
   - ✅ Documented state preservation during navigation
   - ✅ Link to CASCADING_FAILURES.md
   - **Why Critical:** Wrong check order causes logout during navigation
   - **Status:** ✅ Fixed and documented

---

## Dependency Graph

### Authentication & Profile Flow

```
SignIn.tsx
    ↓ (saves to localStorage: bf-pending-profile)
Onboarding.tsx
    ↓ (uses)
profileUtils.ts (updateUserProfile)
    ↓ (saves to)
profiles table
    ↓ (reads from)
AuthContext.tsx
    ↓ (provides auth state)
Admin.tsx, Account.tsx, all pages
```

### Admin Data Loading

```
Admin.tsx
    ↓ (uses profiles)
useAdminDataLoader.ts
    ↓ (calls)
admin-list-profiles.ts
    ↓ (returns)
ProfileRow type (types/admin.ts)
    ↓ (used by)
ResidentVerificationSection, CustomerUsersSection
```

### User Deletion Flow

```
admin-delete-user.ts
    ↓ (uses)
utils/userDeletion.ts
    ↓ (depends on)
profiles table structure
```

### API Response Format

```
utils/response.ts
    ↓ (used by)
ALL Netlify functions
    ↓ (response format)
ALL frontend code
```

### Profile Updates (New - Critical)

```
profileUtils.ts (updateUserProfile)
    ↓ (used by)
Onboarding.tsx
    ↓ (future: will use)
AuthContext.tsx (ensureProfile → updateUserProfile)
    ↓ (future: will use)
AccountSettings.tsx
```

### Admin Verification & Navigation (Critical)

```
AuthContext.tsx (provides auth.email, auth.loading)
    ↓ (consumed by)
useAdminVerification.ts
    ↓ (checks in order: loading → verified → email)
Admin.tsx (uses isAdmin)
    ↓ (during navigation)
Provider pages, other pages
    ↓ (CRITICAL: Must preserve admin status during navigation)
```

**Key Rule:** Always check in this order:
1. Loading state (preserve current state)
2. Verified state (preserve if verified)
3. Actual values (only set false if not verified)

---

## Next Steps

1. ✅ **COMPLETED:** Added dependency comments to 8 recently broken files
2. ✅ **COMPLETED:** Documented the dependency graph
3. ✅ **COMPLETED:** Created checklists in prevention guides
4. ✅ **COMPLETED:** Added dependency tracking to `profileUtils.ts` (critical)
5. ✅ **COMPLETED:** Added dependency tracking to `Onboarding.tsx` (important)
6. ✅ **COMPLETED:** Set up automated checks for breaking changes
7. ✅ **COMPLETED:** Added dependency tracking to additional critical files
   - ✅ SignIn.tsx (critical signup flow)
   - ✅ AccountSettings.tsx (profile updates)
   - ✅ admin-verify.ts (admin verification)
8. ✅ **COMPLETED:** Refactored AuthContext.tsx and AccountSettings.tsx (via dataLoader.ts) to use `updateUserProfile()` from profileUtils
   - ✅ AuthContext.tsx: ensureProfile() now uses updateUserProfile()
   - ✅ dataLoader.ts: updateProfile() now uses updateUserProfile()
   - ✅ All profile updates now go through centralized utility

---

## ✅ Testing Status (2025-01-XX)

**User Deletion System - TESTED & VERIFIED:**
- ✅ **Business Account Deletion** - Successfully tested (complete deletion with profile reload)
- ✅ **Customer Account Deletion** - Successfully tested (complete deletion with profile reload)
- ✅ **Users Without Profiles** - Successfully tested (email-only deletion from all tables)
- ✅ **Profile Reload** - Verified deleted users don't reappear after page refresh
- ✅ **Complete Coverage** - Verified deletion removes data from all email-keyed tables:
  - `funnel_responses` (by `user_email`)
  - `bookings` (by `user_email`)
  - `booking_events` (by `customer_email` - note: different column name!)

**Critical Patterns Verified:**
1. Profile reload after deletion prevents stale data
2. Handling both cases (with/without profiles) works correctly
3. Remember `booking_events` uses `customer_email` column (not `user_email`)

---

## Recent Additions (2025-01-XX)

### New Prevention System Created

**`profileUtils.ts`** - Centralized profile update utility:
- Prevents missing fields during profile updates
- Ensures ALL fields (name, email, role, resident verification) are included
- Validates data before saving
- Provides `getNameFromMultipleSources()` for signup flows
- See: `docs/prevention/DATA_INTEGRITY_PREVENTION.md`

**Why This Needs Dependency Tracking:**
- `Onboarding.tsx` now uses `updateUserProfile()` instead of direct Supabase calls
- `AuthContext.tsx` should be refactored to use `updateUserProfile()` (future work)
- `AccountSettings.tsx` should be refactored to use `updateUserProfile()` (future work)
- Any change to `profileUtils.ts` affects ALL signup flows

**Action Required:**
- Add dependency tracking comment to `profileUtils.ts`
- Add dependency tracking comment to `Onboarding.tsx`
- Update `DEPENDENCY_TRACKING_COMPLETE.md` after completion

---

### Navigation State Management Fix (2025-01-XX)

**Issue:** Admin logout during navigation between pages  
**File:** `src/hooks/useAdminVerification.ts`  
**Fix:** Reordered state checks to preserve verified admin status during navigation

**What Was Fixed:**
- Changed check order: `loading` → `verified` → `email` (was: `email` → `loading`)
- Added state preservation: If previously verified, preserve admin status even if email temporarily missing
- Prevents logout during React navigation when auth state temporarily changes

**Documentation Added:**
- Dependency tracking comment in `useAdminVerification.ts`
- New section in `CASCADING_FAILURES.md` (#7: State Reset During Navigation)
- Updated smoke test checklist to include navigation tests
- Added to dependency tracking plan and complete documents

**Key Rule for Future Code:**
> When checking state values during navigation, check in this order:
> 1. Loading state (preserve current state)
> 2. Verified/authenticated state (preserve if verified)
> 3. Actual values (only set false if not verified)

See: `docs/prevention/CASCADING_FAILURES.md` - Section #7

---

### Profile Update Centralization (2025-01-XX)

**Issue:** Profile updates scattered across multiple files, causing missing fields  
**Files Refactored:** `AuthContext.tsx`, `dataLoader.ts` (used by `AccountSettings.tsx`)  
**Fix:** Centralized all profile updates to use `updateUserProfile()` from `profileUtils.ts`

**What Was Refactored:**
1. `AuthContext.tsx`: `ensureProfile()` now uses `updateUserProfile()` instead of direct Supabase calls
2. `dataLoader.ts`: `updateProfile()` now uses `updateUserProfile()` instead of direct Supabase calls
3. All profile updates now ensure ALL fields (name, email, role, resident verification) are preserved

**Benefits:**
- ✅ Single source of truth for profile updates
- ✅ Field completeness guaranteed (no missing fields)
- ✅ Validation before saving
- ✅ Automatic INSERT vs UPDATE handling
- ✅ Consistent error handling across all profile updates

**Documentation Updated:**
- Dependency tracking comments updated in both files
- Recent breaks section updated to reflect refactoring
- Master tracking documents updated

See: `docs/prevention/DATA_INTEGRITY_PREVENTION.md`

---

### Immutable Database Fields Fix (2025-01-XX)

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
- Updated dependency tracking comment in `profileUtils.ts`
- Documented immutable field handling in safe update procedures
- Added to smoke test checklist

**Key Rule for Future Code:**
> When updating database records, check immutable fields first:
> 1. Query existing record to check immutable fields
> 2. If immutable field is already set, exclude it from update payload
> 3. Only include immutable fields if they're not set yet (null/undefined)

**Files Updated:**
- `src/utils/profileUtils.ts` - Added immutable field check
- `src/contexts/AuthContext.tsx` - Simplified (now handled in profileUtils)

See: `docs/prevention/CASCADING_FAILURES.md` - Section #8

---

### Async Operation Order Fix in SIGNED_IN Handler (2025-01-XX)

**Issue:** Name not stored/displayed during signup - "Hi, User" instead of actual name  
**File:** `src/contexts/AuthContext.tsx` - SIGNED_IN event handler  
**Fix:** Fixed async operation order - read localStorage FIRST, then save, then read from database

**What Was Fixed:**
- SIGNED_IN handler now reads from localStorage BEFORE fetching from database
- Name from localStorage is included in ensureProfile() payload when present
- Added debug logging to track name flow during signup
- Fixed order: localStorage → save to database → read from database → update state

**Root Cause:**
- Code was reading from database BEFORE saving name during signup
- Database query returned undefined/null (name wasn't saved yet)
- Name was set to undefined before it could be saved
- Result: Name saved to database but already lost in state

**Documentation Added:**
- New section in `CASCADING_FAILURES.md` (#14: Async Operation Order in SIGNED_IN Handler)
- Updated dependency tracking comment in `AuthContext.tsx`
- Added debug logging to track name flow
- Documented correct operation order in code comments

**Key Rule for Future Code:**
> During signup, ALWAYS follow this order:
> 1. Read from localStorage (contains signup form data)
> 2. Save to database (write data we just read)
> 3. Read from database (verify data was saved)
> 4. Update state (display the data)
>
> NEVER read from database before saving during signup!

**Files Updated:**
- `src/contexts/AuthContext.tsx` - Fixed SIGNED_IN handler order
- `src/contexts/AuthContext.tsx` - ensureProfile() now includes name in payload when present
- Added debug logging to track name flow (dev mode only)

**Prevention:**
- Always read from localStorage FIRST during signup
- Always save to database BEFORE reading from it during signup
- Add debug logging to verify correct order
- Test signup flow: name must appear immediately after signup

See: `docs/prevention/CASCADING_FAILURES.md` - Section #14  
See: `docs/prevention/ASYNC_FLOW_PREVENTION.md` - Async flow patterns

---

### Incomplete User Deletion Fix (2025-01-XX)

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
- Documented all tables that must be deleted
- Added checklist for finding all user-related tables

**Key Rule for Future Code:**
> When implementing user deletion, find ALL tables that reference the user:
> 1. Search for `user_id` columns across all tables
> 2. Search for `owner_user_id` columns across all tables
> 3. Search for `email` columns that might reference the user
> 4. Delete from ALL of these tables before deleting the auth user
> 5. Test with a user that has data in every possible table

**Files Updated:**
- `netlify/functions/utils/userDeletion.ts` - Added 9 missing deletion steps
- `netlify/functions/admin-delete-user.ts` - Uses updated utility (no changes needed)
- `netlify/functions/user-delete.ts` - Uses updated utility (no changes needed)

See: `docs/prevention/CASCADING_FAILURES.md` - Section #9

---

### Missing Props in Destructuring Fix (2025-01-XX)

**Issue:** `deleteCustomerUserByEmail is not a function` error in CustomerUsersSection  
**File:** `src/components/admin/sections/CustomerUsersSection-2025-10-19.tsx`  
**Fix:** Added missing props to destructuring and guard checks

**What Was Fixed:**
- Added `onDeleteCustomerUser` and `deleteCustomerUserByEmail` to prop destructuring
- Added guard check before calling `deleteCustomerUserByEmail` (`if (!prop) return`)
- Made onClick handler async to properly await the async function
- Prevents runtime errors when props are called without being destructured

**Documentation Added:**
- New section in `CASCADING_FAILURES.md` (#10: Missing Props in Destructuring)
- Updated smoke test checklist to include prop verification
- Documented common patterns for missing props

**Key Rule for Future Code:**
> When destructuring props, include ALL props from the interface:
> 1. Copy all prop names from interface to destructuring
> 2. If a prop isn't used, prefix it with `_` to indicate it's intentionally unused
> 3. Add guard checks before calling function props (defensive programming)
> 4. Use TypeScript to catch missing props at compile time

**Files Updated:**
- `src/components/admin/sections/CustomerUsersSection-2025-10-19.tsx` - Added missing props to destructuring

See: `docs/prevention/CASCADING_FAILURES.md` - Section #10

---

### Stale Data After Deletion Fix (2025-01-XX)

**Issue:** Deleted users reappear after page refresh  
**File:** `src/utils/adminUserUtils.ts`  
**Fix:** Added profile reload after deletion to verify deletion worked

**What Was Fixed:**
- After successful deletion, reload profiles from database (via admin-list-profiles)
- Update local state with fresh data from database (not just filtered local state)
- Verify deletion actually worked by checking database state
- Fallback to local update if reload fails
- Prevents deleted users from reappearing on page refresh

**Documentation Added:**
- New section in `CASCADING_FAILURES.md` (#11: Stale Data After Deletion)
- Updated dependency tracking comment in `adminUserUtils.ts`
- Documented reload pattern for all deletion operations
- Added to smoke test checklist

**Key Rule for Future Code:**
> When deleting data, always reload from database after deletion:
> 1. Call deletion function (backend deletes data)
> 2. Reload data from database (verify deletion worked)
> 3. Update local state with fresh data (ensures consistency)
> 4. On page refresh, deleted data won't reappear (because it's actually deleted)

**Files Updated:**
- `src/utils/adminUserUtils.ts` - Added profile reload after deletion

**Testing Verified (2025-01-XX):**
- ✅ Successfully deleted business accounts (complete deletion with profile reload)
- ✅ Successfully deleted customer accounts (complete deletion with profile reload)
- ✅ Deleted users don't reappear after page refresh
- ✅ Profile reload verifies deletion worked correctly

See: `docs/prevention/CASCADING_FAILURES.md` - Section #11

---

### Users Without Profiles Fix (2025-01-XX)

**Issue:** Cannot delete users who only exist in funnels/bookings without profiles  
**File:** `src/utils/adminUserUtils.ts`, `src/pages/Admin.tsx`  
**Fix:** Added `deleteUserByEmailOnly()` function to handle users without profiles

**What Was Fixed:**
- Added `deleteUserByEmailOnly()` function for users without profiles
- Updated `deleteCustomerUserByEmail` to handle both cases (with/without profile)
- If user has profile → delete everything (auth user, profile, all data)
- If no profile → delete email-keyed data only (funnels, bookings, booking_events)
- Note: `booking_events` table uses `customer_email` column, not `user_email`
- Shows appropriate message explaining what was deleted
- Cannot delete auth user without profile (no userId)

**Documentation Added:**
- New section in `CASCADING_FAILURES.md` (#12: Users Without Profiles)
- Updated dependency tracking comment in `adminUserUtils.ts`
- Documented email-only deletion pattern
- Added to smoke test checklist

**Key Rule for Future Code:**
> When deleting by email, handle both cases:
> 1. Check if profile exists for this email
> 2. If profile exists: Delete everything (auth user, profile, all data)
> 3. If no profile: Delete email-keyed data only (funnels, bookings, booking_events)
> 4. Note: `booking_events` table uses `customer_email` column, not `user_email`
> 5. Cannot delete auth user without profile (no userId)
> 6. Show message explaining what was deleted

**Files Updated:**
- `src/utils/adminUserUtils.ts` - Added `deleteUserByEmailOnly()` function
- `src/pages/Admin.tsx` - Updated `deleteCustomerUserByEmail` to handle both cases

**Testing Verified (2025-01-XX):**
- ✅ Successfully deleted users without profiles (email-only data deletion)
- ✅ Deletion removes data from all email-keyed tables: `funnel_responses`, `bookings`, `booking_events`
- ✅ Note: `booking_events` table uses `customer_email` column (not `user_email`)
- ✅ Appropriate message shows what was deleted
- ✅ User disappears from customer users list after deletion

See: `docs/prevention/CASCADING_FAILURES.md` - Section #12

---

### Custom Email Verification System (2025-01-XX)

**Issue:** Replaced Supabase's built-in email confirmation with custom Resend-based verification system  
**Files Created:** `send-verification-email.ts`, `verify-email.ts`, `VerifyEmail.tsx`, `EmailVerification.tsx`  
**Files Updated:** `AuthContext.tsx`, `SignIn.tsx`, `send-email.ts`, `App.tsx`  
**Fix:** Implemented custom verification system using Resend and React Email templates

**What Was Implemented:**
1. **Database Tables:**
   - `email_verification_tokens` - Stores verification tokens with expiration (24 hours)
   - `profiles.email_confirmed_at` - Stores verification timestamp (custom field)

2. **Netlify Functions:**
   - `send-verification-email.ts` - Generates secure tokens and sends verification emails via Resend
   - `verify-email.ts` - Verifies tokens and updates `profiles.email_confirmed_at`

3. **Frontend Components:**
   - `VerifyEmail.tsx` - Verification page at `/verify-email` route
   - `EmailVerification.tsx` - React Email template for verification emails
   - Updated `AuthContext.tsx` - Checks `profiles.email_confirmed_at` instead of Supabase's system
   - Updated `SignIn.tsx` - Sends verification email after signup

4. **Email System:**
   - Updated `send-email.ts` - Added `email_verification` type support
   - Custom React Email template matching Bonita Forward branding

**Key Dependencies:**
- `send-verification-email.ts` → `email_verification_tokens` table (stores tokens)
- `send-verification-email.ts` → `send-email.ts` (sends emails via Resend)
- `verify-email.ts` → `email_verification_tokens` table (verifies tokens)
- `verify-email.ts` → `profiles` table (updates `email_confirmed_at`)
- `AuthContext.tsx` → `profiles.email_confirmed_at` (checks custom verification status)
- `SignIn.tsx` → `send-verification-email.ts` (sends email after signup)
- `VerifyEmail.tsx` → `verify-email.ts` (verifies token from email link)

**Breaking Changes to Watch:**
- If you change `profiles.email_confirmed_at` column → AuthContext breaks
- If you change `email_verification_tokens` table structure → Functions break
- If you change verification URL format → VerifyEmail page breaks
- If you change `resendVerificationEmail()` API → AccountSettings/EmailVerificationPrompt break
- If you disable Resend API key → Verification emails won't send

**Documentation Added:**
- New section in `CASCADING_FAILURES.md` (#14: Custom Email Verification System)
- Setup guide: `docs/CUSTOM_EMAIL_VERIFICATION_SETUP.md`
- SQL migrations: `ops/sql/create-email-verification-tokens.sql`, `ops/sql/add-email-confirmed-at-to-profiles.sql`

**Key Rules for Future Code:**
> **When checking email verification status:**
> 1. Always check `profiles.email_confirmed_at` from database (custom system)
> 2. Do NOT use Supabase's `session.user.email_confirmed_at` (their system is disabled)
> 3. Verification tokens expire after 24 hours (check expiration before verification)
> 4. Tokens are single-use (mark as used after verification)
> 5. Email verification is sent via Resend (custom email template)

**Files to Add Dependency Tracking:**
- ⚠️ `netlify/functions/send-verification-email.ts` - Needs dependency tracking
- ⚠️ `netlify/functions/verify-email.ts` - Needs dependency tracking
- ⚠️ `src/pages/VerifyEmail.tsx` - Needs dependency tracking

**Migration Requirements:**
- Must run SQL migrations before using system
- Must disable Supabase email confirmation in dashboard
- Existing users may need to verify via new system

See: `docs/prevention/CASCADING_FAILURES.md` - Section #14
See: `docs/CUSTOM_EMAIL_VERIFICATION_SETUP.md`

---

### Email Verification Token Parsing Fix (2025-01-XX)

**Issue:** `/verify-email` was returning "Missing verification token" due to incorrect query param parsing in Netlify function.  
**Files:** `netlify/functions/verify-email.ts`  
**Fix:** Read token from `event.queryStringParameters.token` with `rawQuery` fallback.  
**Impact:** Prevents false verification failures; maintains API contract with `/verify-email?token=...` links.

**Breaking-Change Awareness:**
- If deployment environment changes request shape, ensure `queryStringParameters` and `rawQuery` are supported.
- Frontend path `/verify-email?token=...` must remain stable.

**Prevention:** Documented in `CASCADING_FAILURES.md` (#16). Add function-header comments describing expected inputs.

---

### Self‑Delete: Business Delete/Unlink + Auto‑Reconnect (2025-01-XX)

**Issue:** After self-deletion, businesses remained orphaned and reappeared as "found by email but not linked" after re‑signup.  
**Files:**
- `netlify/functions/user-delete.ts` (accepts `deleteBusinesses`)
- `netlify/functions/utils/userDeletion.ts` (hard vs soft delete providers)
- `src/pages/Account.tsx` (UI prompt, passes intent)
- `src/pages/account/dataLoader.ts` (`loadMyBusinesses()` auto-reconnect)

**Fixes:**
- Prompt user to delete or keep businesses when deleting account.
- Backend hard-delete (permanent) or soft-delete (unlink + add `deleted` badge).
- On next login, auto-reconnect providers by email and remove `deleted` badge.

**Dependencies:**
- Providers table must include `owner_user_id`, `badges`, `email`.
- Auth flow must provide `userId` and `email` for reconnection.

**Breaking-Change Awareness:**
- Changing provider schema (e.g., removing `owner_user_id`/`badges`) breaks deletion/reconnection.
- If email changes, reconnection by email may not find providers; consider a manual link flow.

**Prevention:** Documented in `CASCADING_FAILURES.md` (#17). Add smoke tests covering delete -> re‑signup reconnection.

---

### Admin Business Deletion Choice (2025-01-XX)

**Issue:** Admin deleting user accounts had no control over whether businesses should be permanently deleted or kept (unlinked).

**Files:**
- `netlify/functions/admin-delete-user.ts` (accepts `deleteBusinesses` parameter)
- `src/utils/adminUserUtils.ts` (checks for businesses, prompts admin)
- `netlify/functions/utils/userDeletion.ts` (handles hard/soft delete logic)

**Fixes:**
- Admin deletion checks for businesses before deletion (queries providers table by owner_user_id)
- Prompts admin about deleting businesses if user has businesses (shows business names)
- Passes deleteBusinesses parameter to backend (true = hard delete, false = soft delete)
- Backend handles both cases (hard delete removes businesses, soft delete unlinks them)
- Success message indicates what happened with businesses

**Dependencies:**
- Providers table must have RLS policy allowing admin to read providers (for business check)
- Providers table must support owner_user_id column (for querying businesses)
- Providers table must support badges column (for soft delete - adds 'deleted' badge)
- Providers table must support setting owner_user_id to null (for soft delete)

**Breaking-Change Awareness:**
- If you remove deleteBusinesses parameter → Businesses always soft-deleted (unlinked)
- If providers table RLS changes → Can't check for businesses before deletion
- If providers table structure changes → Business deletion logic fails
- If you change deleteBusinesses parameter name → Frontend breaks

**Prevention:** Documented in `CASCADING_FAILURES.md` (#20). Add smoke tests covering admin deletion with businesses.

**Testing Verified (2025-01-XX):**
- ✅ Admin is prompted about businesses when deleting user with businesses
- ✅ Hard delete (deleteBusinesses=true) permanently removes businesses
- ✅ Soft delete (deleteBusinesses=false) unlinks businesses (can be reconnected)
- ✅ Success message shows what happened with businesses
- ✅ Deletion continues even if business check fails (graceful error handling)

---

### Event Images Stored in Supabase Storage (2025-01-XX)

**Issue:** New events automatically download images from Unsplash and store them in Supabase Storage. Images are stored in YOUR database/storage, not referenced from Unsplash.

**Files:**
- `src/pages/Calendar.tsx` (`handleCreateEvent` - downloads and stores images for new events only)
- `src/utils/eventImageStorage.ts` (`downloadAndStoreImage` - downloads from Unsplash, uploads to Supabase Storage)
- `src/utils/eventImageUtils.ts` (`fetchUnsplashImage` - fetches Unsplash URL, used only during event creation)
- `src/components/EventCard.tsx` (uses `getEventHeaderImageFromDb` - reads from database only, no API calls)
- `src/components/CalendarSection.tsx` (uses `getEventHeaderImageFromDb` - reads from database only, no API calls)

**Fixes:**
- New event creation automatically:
  1. Fetches Unsplash image URL
  2. Downloads the image file
  3. Uploads to Supabase Storage (bucket: `event-images`)
  4. Saves Supabase Storage URL to database (not Unsplash URL)
- Existing events are NEVER touched (left as-is in database)
- Display code uses database only (no external API calls on page load)

**Dependencies:**
- Supabase Storage bucket `event-images` must exist (create in Supabase Dashboard → Storage)
- Bucket must be public (for public image URLs)
- Unsplash API key required for new event creation only (not for display)
- Calendar events table must have `image_url` column (stores Supabase Storage URLs)
- Calendar events table must have `image_type` column (stores 'image' or 'gradient')
- Existing events in database are NOT modified automatically

**Breaking-Change Awareness:**
- If you remove `downloadAndStoreImage` → New events won't store images in Supabase Storage
- If Supabase Storage bucket `event-images` doesn't exist → Image storage fails (falls back to Unsplash URL)
- If you change Supabase Storage bucket name → Image storage fails
- If you remove Unsplash API key → New events use gradient fallback (existing events unaffected)
- If you modify existing events automatically → BREAKS existing functionality (never do this)

**Prevention:** Documented in `CASCADING_FAILURES.md` (#22). Only NEW events trigger Unsplash → Supabase Storage flow. Existing events are left alone.

**Testing Verified (2025-01-XX):**
- ✅ New event creation downloads Unsplash image and stores in Supabase Storage
- ✅ Database stores Supabase Storage URL (not Unsplash URL)
- ✅ Display code reads from database only (no Unsplash API calls on page load)
- ✅ Existing events left unchanged (not modified automatically)
- ✅ Browser inspector shows Supabase Storage URLs (not Unsplash URLs)

---

### Event Images: Gradient Strings Saved to Database (2025-11-05)

**Issue:** Populate scripts were saving CSS gradient strings to `image_url` column when images couldn't be fetched. Gradient strings should NEVER be stored in the database - they should be computed dynamically on the frontend when `image_url` is `null`.

**Files:**
- `netlify/functions/populate-event-images.ts` (scheduled function - fixed to never save gradient strings)
- `scripts/populate-event-images.ts` (local script - fixed to never save gradient strings)
- `scripts/cleanup-gradient-strings.ts` (cleanup script to remove existing gradient strings)
- `scripts/cleanup-gradient-strings.sql` (SQL cleanup script)

**Fixes:**
- Updated all populate scripts to set `image_url: null` instead of saving gradient strings when images can't be fetched
- Frontend already computes gradients when `image_url` is `null` - no need to save gradients to database
- Created cleanup scripts to remove existing gradient strings from database
- All external feed processors preserve existing `image_url` and `image_type` when re-fetching events

**Dependencies:**
- Populate scripts only process events with `null` image_url (skip events that already have images)
- External feed processors (iCalendar/RSS/KPBS/VoSD) preserve existing `image_url` and `image_type` when re-fetching
- Frontend computes gradients dynamically when `image_url` is `null` - no need to save gradients to database
- `getEventHeaderImageFromDb()` helper ignores gradient strings in database (treats them as `null`)

**Breaking-Change Awareness:**
- If you restore code that saves gradient strings to `image_url` → Frontend will ignore them (wastes database space)
- If you remove null-check logic in populate scripts → Scripts might try to re-populate events that already have images
- If you remove image preservation logic in feed processors → Events will lose their images when re-fetched
- If you change populate script logic to save gradients → Violates the "never save gradients" rule

**Prevention:** Documented in `CASCADING_FAILURES.md` (#23). NEVER save gradient strings to `image_url` column - always use `null` when images can't be fetched. Frontend computes gradients dynamically when `image_url` is `null`.

**Image Preservation Guarantees:**
- ✅ **External feed processors preserve images**: All iCalendar/RSS/KPBS/VoSD sync functions preserve existing `image_url` and `image_type` when re-fetching events
- ✅ **Populate scripts only process missing images**: Scripts only populate events with `null` image_url (skip events that already have images)
- ✅ **No automatic overwrites**: No automated process will overwrite existing images - they are preserved during re-fetches
- ✅ **One-time population**: After images are populated, they will NOT be overwritten by automated processes
- ✅ **Never save gradients**: All populate scripts set `image_url` to `null` when images can't be fetched (never save gradient strings)

**Testing Verified (2025-11-05):**
- ✅ Populate scripts set `image_url` to `null` when images can't be fetched (not gradient strings)
- ✅ Frontend computes gradients when `image_url` is `null` (works correctly)
- ✅ External feed processors preserve existing images when re-fetching events
- ✅ Populate scripts skip events that already have images (only process `null` image_url)
- ✅ Cleanup script removes existing gradient strings from database
- ✅ All 33 events successfully populated with Supabase Storage URLs (not gradient strings)

---

### Event Images Not Showing Due to Null image_type (2025-01-XX)

**Issue:** Events with database `image_url` but null `image_type` were showing gradient fallbacks instead of their stored images, even though they had valid image URLs in the database.

**Files:**
- `src/components/EventCard.tsx` (uses `getEventHeaderImageFromDb()` helper)
- `src/pages/Calendar.tsx` (uses `getEventHeaderImageFromDb()` helper - 3 locations)
- `src/components/CalendarSection.tsx` (updated logging to check for both fields or infer type)
- `src/utils/eventImageUtils.ts` (contains `getEventHeaderImageFromDb()` helper function)
- `scripts/backfill-event-image-types.ts` (backfill script to set image_type for legacy events)

**Fixes:**
- Created `getEventHeaderImageFromDb()` helper that handles legacy events with null `image_type`
- Infers `image_type` from `image_url` format if `image_type` is null:
  - URLs starting with 'http' → 'image' type
  - Strings starting with 'linear-gradient' → 'gradient' type
- Updated all components to use the helper function (prevents code duplication)
- Updated CalendarSection logging to check for both fields or infer type
- Created database backfill script to set `image_type` for legacy events

**Dependencies:**
- Calendar events table must have `image_url` column (for storing image URLs or gradient strings)
- Calendar events table must have `image_type` column (for storing 'image' or 'gradient' type)
- `image_type` can be null (legacy data support)
- `image_url` format must be consistent (URLs start with 'http', gradients start with 'linear-gradient')
- Helper function `getEventHeaderImageFromDb()` must be used consistently across all components

**Breaking-Change Awareness:**
- If you remove `getEventHeaderImageFromDb()` helper → All components break (code duplication)
- If you change `image_type` inference logic → Must update helper function and all usages
- If you change `image_url` format → Type inference logic might break (e.g., if URLs no longer start with 'http')
- If you change `image_type` column name → Helper function breaks
- If you change `image_url` column name → Helper function breaks

**Prevention:** Documented in `CASCADING_FAILURES.md` (#21). Handle legacy data where optional fields might be null. Infer missing field values from existing data when possible.

**Testing Verified (2025-01-XX):**
- ✅ Events with `image_url` and `image_type` show images correctly
- ✅ Events with `image_url` but null `image_type` infer type and show images correctly
- ✅ Events with `image_url` starting with 'http' are treated as 'image' type
- ✅ Events with `image_url` starting with 'linear-gradient' are treated as 'gradient' type
- ✅ Events without `image_url` show gradient fallback
- ✅ Database backfill script sets `image_type` for legacy events

---

