# Why Fixing One Thing Breaks Another - Cascading Failures Prevention

## The Core Problem

You're experiencing **cascading failures** - fixing one issue creates another:

1. Fix name display → resident verification breaks
2. Fix resident verification → something else breaks
3. Fix that → another thing breaks
4. **Cycle repeats** → You go insane 😤

**This is EXACTLY what happened:**
- Fixed `AuthContext.tsx` for name display ✅
- But `useAdminDataLoader.ts` had a local `ProfileRow` type without resident verification fields ❌
- Result: Netlify function returns resident data, but TypeScript doesn't know it exists
- Result: Resident verification section is empty

---

## ✅ Verified Solutions (2025-01-XX)

**Name Storage During Signup - FIXED (2025-01-XX):**
- ✅ Fixed async operation order in SIGNED_IN handler
- ✅ Name now appears immediately after signup
- ✅ Name is read from localStorage FIRST, then saved to database
- ✅ Debug logging added to track name flow
- **Status:** ✅ Fixed - See Section #14 for detailed pattern and prevention

**Email Verification Token Parsing - FIXED (2025-01-XX):**
- ✅ Netlify function now correctly reads token from `event.queryStringParameters.token`
- ✅ Added fallback for `rawQuery` to harden against environment differences
- ✅ Prevents false "Missing verification token" errors
- **Status:** ✅ Fixed - See Section #16

**User Deletion + Business Handling - FIXED (2025-01-XX):**
- ✅ Prompt users to delete or keep businesses on self-delete
- ✅ Soft delete/unlink (keep) or hard delete (remove) via backend flag
- ✅ Auto-reconnect unlinked businesses on next signup by email
- **Status:** ✅ Fixed - See Section #17

**Business Applications RLS Policy Blocking Inserts - FIXED (2025-01-XX):**
- ✅ Fixed restrictive INSERT policy that blocked authenticated users from submitting applications
- ✅ Removed duplicate policies (`applications_insert_all` and `applications_insert_public`)
- ✅ Created single public INSERT policy matching master RLS policies
- ✅ Security maintained: SELECT/DELETE policies still enforce email matching
- **Status:** ✅ Fixed - See Section #24 for detailed pattern and prevention

---

## Why This Happens

### 1. **Hidden Dependencies** ⭐ PRIMARY CAUSE

**What:** Components depend on each other but you don't see it.

**Example:**
```
AuthContext (name fix)
    ↓
useAdminDataLoader (loads profiles)
    ↓
admin-list-profiles Netlify function
    ↓
ResidentVerificationSection (displays data)
```

**Problem:**
- You change `AuthContext` to fix name
- But `useAdminDataLoader` depends on how `AuthContext` works
- But `admin-list-profiles` depends on how `useAdminDataLoader` calls it
- But `ResidentVerificationSection` depends on what `admin-list-profiles` returns
- **You only fix one link, break another**

**Prevention:**
```typescript
/**
 * DEPENDENCY TRACKING COMMENT
 * 
 * This function depends on:
 * - AuthContext: Provides user session token
 * - admin-list-profiles: Returns ProfileRow[] with resident verification fields
 * - ProfileRow type: Must include is_bonita_resident, resident_verification_method, etc.
 * 
 * If you change ANY of these, you MUST:
 * 1. Check this function still works
 * 2. Check all consumers of this function
 * 3. Run integration tests
 */
```

---

### 2. **No Integration Tests** ⭐ CRITICAL MISSING

**What:** You test individual pieces, not the whole flow.

**Problem:**
- You fix name saving ✅
- You test name saving ✅
- But you DON'T test:
  - Does admin page still load profiles? ❌
  - Does resident verification still work? ❌
  - Do other admin sections still work? ❌

**Prevention:**
```typescript
// tests/integration/admin-flow.test.ts
describe('Admin Flow Integration', () => {
  it('should load profiles with resident verification data', async () => {
    // Test the ENTIRE flow:
    // 1. User signs up with name ✅
    // 2. User marks as resident ✅
    // 3. Admin logs in ✅
    // 4. Admin views resident verification section ✅
    // 5. Data should be visible ✅
  })
  
  it('should display name correctly after signup', async () => {
    // Test name display doesn't break resident verification
  })
})
```

---

### 3. **No Change Impact Analysis** ⭐ MISSING STEP

**What:** You don't check what ELSE might be affected.

**Problem:**
- You change `AuthContext.tsx`
- You don't check what imports `AuthContext`
- You don't check what depends on auth state
- You don't check related functionality

**Prevention:**
```bash
# Before making ANY change:
1. grep -r "AuthContext" src/  # Find all usages
2. grep -r "auth.name" src/     # Find all name usages
3. Check related files:
   - What loads profiles?
   - What displays user data?
   - What depends on auth state?
4. Test ALL related functionality
```

---

### 4. **Shared State Without Boundaries** ⭐ ARCHITECTURE ISSUE

**What:** Too many components share the same state.

**Problem:**
```
AuthContext (name state)
    ↓ (shared)
AdminPage (uses auth.name)
    ↓ (shared)
ResidentVerificationSection (uses profiles)
    ↓ (shared)
useAdminDataLoader (loads profiles)
```

**When you change ONE thing, it affects ALL of them.**

**Prevention:**
- Create clear boundaries between components
- Use props instead of shared state when possible
- Document data flow clearly
- Create integration tests for each boundary

---

### 5. **Incomplete Refactoring** ⭐ PARTIAL FIXES

**What:** You fix part of the system, leave other parts broken.

**Example:**
- You fix `admin-list-profiles` to return resident verification fields ✅
- But you don't update the type definitions ❌
- But you don't update the frontend to use the new fields ❌
- Result: Type mismatch, runtime errors

**Prevention:**
- **Atomic changes:** Fix ALL related pieces in ONE commit
- **Type safety:** TypeScript will catch mismatches if types are correct
- **Checklist:** Before committing, verify ALL related files are updated

---

### 6. **No Smoke Tests** ⭐ MISSING VALIDATION

**What:** You don't quickly verify everything still works.

**Problem:**
- You make a change
- You test the specific thing you changed
- You don't test "does everything else still work?"

**Prevention:**
```typescript
// Create a "smoke test" checklist:
const smokeTests = [
  'User can sign up',
  'User can sign in',
  'Name displays correctly',
  'Admin can view profiles',
  'Admin can view resident verification',
  'Admin can view all sections',
  // ... all critical paths
]

// Run these after EVERY change
```

---

### 7. **State Reset During Navigation** ⭐ RACE CONDITION BUG

**What:** Checking state values in wrong order causes logout during navigation.

**Example Failure:**
```typescript
// WRONG: Checking !auth.email BEFORE auth.loading
if (!auth.email) {
  setAdminStatus({ isAdmin: false }) // ❌ Logs out during navigation!
  return
}
if (auth.loading) {
  return // Too late - already set to false!
}
```

**What Happened:**
1. User navigates from admin page → provider page
2. During React navigation, `auth.email` temporarily becomes `undefined`
3. Hook checks `!auth.email` FIRST → immediately sets admin to `false`
4. This happens BEFORE checking if auth is still loading
5. Result: User gets logged out even though they're still authenticated

**The Fix:**
```typescript
// CORRECT: Check loading FIRST, preserve verified status
if (auth.loading) {
  return // ✅ Preserve current state during loading
}
if (adminStatus.verified && adminStatus.isAdmin && auth.email) {
  return // ✅ Already verified, skip re-verification
}
if (!auth.email) {
  if (adminStatus.verified && adminStatus.isAdmin) {
    return // ✅ Preserve verified status during temporary email loss
  }
  setAdminStatus({ isAdmin: false }) // Only set false if not verified
  return
}
```

**Prevention Checklist:**
- ✅ ALWAYS check loading state FIRST before checking values
- ✅ ALWAYS preserve verified/authenticated state during temporary value loss
- ✅ Test navigation between pages (admin → provider, provider → admin)
- ✅ Test during auth state transitions (login, logout, refresh)
- ✅ Never reset state without checking if it's already verified/authenticated

**Rule of Thumb:**
> **When checking state values, check in this order:**
> 1. Loading state (preserve current state)
> 2. Verified/authenticated state (preserve if verified)
> 3. Actual values (only set to false if not verified)

**Files to Watch:**
- `src/hooks/useAdminVerification.ts` - Admin verification
- `src/contexts/AuthContext.tsx` - Auth state management
- Any hook checking auth state during navigation

---

### 8. **Immutable Database Fields** ⭐ DATABASE CONSTRAINT ERROR

**What:** Trying to update database fields that are marked as immutable once set.

**Example Failure:**
```typescript
// WRONG: Trying to update role when already set
await updateUserProfile(userId, {
  name: 'John',
  role: 'business' // ❌ Error: "profiles.role is immutable once set"
})
```

**What Happened:**
1. User logs in after already having a role set during signup
2. `AuthContext.ensureProfile()` calls `updateUserProfile()` with role included
3. Database constraint prevents updating `role` once it's been set
4. Result: 400 error on every login for existing users

**The Fix:**
```typescript
// CORRECT: Check if immutable field is already set before updating
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', userId)
  .maybeSingle()

const updatePayload: any = { ...payload }
if (existingProfile?.role) {
  // Role already set - exclude from update (immutable field)
  delete updatePayload.role
}
await supabase.from('profiles').update(updatePayload).eq('id', userId)
```

**Prevention Checklist:**
- ✅ ALWAYS check if immutable fields are already set before UPDATE
- ✅ Exclude immutable fields from update payload if already set
- ✅ Only set immutable fields during INSERT (when profile doesn't exist)
- ✅ Handle immutable field errors gracefully in centralized utilities
- ✅ Document which fields are immutable in dependency tracking comments

**Rule of Thumb:**
> **When updating database records, check immutable fields first:**
> 1. Query existing record to check immutable fields
> 2. If immutable field is already set, exclude it from update payload
> 3. Only include immutable fields if they're not set yet (null/undefined)

**Files to Watch:**
- `src/utils/profileUtils.ts` - Centralized profile updates (handles immutable role)
- `src/contexts/AuthContext.tsx` - Uses updateUserProfile() (affected by immutable fields)
- Any function that updates database records with immutable fields

**Common Immutable Fields:**
- `profiles.role` - Cannot be changed after initial set
- Other fields may be marked immutable by database constraints or RLS policies

---

### 9. **Incomplete Deletion Logic** ⭐ DATA LEAK ISSUE

**What:** Deletion functions don't delete all related data, leaving orphaned records.

**Example Failure:**
```typescript
// WRONG: Only deleting some related data
async function deleteUser(userId: string) {
  // Delete profile ✅
  await supabase.from('profiles').delete().eq('id', userId)
  // Delete bookings ✅
  await supabase.from('bookings').delete().eq('user_email', email)
  // ❌ MISSING: saved events, saved businesses, calendar events, etc.
  await supabase.auth.admin.deleteUser(userId)
}
```

**What Happened:**
1. Admin deletes user account via admin panel
2. Deletion function only deleted: profile, bookings, funnel responses, change requests
3. Many other tables were NOT deleted:
   - Saved events (`user_saved_events`)
   - Saved businesses (`saved_providers`)
   - Coupon redemptions (`coupon_redemptions`)
   - Calendar events created by user (`calendar_events`)
   - Business applications (`business_applications`)
   - Event flags and votes (`event_flags`, `event_votes`)
   - Email preferences (`email_preferences`)
   - Dismissed notifications (`dismissed_notifications`)
4. Result: Orphaned data remains in database, potentially causing data leaks

**The Fix:**
```typescript
// CORRECT: Delete ALL related data
async function deleteUserAndRelatedData(userId: string, userEmail: string) {
  // Delete all related tables
  await deleteFunnelResponses(userEmail)
  await deleteBookings(userEmail)
  await deleteSavedEvents(userId)
  await deleteSavedBusinesses(userId)
  await deleteCouponRedemptions(userId)
  await deleteCalendarEvents(userId)
  await deleteBusinessApplications(userEmail)
  await deleteEventFlags(userId)
  await deleteEventVotes(userId)
  await deleteEmailPreferences(userId)
  await deleteDismissedNotifications(userId)
  // ... all other related tables
  // Finally delete auth user
  await supabase.auth.admin.deleteUser(userId)
}
```

**Prevention Checklist:**
- ✅ Search ALL tables for `user_id`, `owner_user_id`, or `email` fields
- ✅ Document ALL tables that store user-related data
- ✅ Create a comprehensive deletion checklist
- ✅ Test deletion with a user that has data in ALL tables
- ✅ Verify no orphaned records remain after deletion
- ✅ Centralize deletion logic in shared utility (single source of truth)

**Rule of Thumb:**
> **When implementing user deletion, find ALL tables that reference the user:**
> 1. Search for `user_id` columns across all tables
> 2. Search for `owner_user_id` columns across all tables
> 3. Search for `email` columns that might reference the user
> 4. Search for any other user-identifying columns
> 5. Delete from ALL of these tables before deleting the auth user
> 6. Test with a user that has data in every possible table

**Files to Watch:**
- `netlify/functions/utils/userDeletion.ts` - Shared deletion utility (MUST be comprehensive)
- `netlify/functions/admin-delete-user.ts` - Admin deletion endpoint
- `netlify/functions/user-delete.ts` - Self-deletion endpoint
- Any new tables added must be added to deletion logic

**Common Tables to Check:**
- `profiles` - User profile data
- `funnel_responses` - Form submissions (by email)
- `bookings` - Calendar bookings (by email)
- `user_saved_events` - Saved calendar events (by user_id)
- `saved_providers` - Saved businesses (by user_id)
- `coupon_redemptions` - Coupon usage (by user_id)
- `calendar_events` - Events created by user (by created_by_user_id)
- `business_applications` - Business listing applications (by email)
- `provider_change_requests` - Change requests (by owner_user_id)
- `provider_job_posts` - Job posts (by owner_user_id)
- `user_notifications` - Notifications (by user_id)
- `dismissed_notifications` - Dismissed notifications (by user_id)
- `event_flags` - Flagged events (by user_id)
- `event_votes` - Event votes (by user_id)
- `email_preferences` - Email settings (by user_id)
- `providers` - Business listings (soft delete by owner_user_id)

---

### 10. **Missing Props in Destructuring** ⭐ REACT COMPONENT BUG

**What:** Props defined in interface but not destructured, causing runtime errors when props are called.

**Example Failure:**
```typescript
// WRONG: Prop in interface but not destructured
interface CustomerUsersSectionProps {
  onDeleteCustomerUser: (userId: string) => Promise<void>
  deleteCustomerUserByEmail: (email: string) => Promise<void>
}

export const CustomerUsersSection: React.FC<CustomerUsersSectionProps> = ({
  customerUsers,
  deletingCustomerEmail,
  // ❌ MISSING: onDeleteCustomerUser, deleteCustomerUserByEmail
}) => {
  // Later in component:
  onClick={() => deleteCustomerUserByEmail(userObj.email)}
  // ❌ Error: deleteCustomerUserByEmail is not a function
}
```

**What Happened:**
1. Props interface includes `onDeleteCustomerUser` and `deleteCustomerUserByEmail`
2. Component destructuring omits these props
3. Component tries to call `deleteCustomerUserByEmail` at runtime
4. Result: `TypeError: deleteCustomerUserByEmail is not a function`

**The Fix:**
```typescript
// CORRECT: Destructure ALL props that are used
export const CustomerUsersSection: React.FC<CustomerUsersSectionProps> = ({
  customerUsers,
  deletingCustomerEmail,
  onSetDeletingCustomerEmail,
  onDeleteCustomerUser, // ✅ Include ALL props
  deleteCustomerUserByEmail // ✅ Include ALL props
}) => {
  // Add guard check before calling
  onClick={async () => {
    if (!deleteCustomerUserByEmail) {
      console.error('[Component] deleteCustomerUserByEmail is not a function')
      return
    }
    await deleteCustomerUserByEmail(userObj.email)
  }}
}
```

**Prevention Checklist:**
- ✅ ALWAYS destructure ALL props from interface (even if unused)
- ✅ Add guard checks before calling function props (`if (!prop) return`)
- ✅ Use TypeScript strict mode to catch missing props at compile time
- ✅ Verify all props are passed from parent component
- ✅ Test component with all props passed and with missing props

**Rule of Thumb:**
> **When destructuring props, include ALL props from the interface:**
> 1. Copy all prop names from interface to destructuring
> 2. If a prop isn't used, prefix it with `_` to indicate it's intentionally unused
> 3. Add guard checks before calling function props (defensive programming)
> 4. Use TypeScript to catch missing props at compile time

**Files to Watch:**
- `src/components/admin/sections/CustomerUsersSection-2025-10-19.tsx` - Missing props in destructuring
- Any React component with function props
- Components that receive many props (easy to miss one)

**Common Patterns:**
- Props interface has 10 props, destructuring only has 8
- Function prop defined but not destructured
- Component calls prop without guard check
- Parent passes prop but component doesn't receive it

### 11. **Stale Data After Deletion** ⭐ DATA SYNC ISSUE

**What:** Deleting a user updates local state but doesn't refresh from database, causing deleted users to reappear on page refresh.

**Example Failure:**
```typescript
// WRONG: Only update local state after deletion
async function deleteUser(userId: string) {
  await fetch('/api/delete-user', { body: { user_id: userId } })
  // ❌ Only update local state
  setProfiles((arr) => arr.filter((p) => p.id !== userId))
  // On page refresh, deleted user reappears if deletion didn't actually work
}
```

**What Happened:**
1. Admin deletes user via admin panel
2. Backend deletion function is called
3. Frontend only updates local state (removes from arrays)
4. User refreshes page or navigates away and back
5. Data loader reloads from database
6. If deletion failed silently or there was a timing issue, deleted user reappears

**The Fix:**
```typescript
// CORRECT: Reload from database after deletion to verify it worked
async function deleteUser(userId: string) {
  await fetch('/api/delete-user', { body: { user_id: userId } })
  
  // ✅ Reload profiles from database to verify deletion
  const res = await fetch('/api/list-profiles')
  const result = await res.json()
  if (result.success && result.profiles) {
    setProfiles(result.profiles) // Fresh data confirms deletion
  } else {
    // Fallback to local update if reload fails
    setProfiles((arr) => arr.filter((p) => p.id !== userId))
  }
}
```

**Prevention Checklist:**
- ✅ ALWAYS reload from database after deletion to verify it worked
- ✅ Update local state with fresh data from database (not just filtered local state)
- ✅ Handle reload failures gracefully (fallback to local update)
- ✅ Test deletion persists after page refresh
- ✅ Log deletion counts to verify what was actually deleted

**Rule of Thumb:**
> **When deleting data, always reload from database after deletion:**
> 1. Call deletion function (backend deletes data)
> 2. Reload data from database (verify deletion worked)
> 3. Update local state with fresh data (ensures consistency)
> 4. On page refresh, deleted data won't reappear (because it's actually deleted)

**Files to Watch:**
- `src/utils/adminUserUtils.ts` - User deletion (reloads profiles after deletion)
- `src/pages/Admin.tsx` - Admin deletion handlers
- Any function that deletes data and updates local state

**Common Patterns:**
- Delete function only updates local state
- On refresh, deleted items reappear
- No verification that deletion actually worked
- Silent failures not detected

**Testing Verified (2025-01-XX):**
- ✅ Successfully deleted business accounts (complete deletion with profile reload)
- ✅ Successfully deleted customer accounts (complete deletion with profile reload)
- ✅ Deleted users don't reappear after page refresh
- ✅ Profile reload verifies deletion worked correctly

---

### 12. **Users Without Profiles** ⭐ MISSING PROFILE ISSUE

**Problem:** Cannot delete users who only exist in funnels/bookings/booking_events without a profile.

**Example:**
- User filled out funnel form but never completed signup
- User has email in `funnel_responses`, `bookings`, `booking_events` tables
- But no `profiles` row exists (no `user_id` in `auth.users`)
- Admin tries to delete → "User not found" error

**Fix:** Handle both cases:
- **With profile:** Delete everything (auth user, profile, all data)
- **Without profile:** Delete email-keyed data only (`funnel_responses`, `bookings`, `booking_events`)

**Wrong Code:**
```typescript
// Only handles users with profiles
async function deleteUserByEmail(email: string) {
  const profile = await getProfileByEmail(email)
  if (!profile) {
    throw new Error('User not found') // ❌ Fails for users without profiles
  }
  await deleteUserAndRelatedData(profile.id)
}
```

**Correct Code:**
```typescript
// Handles both cases
async function deleteUserByEmail(email: string) {
  const profile = await getProfileByEmail(email)
  if (profile?.id) {
    // User has profile - delete everything
    await deleteUserAndRelatedData(profile.id)
  } else {
    // User only in email-keyed tables - delete email-keyed data only
    await deleteUserByEmailOnly(email) // Deletes from funnels, bookings, booking_events
  }
}

// Separate function for email-only deletion
async function deleteUserByEmailOnly(email: string) {
  await supabase.from('funnel_responses').delete().eq('user_email', email)
  await supabase.from('bookings').delete().eq('user_email', email)
  // Note: booking_events uses customer_email, not user_email!
  await supabase.from('booking_events').delete().eq('customer_email', email)
}
```

**Prevention Checklist:**
- [ ] Check if profile exists before attempting full deletion
- [ ] Create separate function for email-only deletion
- [ ] Remember `booking_events` uses `customer_email` column (not `user_email`)
- [ ] Show appropriate message explaining what was deleted
- [ ] Cannot delete auth user without profile (no `user_id`)

**Rule of Thumb:**
> When deleting by email, handle both cases:
> 1. Check if profile exists for this email
> 2. If profile exists: Delete everything (auth user, profile, all data)
> 3. If no profile: Delete email-keyed data only (funnels, bookings, booking_events)
> 4. Note: `booking_events` table uses `customer_email` column, not `user_email`
> 5. Cannot delete auth user without profile (no `user_id`)

**Files to Watch:**
- `src/utils/adminUserUtils.ts` - deleteUserByEmailOnly()
- `src/pages/Admin.tsx` - deleteCustomerUserByEmail handler
- `netlify/functions/utils/userDeletion.ts` - Comprehensive deletion utility

**Related:**
- Section #11: Stale Data After Deletion
- Section #9: Incomplete Deletion Logic

---

### 13. **Clearing Existing Data During Updates** ⭐ DATA LOSS BUG

**Problem:** Existing data (like user names) gets cleared during auth refresh/login when no new value is provided.

**Example:**
- User logs in (name exists in database: "John Doe")
- During auth refresh, `ensureProfile()` is called
- No name in localStorage (not during signup)
- Code passes `name: null` to `updateUserProfile()`
- Database updates with `name: null`, clearing existing name
- User sees name disappeared

**Fix:** Preserve existing data when null/undefined is passed during UPDATE operations.

**Wrong Code:**
```typescript
// In ensureProfile() - during auth refresh
const result = await updateUserProfile(userId, {
  email,
  name: name || null, // ❌ Sets name to null if name is undefined
  role: role || null,
}, 'auth-context')

// In updateUserProfile() - UPDATE operation
const updatePayload = { ...payload } // payload.name is null
await supabase.from('profiles').update(updatePayload) // ❌ Clears name!
```

**Correct Code:**
```typescript
// In ensureProfile() - fetch existing name if not provided
if (!name) {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .maybeSingle()
  
  if (existingProfile?.name) {
    name = existingProfile.name // Preserve existing name
  }
}

// Only include name if we have one
const updatePayload: any = { email, role }
if (name) {
  updatePayload.name = name // Only update if we have a name
}
await updateUserProfile(userId, updatePayload, 'auth-context')

// In updateUserProfile() - preserve existing name if payload.name is null
if (existing) {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .maybeSingle()
  
  const updatePayload: any = { ...payload }
  
  // Preserve existing name if payload.name is null/undefined
  if ((payload.name === null || payload.name === undefined) && existingProfile?.name) {
    delete updatePayload.name // Exclude from update to preserve it
  }
  
  await supabase.from('profiles').update(updatePayload)
}
```

**Prevention Checklist:**
- [ ] Fetch existing data before UPDATE if new value is not provided
- [ ] Exclude null/undefined fields from UPDATE payload (don't update them)
- [ ] Only include fields in update payload if they have values
- [ ] For UPDATE operations, preserve existing data when payload is null/undefined
- [ ] Similar pattern to immutable fields (exclude role if already set)

**Rule of Thumb:**
> When updating existing records:
> 1. If new value is provided → update with new value
> 2. If new value is null/undefined → preserve existing value (exclude from update)
> 3. Only include fields in update payload that should actually change
> 4. For immutable fields (like role), always exclude from update if already set
> 5. This prevents accidental data loss during auth refresh or partial updates

**Files to Watch:**
- `src/contexts/AuthContext.tsx` - ensureProfile() function
- `src/utils/profileUtils.ts` - updateUserProfile() function
- Any UPDATE operations that might pass null/undefined values

**Common Patterns:**
- Passing `name: null` during auth refresh clears existing name
- UPDATE with null values overwrites existing data
- Not checking if data exists before clearing it
- Similar to immutable field issue but for any existing data

**Testing Verified (2025-01-XX):**
- ✅ Names preserved during auth refresh/login
- ✅ Names still saved correctly during signup
- ✅ Names can still be updated in account settings
- ✅ No accidental data clearing during normal operations

**Related:**
- Section #8: Immutable Database Fields (similar pattern - exclude from update)
- Section #11: Stale Data After Deletion (data preservation patterns)

---

### 14. **Async Operation Order in SIGNED_IN Handler** ⭐ RECURRING ISSUE (2025-01-XX)

**What:** Reading from database before saving data during signup causes "Hi, User" instead of actual name.

**Example Failure:**
```typescript
// WRONG: Read from database FIRST (name is empty/null)
if (event === 'SIGNED_IN') {
  // ❌ Read from database FIRST - name doesn't exist yet!
  const profileData = await fetchUserProfile(userId)
  name = profileData.name // undefined/null
  
  // ❌ Save name AFTER reading - too late!
  await ensureProfile(userId, email, name, role)
  // Result: name is saved but already read as undefined
}
```

**What Happened:**
1. User signs up with name "John Doe"
2. Name is saved to localStorage (`bf-pending-profile`)
3. SIGNED_IN event fires
4. Code reads from database FIRST (name doesn't exist yet - returns undefined)
5. Code sets `name = undefined` from database
6. Code saves name to database (too late - already set to undefined)
7. Result: "Hi, User" instead of "Hi, John Doe"

**The Fix:**
```typescript
// CORRECT: Read from localStorage FIRST, then save, then read from database
if (event === 'SIGNED_IN') {
  // Step 1: Read from localStorage FIRST (signup flow)
  const raw = localStorage.getItem('bf-pending-profile')
  if (raw) {
    const pref = JSON.parse(raw)
    if (pref?.name && pref.name.trim()) {
      name = pref.name.trim() // ✅ Get name from localStorage
    }
  }
  
  // Step 2: Save to database FIRST (with name from localStorage)
  await ensureProfile(userId, email, name, role) // ✅ Save name
  
  // Step 3: THEN read from database (now it has the name)
  const profileData = await fetchUserProfile(userId)
  name = profileData.name || name // ✅ Use database name if exists
}
```

**Prevention Checklist:**
- ✅ ALWAYS read from localStorage FIRST during signup (before database)
- ✅ ALWAYS save to database BEFORE reading from it during signup
- ✅ Follow the correct order: localStorage → save → database → state
- ✅ Add debug logging to track name flow during signup
- ✅ Test signup flow: name must appear immediately after signup
- ✅ Verify name is in localStorage before ensureProfile is called
- ✅ Verify name is included in update payload when present

**Rule of Thumb:**
> **During signup, the operation order is CRITICAL:**
> 1. Read from localStorage (contains signup form data)
> 2. Save to database (write data we just read)
> 3. Read from database (verify data was saved)
> 4. Update state (display the data)
>
> **WRONG order causes data loss:**
> 1. Read from database (empty data) ❌
> 2. Save to database (saves empty data) ❌

**Files to Watch:**
- `src/contexts/AuthContext.tsx` - SIGNED_IN event handler MUST follow correct order
- `src/contexts/AuthContext.tsx` - ensureProfile() MUST include name in payload if present
- Any auth state change handlers that save/read profile data

**Common Patterns:**
- Reading from database before writing during signup
- Not reading from localStorage during SIGNED_IN event
- Not including name in update payload if it's undefined at some point
- Race conditions where localStorage is cleared before it's read

**Related Issues:**
- This is a recurring problem that has been fixed multiple times
- The root cause is async operation order during signup flow
- Name preservation logic (Section #13) also plays a role

**Testing Verified (2025-01-XX):**
- ✅ Name appears immediately after signup
- ✅ Name is read from localStorage before database
- ✅ Name is saved to database before reading
- ✅ Debug logging tracks name flow correctly

**Documentation:**
- See: `docs/prevention/ASYNC_FLOW_PREVENTION.md` - Detailed async flow patterns
- See: `docs/prevention/CASCADING_FAILURES.md` - Section #13 (Preserving Existing Data)
- See: `docs/prevention/DEPENDENCY_TRACKING_PLAN.md` - Async Operation Order Fix

---

### 15. **Custom Email Verification System** ⭐ NEW FEATURE IMPLEMENTATION (2025-01-XX)

**What:** Replaced Supabase's built-in email confirmation with custom Resend-based verification system.

**Implementation:**
- Custom verification tokens stored in `email_verification_tokens` table
- Verification emails sent via Resend using React Email templates
- Verification status stored in `profiles.email_confirmed_at` (custom field)
- AuthContext checks custom verification status instead of Supabase's system

**Key Files:**
- `netlify/functions/send-verification-email.ts` - Generates tokens and sends emails
- `netlify/functions/verify-email.ts` - Verifies tokens and updates profiles
- `src/pages/VerifyEmail.tsx` - Verification page at `/verify-email`
- `src/contexts/AuthContext.tsx` - Checks `profiles.email_confirmed_at` (not `session.user.email_confirmed_at`)
- `src/emails/templates/EmailVerification.tsx` - React Email template
- `ops/sql/create-email-verification-tokens.sql` - Database table for tokens
- `ops/sql/add-email-confirmed-at-to-profiles.sql` - Adds verification column

**Breaking Changes to Watch:**
- If you change `profiles.email_confirmed_at` column → AuthContext breaks
- If you change `email_verification_tokens` table structure → Functions break
- If you change verification URL format → VerifyEmail page breaks
- If you change `resendVerificationEmail()` API → AccountSettings/EmailVerificationPrompt break

**Prevention Checklist:**
- ✅ Always check `profiles.email_confirmed_at` (NOT Supabase's `email_confirmed_at`)
- ✅ Verification tokens expire after 24 hours (must respect expiration)
- ✅ Tokens are single-use (must mark as used after verification)
- ✅ Custom verification status must sync with Supabase auth state
- ✅ Disable Supabase email confirmation in dashboard (we use our system)

**Rule of Thumb:**
> **When checking email verification status:**
> 1. Always check `profiles.email_confirmed_at` from database (custom system)
> 2. Do NOT use Supabase's `session.user.email_confirmed_at` (their system is disabled)
> 3. Verification tokens expire after 24 hours (check expiration before verification)
> 4. Tokens are single-use (mark as used after verification)
> 5. Email verification is sent via Resend (custom email template)

**Files to Watch:**
- `src/contexts/AuthContext.tsx` - Checks custom verification status (`fetchUserProfile()`)
- `src/components/EmailVerificationGuard.tsx` - Blocks unverified users
- `src/components/EmailVerificationPrompt.tsx` - Shows verification prompt
- `netlify/functions/send-verification-email.ts` - Token generation and email sending
- `netlify/functions/verify-email.ts` - Token verification and profile update
- `src/pages/VerifyEmail.tsx` - Verification page handler
- `src/pages/SignIn.tsx` - Sends verification email after signup

**Database Tables:**
- `email_verification_tokens` - Stores verification tokens with expiration
- `profiles.email_confirmed_at` - Stores verification timestamp (custom field)

**Migration Notes:**
- Must run SQL migrations before using system:
  - `ops/sql/create-email-verification-tokens.sql`
  - `ops/sql/add-email-confirmed-at-to-profiles.sql`
- Must disable Supabase email confirmation in dashboard
- Existing users may need to verify via new system if not already verified

**Testing Verified (2025-01-XX):**
- ✅ Verification email sent after signup
- ✅ Token verification updates profile
- ✅ AuthContext checks custom verification status
- ✅ EmailVerificationGuard blocks unverified users
- ✅ Resend verification email works from account page

---

### 16. Netlify Function Query Param Parsing Mismatch (2025-01-XX)

**What:** Serverless function read query params incorrectly, causing verification to fail.

**Failure Mode:**
```ts
// WRONG: Using URLSearchParams on queryStringParameters object
const params = new URLSearchParams(event.queryStringParameters as any) // ❌
const token = params.get('token') // null
```

**Fix:**
```ts
// CORRECT: Read token directly from queryStringParameters
const qp = event.queryStringParameters || {}
let token = typeof qp.token === 'string' ? qp.token : null
// Fallback: rawQuery if available
if (!token && (event as any).rawQuery) {
  const usp = new URLSearchParams((event as any).rawQuery)
  token = usp.get('token')
}
```

**Prevention Checklist:**
- ✅ Always check your platform’s request shape (Netlify: `queryStringParameters` is an object)
- ✅ Add a defensive fallback (`rawQuery`) for environments/dev servers
- ✅ Log clear errors that point to setup/migration issues vs bad tokens
- ✅ Document parameter contracts in the function header

**Files to Watch:**
- `netlify/functions/verify-email.ts`
- Any serverless function that reads query params

---

### 17. Business Ownership on Self‑Deletion (2025-01-XX)

**What:** When a user deletes their account, businesses might remain orphaned and later show as "found by email but not linked" after re‑signup.

**Fix:**
- Frontend: On delete, if user has businesses, prompt to delete or keep
- Backend: `user-delete` accepts `deleteBusinesses` flag
  - true → hard delete providers (permanent)
  - false → soft delete: add `deleted` badge and set `owner_user_id = null`
- Reconnection: On next login, `loadMyBusinesses()` finds providers by email with `owner_user_id IS NULL` and automatically links them back to the new `userId`, removing the `deleted` badge.

**Prevention Checklist:**
- ✅ Treat business ownership explicitly during account deletion
- ✅ Avoid orphaned providers by unlinking instead of silent leave-behind
- ✅ Provide a reconnection path (email match) on future signups
- ✅ Keep public directory integrity (soft delete keeps references from breaking)

**Files to Watch:**
- `netlify/functions/user-delete.ts` (accepts `deleteBusinesses`)
- `netlify/functions/utils/userDeletion.ts` (hard/soft delete logic)
- `src/pages/account/dataLoader.ts` (`loadMyBusinesses()` reconnection)

---

### 20. Admin Business Deletion Choice (2025-01-XX)

**What:** When an admin deletes a user account, they need to choose whether to permanently delete or keep (unlink) the user's businesses.

**Failure Mode:**
```typescript
// WRONG: Admin deletion doesn't handle businesses
async function deleteUser(userId: string) {
  // ❌ No prompt about businesses
  // ❌ No option to delete or keep businesses
  await deleteUserAndRelatedData(userId)
  // Businesses are always soft-deleted (unlinked), admin has no choice
}
```

**What Happened:**
1. Admin deletes user account via admin panel
2. User has businesses linked to their account
3. Backend always soft-deletes businesses (unlinks them)
4. Admin has no control over whether businesses should be permanently deleted
5. Result: Businesses remain in database even if admin wants them deleted

**The Fix:**
```typescript
// CORRECT: Check for businesses and prompt admin
async function deleteUser(userId: string, deleteBusinesses?: boolean) {
  // Check if user has businesses
  let shouldDeleteBusinesses = deleteBusinesses
  if (shouldDeleteBusinesses === undefined) {
    const { data: businesses } = await supabase
      .from('providers')
      .select('id, name')
      .eq('owner_user_id', userId)
    
    if (businesses && businesses.length > 0) {
      // Prompt admin about businesses
      const confirmMessage = 
        `This user has ${businesses.length} business(es):\n\n` +
        `${businessNames}\n\n` +
        `Delete businesses permanently? (OK = delete, Cancel = keep)`
      shouldDeleteBusinesses = confirm(confirmMessage)
    }
  }
  
  // Pass deleteBusinesses to backend
  await fetch('/api/delete-user', {
    body: JSON.stringify({ 
      user_id: userId,
      deleteBusinesses: shouldDeleteBusinesses === true
    })
  })
}
```

**Prevention Checklist:**
- ✅ Check for businesses before deletion (query providers table by owner_user_id)
- ✅ Prompt admin if businesses exist (show business names)
- ✅ Pass deleteBusinesses parameter to backend (true = hard delete, false = soft delete)
- ✅ Backend handles both cases (hard delete removes businesses, soft delete unlinks them)
- ✅ Success message indicates what happened with businesses
- ✅ Handle RLS policy failures gracefully (continue deletion even if business check fails)

**Rule of Thumb:**
> When deleting user accounts (admin or self-delete):
> 1. Check if user has businesses (query providers table by owner_user_id)
> 2. If businesses exist, prompt admin/user about deletion choice
> 3. Pass deleteBusinesses parameter to backend (true = hard delete, false = soft delete)
> 4. Backend handles deletion based on parameter (hard delete vs soft delete)
> 5. Success message should indicate what happened with businesses
> 6. Handle errors gracefully (continue deletion even if business check fails)

**Files to Watch:**
- `src/utils/adminUserUtils.ts` - Checks for businesses, prompts admin (deleteUser function)
- `netlify/functions/admin-delete-user.ts` - Accepts deleteBusinesses parameter
- `netlify/functions/user-delete.ts` - Accepts deleteBusinesses parameter (self-delete)
- `netlify/functions/utils/userDeletion.ts` - Handles hard/soft delete logic
- `src/pages/Account.tsx` - Prompts user about businesses (self-delete)

**Breaking Changes:**
- If you remove deleteBusinesses parameter → Businesses always soft-deleted (unlinked)
- If providers table RLS changes → Can't check for businesses before deletion
- If providers table structure changes → Business deletion logic fails
- If you change deleteBusinesses parameter name → Frontend breaks

**Testing Verified (2025-01-XX):**
- ✅ Admin is prompted about businesses when deleting user with businesses
- ✅ Hard delete (deleteBusinesses=true) permanently removes businesses
- ✅ Soft delete (deleteBusinesses=false) unlinks businesses (can be reconnected)
- ✅ Success message shows what happened with businesses
- ✅ Deletion continues even if business check fails (graceful error handling)

**Related:**
- Section #17: Business Ownership on Self‑Deletion (similar pattern for self-delete)
- Section #9: Incomplete Deletion Logic (comprehensive deletion patterns)

---

### 22. Event Images Stored in Supabase Storage (2025-01-XX)

**What:** New events automatically download images from Unsplash and store them in Supabase Storage. The database stores Supabase Storage URLs (your own storage), not Unsplash URLs.

**Root Cause:**
1. Previously, event creation saved Unsplash URLs directly to database
2. Images were served from Unsplash servers (not your own storage)
3. Browser inspector showed `background-image: url(https://images.unsplash.com/...)`
4. User wanted images stored in their own database/storage, not referenced from Unsplash

**The Fix:**
- **Automatic image download and storage**: When creating new events, the system:
  1. Fetches Unsplash image URL
  2. Downloads the image file
  3. Uploads to Supabase Storage (your own storage bucket `event-images`)
  4. Saves Supabase Storage URL to database (not Unsplash URL)
- **Existing events left alone**: Only NEW events trigger Unsplash → Supabase Storage flow
- **Display uses database only**: All images come from database (no external API calls on page load)

**Wrong Code:**
```typescript
// ❌ BROKEN: Saves Unsplash URL directly to database
const unsplashImageUrl = await fetchUnsplashImage(keywords)
if (unsplashImageUrl) {
  headerImage = { type: 'image', value: unsplashImageUrl } // Unsplash URL saved
  // Database stores: https://images.unsplash.com/...
  // Images served from Unsplash servers
}
```

**Correct Code:**
```typescript
// ✅ CORRECT: Downloads image and stores in Supabase Storage
const unsplashImageUrl = await fetchUnsplashImage(keywords)
if (unsplashImageUrl) {
  // Download image from Unsplash
  const supabaseStorageUrl = await downloadAndStoreImage(unsplashImageUrl, tempEventId)
  if (supabaseStorageUrl) {
    headerImage = { type: 'image', value: supabaseStorageUrl } // Supabase Storage URL saved
    // Database stores: https://your-project.supabase.co/storage/v1/object/public/event-images/...
    // Images served from YOUR Supabase Storage
  }
}
```

**Prevention Checklist:**
- ✅ Only NEW events trigger Unsplash API calls (automatic on event creation)
- ✅ Existing events are NEVER touched (left as-is in database)
- ✅ Images downloaded and stored in Supabase Storage (your own storage)
- ✅ Database stores Supabase Storage URLs (not Unsplash URLs)
- ✅ Display code uses database only (no external API calls on page load)
- ✅ Supabase Storage bucket `event-images` must exist (public bucket)

**Rule of Thumb:**
> When storing images from external APIs:
> 1. Download the image file (don't just save the URL)
> 2. Upload to your own storage (Supabase Storage, S3, etc.)
> 3. Save your storage URL to database (not external API URL)
> 4. Only trigger for NEW records (never touch existing data automatically)
> 5. Display always uses database (no external API calls)

**Files to Watch:**
- `src/pages/Calendar.tsx` (`handleCreateEvent` - downloads and stores images for new events only)
- `src/utils/eventImageStorage.ts` (`downloadAndStoreImage` - downloads from Unsplash, uploads to Supabase Storage)
- `src/utils/eventImageUtils.ts` (`fetchUnsplashImage` - fetches Unsplash URL, used only during event creation)
- `src/components/EventCard.tsx` (uses `getEventHeaderImageFromDb` - reads from database only, no API calls)
- `src/components/CalendarSection.tsx` (uses `getEventHeaderImageFromDb` - reads from database only, no API calls)

**Breaking Changes:**
- If you remove `downloadAndStoreImage` → New events won't store images in Supabase Storage
- If Supabase Storage bucket `event-images` doesn't exist → Image storage fails (falls back to Unsplash URL)
- If you change Supabase Storage bucket name → Image storage fails
- If you remove Unsplash API key → New events use gradient fallback (existing events unaffected)

**Dependencies:**
- Supabase Storage bucket `event-images` must exist (create in Supabase Dashboard → Storage)
- Bucket must be public (for public image URLs)
- Unsplash API key required for new event creation (only)
- Existing events in database are NOT modified (left as-is)

**Testing Verified (2025-01-XX):**
- ✅ New event creation downloads Unsplash image and stores in Supabase Storage
- ✅ Database stores Supabase Storage URL (not Unsplash URL)
- ✅ Display code reads from database only (no Unsplash API calls on page load)
- ✅ Existing events left unchanged (not modified automatically)
- ✅ Browser inspector shows Supabase Storage URLs (not Unsplash URLs)

**Related:**
- Section #21: Event Images Not Showing Due to Null image_type (display logic)
- Section #18: Event Images Not Showing from Database (original fix)
- Section #23: Gradient Strings Saved to Database (2025-11-05)

---

### 21. Event Images Not Showing Due to Null image_type (2025-01-XX)

**What:** Events with database `image_url` but null `image_type` were showing gradient fallbacks instead of their stored images, even though they had valid image URLs in the database.

**Root Cause:**
1. EventCard and Calendar.tsx require BOTH `image_url` AND `image_type` to display database images
2. Legacy events were created/populated with `image_url` but `image_type` was null
3. When `image_type` is null, the code falls back to gradient even though `image_url` exists
4. This is a cascading failure from Section #18 fix - the fix required both fields, but didn't handle legacy data

**What Happened:**
1. Events were populated with `image_url` values (Unsplash URLs or gradient strings)
2. Some events had `image_url` but `image_type` was null (legacy data or incomplete population)
3. EventCard checks `event.image_url && event.image_type` - if either is null, it falls back to gradient
4. Result: Events with valid database images show gradients instead of images

**The Fix:**
- **Legacy data handling**: Created `getEventHeaderImageFromDb()` helper that infers `image_type` from `image_url` format if `image_type` is null
- **Type inference**: If `image_url` starts with 'http', assume it's 'image' type; if it starts with 'linear-gradient', assume it's 'gradient' type
- **Updated all components**: EventCard, Calendar.tsx (3 locations), and CalendarSection now use the helper function
- **Database backfill script**: Created `scripts/backfill-event-image-types.ts` to set `image_type` for legacy events

**Wrong Code:**
```typescript
// ❌ BROKEN: Requires both fields, falls back to gradient if image_type is null
const headerImage = event.image_url && event.image_type
  ? { type: event.image_type as 'image' | 'gradient', value: event.image_url }
  : { type: 'gradient' as const, value: getEventGradient(event) }
// If image_type is null → always falls back to gradient, even if image_url exists
```

**Correct Code:**
```typescript
// ✅ CORRECT: Handles legacy events with null image_type
export function getEventHeaderImageFromDb(event: CalendarEvent): {
  type: 'image' | 'gradient'
  value: string
} {
  if (event.image_url) {
    // If image_type is set, use it
    if (event.image_type) {
      return { type: event.image_type as 'image' | 'gradient', value: event.image_url }
    }
    // Legacy events: infer type from image_url format
    // URLs (http/https) are image type, gradients are gradient type
    const inferredType = event.image_url.startsWith('http') ? 'image' : 'gradient'
    return { type: inferredType, value: event.image_url }
  }
  
  // No image_url: use gradient fallback
  return { type: 'gradient', value: getEventGradient(event) }
}

// Usage:
const headerImage = getEventHeaderImageFromDb(event)
```

**Prevention Checklist:**
- ✅ Handle legacy data where optional fields might be null (don't require both fields if one can be inferred)
- ✅ Infer missing field values from existing data when possible (image_type from image_url format)
- ✅ Use helper functions for complex logic (prevents duplication and inconsistency)
- ✅ Update all components that use the same logic (EventCard, Calendar.tsx, CalendarSection)
- ✅ Create database backfill scripts to fix legacy data
- ✅ Add logging to verify image_url is present in final events

**Rule of Thumb:**
> When checking for optional fields that depend on each other:
> 1. If one field can be inferred from another, don't require both to be non-null
> 2. Create helper functions for complex field validation/inference logic
> 3. Update all components that use the same logic (don't duplicate code)
> 4. Create database backfill scripts to fix legacy data with missing fields
> 5. Test with legacy data where optional fields might be null

**Files to Watch:**
- `src/components/EventCard.tsx` - Uses `getEventHeaderImageFromDb()` helper
- `src/pages/Calendar.tsx` - Uses `getEventHeaderImageFromDb()` helper (3 locations)
- `src/components/CalendarSection.tsx` - Updated logging to check for both fields or infer type
- `src/utils/eventImageUtils.ts` - Contains `getEventHeaderImageFromDb()` helper function
- `scripts/backfill-event-image-types.ts` - Backfill script to set image_type for legacy events

**Breaking Changes:**
- If you remove `getEventHeaderImageFromDb()` helper → All components break (code duplication)
- If you change image_type inference logic → Must update helper function and all usages
- If you change image_url format → Type inference logic might break

**Testing Verified (2025-01-XX):**
- ✅ Events with image_url and image_type show images correctly
- ✅ Events with image_url but null image_type infer type and show images correctly
- ✅ Events with image_url starting with 'http' are treated as 'image' type
- ✅ Events with image_url starting with 'linear-gradient' are treated as 'gradient' type
- ✅ Events without image_url show gradient fallback
- ✅ Database backfill script sets image_type for legacy events

**Related:**
- Section #18: Event Images Not Showing from Database (original fix that required both fields)
- Section #19: Explicit Column Selection Breaks When Columns Don't Exist (why we use `.select('*')`)
- Section #23: Gradient Strings Saved to Database (2025-11-05)

---

### 23. Gradient Strings Saved to Database (2025-11-05)

**What:** Populate scripts were saving CSS gradient strings (like `"linear-gradient(135deg, #667eea 0%, #764ba2 100%)"`) directly to the `image_url` column in the database when images couldn't be fetched. Gradient strings should NEVER be stored in the database - they should be computed dynamically on the frontend when `image_url` is `null`.

**Root Cause:**
1. `populate-event-images.ts` (both Netlify function and local script) were saving gradient strings to `image_url` when Unsplash API failed or when storage failed
2. The code treated gradients as a "fallback value" that should be saved to the database
3. This caused events to have gradient strings in `image_url` instead of actual image URLs or `null`
4. Frontend code already handles `null` image_url by computing gradients dynamically - saving gradients to DB was redundant and wrong

**What Happened:**
1. Events from iCalendar feeds were inserted without `image_url` (correctly set to `null`)
2. Populate script ran to fetch images for events without images
3. When Unsplash API failed or Supabase Storage failed, script saved gradient strings to `image_url`
4. Database now had gradient strings in `image_url` column
5. Frontend code detects gradient strings and ignores them (correctly), but this defeats the purpose of having images in the database

**The Fix:**
- **Never save gradient strings**: Updated all populate scripts to set `image_url: null` instead of saving gradient strings when images can't be fetched
- **Frontend computes gradients**: The frontend already has logic to compute gradients when `image_url` is `null` - no need to save gradients to database
- **Preserve existing images**: All external feed processors (iCalendar, RSS, KPBS, VoSD) preserve existing `image_url` and `image_type` when re-fetching events
- **Only populate missing images**: Populate scripts only process events with `null` image_url (not events that already have images)

**Wrong Code:**
```typescript
// ❌ BROKEN: Saves gradient strings to database
if (UNSPLASH_KEY) {
  const unsplashUrl = await fetchUnsplashImage(keywords)
  if (unsplashUrl) {
    const storageUrl = await downloadAndStoreImage(unsplashUrl, event.id)
    if (storageUrl) {
      imageUrl = storageUrl
      imageType = 'image'
    } else {
      // Storage failed - save gradient string to database ❌ WRONG
      imageUrl = getEventGradient(event) // ❌ This is a CSS string!
      imageType = 'gradient'
    }
  } else {
    // Unsplash failed - save gradient string to database ❌ WRONG
    imageUrl = getEventGradient(event) // ❌ This is a CSS string!
    imageType = 'gradient'
  }
} else {
  // No API key - save gradient string to database ❌ WRONG
  imageUrl = getEventGradient(event) // ❌ This is a CSS string!
  imageType = 'gradient'
}

await supabase
  .from('calendar_events')
  .update({ image_url: imageUrl, image_type: imageType }) // ❌ Saves gradient string!
```

**Correct Code:**
```typescript
// ✅ CORRECT: Never saves gradient strings, sets to null instead
let imageUrl: string | null = null
let imageType: 'image' | null = null

if (UNSPLASH_KEY) {
  const unsplashUrl = await fetchUnsplashImage(keywords)
  if (unsplashUrl) {
    const storageUrl = await downloadAndStoreImage(unsplashUrl, event.id)
    if (storageUrl && storageUrl.includes('supabase.co/storage')) {
      // Successfully stored in Supabase Storage
      imageUrl = storageUrl
      imageType = 'image'
    } else {
      // Storage failed - set to null (frontend will compute gradient)
      imageUrl = null
      imageType = null
    }
  } else {
    // Unsplash failed - set to null (frontend will compute gradient)
    imageUrl = null
    imageType = null
  }
} else {
  // No API key - set to null (frontend will compute gradient)
  imageUrl = null
  imageType = null
}

await supabase
  .from('calendar_events')
  .update({ image_url: imageUrl, image_type: imageType }) // ✅ null if no image
```

**Prevention Checklist:**
- ✅ NEVER save gradient strings to `image_url` column - always use `null` when images can't be fetched
- ✅ Frontend computes gradients dynamically when `image_url` is `null` - no need to save gradients to database
- ✅ Populate scripts only process events with `null` image_url (skip events that already have images)
- ✅ External feed processors preserve existing `image_url` and `image_type` when re-fetching events
- ✅ If storage fails, set `image_url` to `null` (don't fall back to saving gradient strings)
- ✅ All functions that modify events preserve existing images (don't overwrite them)

**Rule of Thumb:**
> When handling image fallbacks:
> 1. **NEVER** save gradient strings to `image_url` column - always use `null`
> 2. Frontend computes gradients when `image_url` is `null` - no need to save gradients to database
> 3. Populate scripts only process events with `null` image_url (skip events that already have images)
> 4. External feed processors preserve existing `image_url` and `image_type` when re-fetching events
> 5. If image storage fails, set `image_url` to `null` (don't save gradient strings as fallback)

**Files to Watch:**
- `netlify/functions/populate-event-images.ts` - Fixed to never save gradient strings
- `scripts/populate-event-images.ts` - Fixed to never save gradient strings
- `netlify/functions/manual-fetch-events.ts` - Preserves existing images when re-fetching
- `netlify/functions/scheduled-fetch-events.ts` - Preserves existing images when re-fetching
- `netlify/functions/fetch-kpbs-events.ts` - Preserves existing images when re-fetching
- `netlify/functions/fetch-vosd-events.ts` - Preserves existing images when re-fetching
- `src/utils/eventImageUtils.ts` - `getEventHeaderImageFromDb()` ignores gradient strings in database

**Breaking Changes:**
- If you restore code that saves gradient strings to `image_url` → Frontend will ignore them (wastes database space)
- If you remove null-check logic in populate scripts → Scripts might try to re-populate events that already have images
- If you remove image preservation logic in feed processors → Events will lose their images when re-fetched

**Image Preservation Guarantees:**
- ✅ **External feed processors preserve images**: All iCalendar/RSS/KPBS/VoSD sync functions preserve existing `image_url` and `image_type` when re-fetching events
- ✅ **Populate scripts only process missing images**: Scripts only populate events with `null` image_url (skip events that already have images)
- ✅ **No automatic overwrites**: No automated process will overwrite existing images - they are preserved during re-fetches
- ✅ **One-time population**: After images are populated, they will NOT be overwritten by automated processes

**Testing Verified (2025-11-05):**
- ✅ Populate scripts set `image_url` to `null` when images can't be fetched (not gradient strings)
- ✅ Frontend computes gradients when `image_url` is `null` (works correctly)
- ✅ External feed processors preserve existing images when re-fetching events
- ✅ Populate scripts skip events that already have images (only process `null` image_url)
- ✅ Cleanup script removes existing gradient strings from database
- ✅ All 33 events successfully populated with Supabase Storage URLs (not gradient strings)

**Related:**
- Section #22: Event Images Stored in Supabase Storage (image storage pattern)
- Section #21: Event Images Not Showing Due to Null image_type (display logic)
- Section #18: Event Images Not Showing from Database (original fix)

---

### 24. RLS Policy Conflicts and Duplicate Policies ⭐ DATABASE SECURITY ISSUE (2025-01-XX)

**What:** Row Level Security (RLS) policies can conflict or duplicate, causing inserts/updates/deletes to fail silently or with confusing errors.

**Root Cause:**
- Multiple RLS policy files can create duplicate policies with different names
- Conflicting policies (e.g., restrictive vs. public) can cause evaluation failures
- `auth.jwt() ->> 'email'` may not be available or match exactly, causing restrictive policies to fail
- Policies from different migration files can conflict with master policies

**Example:**
```sql
-- ❌ PROBLEM: Two INSERT policies with different names
-- From migration file:
CREATE POLICY "applications_insert_all" 
ON public.business_applications FOR INSERT
WITH CHECK (true);

-- From master RLS file:
CREATE POLICY "applications_insert_public" 
ON public.business_applications FOR INSERT
WITH CHECK (true);

-- ❌ PROBLEM: Restrictive policy that fails
-- From fix file:
CREATE POLICY "Users can insert own applications" 
ON public.business_applications FOR INSERT
WITH CHECK (email = auth.jwt() ->> 'email');  -- ❌ auth.jwt() ->> 'email' may not be available
```

**Symptoms:**
- Users get "new row violates row-level security policy" errors
- Inserts fail even when they should work
- Multiple policies with similar names exist
- Policies from different files conflict

**Fix:**
1. **Drop ALL existing policies** before creating new ones:
   ```sql
   -- Drop ALL existing INSERT policies
   DROP POLICY IF EXISTS "applications_insert_all" ON public.business_applications;
   DROP POLICY IF EXISTS "applications_insert_public" ON public.business_applications;
   DROP POLICY IF EXISTS "Users can insert own applications" ON public.business_applications;
   -- ... drop all variations
   ```

2. **Create single consistent policy** matching master RLS file:
   ```sql
   -- Create single public INSERT policy
   CREATE POLICY "applications_insert_public" 
   ON public.business_applications FOR INSERT
   WITH CHECK (true);
   ```

3. **Verify policies** after creation:
   ```sql
   SELECT 
     schemaname, 
     tablename, 
     policyname, 
     cmd,
     qual,
     with_check
   FROM pg_policies 
   WHERE tablename = 'business_applications'
     AND cmd = 'INSERT'
   ORDER BY policyname;
   ```

**Wrong Code:**
```sql
-- ❌ Creating policy without dropping existing ones
CREATE POLICY "Users can insert own applications" 
ON public.business_applications FOR INSERT
WITH CHECK (email = auth.jwt() ->> 'email');  -- ❌ May fail if JWT email not available

-- ❌ Multiple policies with different names
CREATE POLICY "applications_insert_all" ...;  -- From migration
CREATE POLICY "applications_insert_public" ...;  -- From master
-- ❌ Both exist, but one might be restrictive and block inserts
```

**Correct Code:**
```sql
-- ✅ Drop ALL existing policies first
DROP POLICY IF EXISTS "applications_insert_all" ON public.business_applications;
DROP POLICY IF EXISTS "applications_insert_public" ON public.business_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.business_applications;
DROP POLICY IF EXISTS "Users can insert own applications (auth)" ON public.business_applications;
DROP POLICY IF EXISTS "ba_anon_insert" ON public.business_applications;
DROP POLICY IF EXISTS "ba_auth_insert" ON public.business_applications;

-- ✅ Create single consistent policy
CREATE POLICY "applications_insert_public" 
ON public.business_applications FOR INSERT
WITH CHECK (true);

-- ✅ Verify only one policy exists
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'business_applications' AND cmd = 'INSERT';
```

**Prevention Checklist:**
- ✅ **ALWAYS drop existing policies** before creating new ones
- ✅ **Check for duplicate policies** before creating new ones
- ✅ **Use consistent policy names** matching master RLS file
- ✅ **Avoid restrictive policies** that depend on `auth.jwt() ->> 'email'` (may not be available)
- ✅ **Use public INSERT policies** for public forms (similar to `contact_leads`)
- ✅ **Rely on SELECT/DELETE policies** for security (email matching, admin checks)
- ✅ **Verify policies after creation** to ensure only one exists per operation
- ✅ **Document policy rationale** in SQL comments

**Rule of Thumb:**
> When fixing RLS policies:
> 1. **Drop ALL existing policies** for the operation (INSERT/UPDATE/DELETE/SELECT)
> 2. **Create single consistent policy** matching master RLS file
> 3. **Use public INSERT policies** for public forms (security enforced by SELECT/DELETE)
> 4. **Avoid `auth.jwt() ->> 'email'`** - use `auth.uid()` or `auth.users` table instead
> 5. **Verify policies after creation** to ensure clean state
> 6. **Check for duplicate policies** from different migration files

**How to Check for Duplicate Policies:**
```sql
-- Check all INSERT policies
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'business_applications' 
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Check all policies for a table
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'business_applications'
ORDER BY cmd, policyname;
```

**Security Note:**
- Public INSERT policies don't compromise security if SELECT/DELETE policies enforce email matching
- Users can submit applications, but can only VIEW/DELETE their own (by email)
- Admins can VIEW/UPDATE/DELETE all applications
- Email matching is enforced by SELECT/DELETE policies, not INSERT

**Files to Watch:**
- `ops/rls/02-MASTER-RLS-POLICIES.sql` - Master RLS policies (source of truth)
- `ops/rls/fix-*.sql` - Individual fix files (should match master)
- `ops/migrations/*.sql` - Migration files (may create duplicate policies)
- Any file that modifies RLS policies

**Related:**
- Section #9: Incomplete Deletion Logic (user deletion patterns)
- Section #17: Business Ownership on Self-Deletion (business deletion patterns)
- `docs/prevention/BUSINESS_APPLICATIONS_INSERT_RLS_FIX.md` - Complete dependency tracking for this fix

---

### 18. Event Images Not Showing from Database (2025-11-03)

**What:** Events with database images (`image_url` and `image_type`) were showing gradient fallbacks instead of their stored images.

**Root Cause:**
1. Query using `.select('*')` might not include `image_url` if RLS filters columns (though policy allows reading all fields)
2. External events (iCalendar) were merged with database events without deduplication
3. If external events had same IDs as database events, they could override database events (losing `image_url`)

**Fix:**
- **Explicit field selection**: Changed from `.select('*')` to explicitly selecting all fields including `image_url` and `image_type`
- **Deduplication logic**: Created a Map of database events by ID, then filter out external events that match database event IDs (database events have priority)
- **Preserve database images**: Database events are placed first in the merged array, external events are filtered to remove duplicates

**Wrong Code:**
```typescript
// Query might not include image_url if RLS filters
const { data: dbEvents } = await supabase
  .from('calendar_events')
  .select('*') // ❌ Might not include image_url

// Merge without deduplication - external events can override database events
const allEvents = [
  ...(dbEvents || []),
  ...rssEvents, // ❌ No image_url
  ...calendarEvents // ❌ No image_url, might override database events
]
```

**Correct Code:**
```typescript
// Explicitly select image_url and image_type to ensure they're included
const { data: dbEvents } = await supabase
  .from('calendar_events')
  .select('id, title, description, date, time, location, address, category, source, upvotes, downvotes, created_at, updated_at, user_id, provider_id, created_by_user_id, is_flagged, flag_count, url, image_url, image_type') // ✅ Explicit

// Create map of database events to preserve image data
const dbEventsMap = new Map<string, CalendarEvent>()
dbEvents?.forEach(event => {
  dbEventsMap.set(event.id, event)
})

// Filter external events to remove duplicates (database has priority)
const uniqueExternalEvents = externalEvents.filter(externalEvent => {
  return !dbEventsMap.has(externalEvent.id) // ✅ Skip if database event exists
})

// Combine: Database first (has images), then unique external events
const allEvents = [
  ...(dbEvents || []), // ✅ Database events with images first
  ...uniqueExternalEvents // ✅ Only unique external events
]
```

**Prevention Checklist:**
- ✅ Explicitly select `image_url` and `image_type` in queries (don't rely on `*`)
- ✅ Deduplicate external events to prevent overriding database events
- ✅ Database events have priority over external events (preserve images)
- ✅ Add logging to verify `image_url` is present in final merged events
- ✅ Test with events that have database images to verify they show images

**Rule of Thumb:**
> When merging database events with external events:
> 1. Explicitly select all fields including `image_url` and `image_type` (don't use `*`)
> 2. Create a Map of database events by ID to preserve image data
> 3. Filter external events to remove duplicates (database events have priority)
> 4. Database events should be first in the merged array
> 5. Add diagnostic logging to verify `image_url` is present in final events

**Files to Watch:**
- `src/pages/Calendar.tsx` (`fetchCalendarEvents()` - uses `.select('*')` and deduplication)
- `src/components/CalendarSection.tsx` (uses `fetchCalendarEvents()` - automatically benefits)
- `src/components/EventCard.tsx` (checks `event.image_url` and `event.image_type`)

**Related:**
- Section #14: Async Operation Order in SIGNED_IN Handler
- Section #15: Custom Email Verification System
- Section #19: Explicit Column Selection Breaks When Columns Don't Exist (⚠️ **This fix caused Section #19** - explicit column selection broke the query)

---

### 19. Explicit Column Selection Breaks When Columns Don't Exist (2025-11-03)

**What:** When explicitly selecting columns in Supabase queries, if any column doesn't exist in the database, the query fails and returns no data (or empty results).

**Root Cause:**
- Explicit column selection (e.g., `.select('id, title, image_url')`) requires ALL listed columns to exist
- If you select columns that were never added via migrations, Supabase returns an error or empty results
- TypeScript types may include optional fields that don't exist in the actual database schema
- Using `.select('*')` is safer because it only selects columns that actually exist

**Example:**
```typescript
// ❌ BROKEN: Tries to select columns that might not exist
const { data, error } = await supabase
  .from('calendar_events')
  .select('id, title, user_id, provider_id, is_flagged, flag_count, url, image_url, image_type')
  // If ANY of these columns don't exist → query fails → returns empty/no data

// ✅ CORRECT: Selects all existing columns automatically
const { data, error } = await supabase
  .from('calendar_events')
  .select('*')
  // Only selects columns that actually exist in the database
```

**Fix:**
- Use `.select('*')` instead of explicit column lists
- If you need specific columns, verify they exist in the database first (check migrations)
- Add error handling to detect query failures
- Log query errors with full details (message, code, hint, details)

**Wrong Code:**
```typescript
// Selecting columns that might not exist
const { data: dbEvents, error: dbError } = await supabase
  .from('calendar_events')
  .select('id, title, user_id, provider_id, is_flagged, flag_count, url, image_url, image_type')
  // ❌ If user_id, provider_id, is_flagged, flag_count, or url don't exist → FAILS

// No error handling
if (dbError) {
  console.warn('Error:', dbError) // ❌ Not enough detail
}
```

**Correct Code:**
```typescript
// Use * to select all existing columns
const { data: dbEvents, error: dbError } = await supabase
  .from('calendar_events')
  .select('*') // ✅ Automatically selects only existing columns
  .order('date', { ascending: true })

// Comprehensive error handling
if (dbError) {
  console.error('[fetchCalendarEvents] Database query error:', dbError)
  console.error('[fetchCalendarEvents] Error details:', {
    message: dbError.message,
    details: dbError.details,
    hint: dbError.hint,
    code: dbError.code
  })
  return [] // ✅ Return empty array on error to prevent breaking app
}

if (!dbEvents) {
  console.warn('[fetchCalendarEvents] No events returned')
  return []
}
```

**Prevention Checklist:**
- ✅ **ALWAYS use `.select('*')`** unless you're 100% certain all columns exist
- ✅ **Check migrations** before explicitly selecting columns
- ✅ **Add comprehensive error logging** to detect query failures
- ✅ **Return empty array on error** to prevent breaking the app
- ✅ **Verify database schema** matches TypeScript types before explicit selection
- ✅ **Test with actual database** to ensure columns exist

**Rule of Thumb:**
> When querying Supabase:
> 1. **Default to `.select('*')`** - it's safer and automatically selects existing columns
> 2. **Only use explicit column selection** if you've verified all columns exist via migrations
> 3. **Always check for errors** and log full error details (message, code, hint, details)
> 4. **Return empty array on error** to prevent breaking the app
> 5. **TypeScript types may include optional fields that don't exist** - don't assume types match database

**How to Verify Database Schema:**
1. Check migration files in `ops/migrations/` to see what columns were added
2. Check base table creation in `scripts/create-*-tables.sql`
3. Query database directly: `SELECT column_name FROM information_schema.columns WHERE table_name = 'table_name'`
4. Use Supabase dashboard to inspect table structure

**Files to Watch:**
- `src/pages/Calendar.tsx` (`fetchCalendarEvents()` - uses `.select('*')`)
- Any file using explicit column selection in Supabase queries
- Migration files to verify which columns actually exist

**Related:**
- Section #18: Event Images Not Showing from Database
- Section #15: Custom Email Verification System

---

### 25. Direct Supabase Queries Breaking After Refactoring ⭐ REFACTORING BREAKAGE (2025-01-XX)

**What:** After refactoring to use centralized query utility, some files still use direct `supabase.from()` calls, causing RLS errors, inconsistent error handling, and broken functionality.

**Root Cause:**
1. Migration to centralized query utility (`src/lib/supabaseQuery.ts`) was incomplete
2. Some files were missed during migration (e.g., `adminService.ts`, `BusinessPage.tsx`)
3. Direct Supabase queries don't use centralized retry logic, error handling, or RLS policies correctly
4. When RLS policies change, direct queries break but centralized utility handles them correctly
5. Forms stop working after refactoring because they still use direct queries

**Example:**
```typescript
// ❌ BROKEN: Direct Supabase query (no retry, inconsistent error handling)
const { data, error } = await supabase
  .from('business_applications')
  .select('*')
  .eq('email', auth.email)

if (error) throw error // ❌ No retry, no error classification
return data || []

// ✅ CORRECT: Centralized query utility (retry, error handling, RLS compliance)
const result = await query('business_applications', { logPrefix: '[MyBusiness]' })
  .select('*')
  .eq('email', auth.email.trim())
  .order('created_at', { ascending: false })
  .execute()

if (result.error) {
  console.error('[MyBusiness] ❌ Error loading applications:', result.error)
  return [] // ✅ Graceful error handling
}
return result.data || []
```

**What Happened:**
1. `useBusinessOperations.ts` was migrated to use centralized `query()` utility ✅
2. `BusinessPage.tsx` was NOT migrated - still uses direct `supabase.from('business_applications').insert()` ❌
3. `adminService.ts` was NOT migrated - still uses direct queries for SELECT/UPDATE/DELETE ❌
4. When RLS policies changed, direct queries started failing with 403 errors
5. Forms that worked before stopped working after refactoring other parts
6. User gets "Success!" message but application doesn't appear (query fails silently)

**The Fix:**
1. **Migrate ALL direct Supabase queries** to use centralized utility:
   ```typescript
   // Replace ALL instances of:
   supabase.from('business_applications').select() // ❌
   supabase.from('business_applications').insert() // ❌
   supabase.from('business_applications').update() // ❌
   supabase.from('business_applications').delete() // ❌
   
   // With:
   query('business_applications').select().execute() // ✅
   insert('business_applications', [data]) // ✅
   update('business_applications', data).eq('id', id).execute() // ✅
   delete('business_applications').eq('id', id).execute() // ✅
   ```

2. **Add delay after insert** to ensure data is visible before querying:
   ```typescript
   await insert('business_applications', [applicationData])
   await new Promise(resolve => setTimeout(resolve, 500)) // ✅ Wait for DB to process
   await loadBusinessData() // ✅ Now query will find the new application
   ```

3. **Use `.trim()` on email** to prevent whitespace mismatches:
   ```typescript
   .eq('email', auth.email.trim()) // ✅ Prevents whitespace issues
   ```

**Prevention Checklist:**
- ✅ **ALWAYS use centralized query utility** for all Supabase queries (no direct `supabase.from()` calls)
- ✅ **Search for direct Supabase queries** before refactoring: `grep -r "supabase\.from\(" src/`
- ✅ **Migrate ALL instances** when refactoring (don't leave some behind)
- ✅ **Add delay after insert** before querying (ensure DB has processed the insert)
- ✅ **Use `.trim()` on email** to prevent whitespace mismatches
- ✅ **Test forms end-to-end** after refactoring (submit → verify it appears)
- ✅ **Check for RLS errors** in console logs after refactoring
- ✅ **Verify data appears** in UI after submission (not just "Success!" message)

**Rule of Thumb:**
> When refactoring to use centralized query utility:
> 1. **Search for ALL direct Supabase queries** first: 
>    - PowerShell: `Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "supabase\.from\("`
>    - Bash: `grep -r "supabase\.from\(" src/`
> 2. **Migrate ALL instances** in one commit (don't leave some behind)
> 3. **Test forms end-to-end** after migration (submit → verify it appears)
> 4. **Add delay after insert** before querying (ensure DB has processed)
> 5. **Use `.trim()` on email** to prevent whitespace issues
> 6. **Check console logs** for RLS errors after refactoring
> 7. **Verify data appears** in UI (not just success message)

**How to Find Direct Supabase Queries:**

**PowerShell (Windows):**
```powershell
# Find all direct Supabase queries
Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "supabase\.from\("

# Find all business_applications queries specifically
Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "business_applications"

# Find all INSERT operations
Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "\.insert\("

# Find all SELECT operations
Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "\.select\("
```

**Bash/Linux/Mac:**
```bash
# Find all direct Supabase queries
grep -r "supabase\.from\(" src/

# Find all business_applications queries specifically
grep -r "business_applications" src/ --include="*.ts" --include="*.tsx"

# Find all INSERT operations
grep -r "\.insert\(" src/ --include="*.ts" --include="*.tsx"

# Find all SELECT operations
grep -r "\.select\(" src/ --include="*.ts" --include="*.tsx"
```

**Files to Watch:**
- `src/services/adminService.ts` - Still uses direct queries for business_applications
- `src/pages/BusinessPage.tsx` - Still uses direct `insert()` for business_applications
- `src/pages/MyBusiness/hooks/useBusinessOperations.ts` - ✅ Already migrated (use as reference)
- Any file that was "missed" during migration

**Breaking Changes:**
- If you refactor one file to use centralized utility but leave others using direct queries → Forms break
- If you change RLS policies but don't migrate all direct queries → Queries fail with 403 errors
- If you don't add delay after insert → New data doesn't appear immediately (query runs too fast)

**Testing Verified (2025-01-XX):**
- ✅ Direct queries cause 403 errors when RLS policies change
- ✅ Centralized utility handles RLS correctly with retry logic
- ✅ Adding delay after insert ensures data is visible before querying
- ✅ Using `.trim()` on email prevents whitespace mismatches
- ✅ Forms work correctly after migrating to centralized utility

**Related:**
- Section #24: RLS Policy Conflicts and Duplicate Policies (RLS policy changes)
- `docs/SUPABASE_QUERY_UTILITY.md` - Centralized query utility documentation
- `docs/SUPABASE_QUERY_MIGRATION_TESTING.md` - Migration testing instructions

---

## How to Prevent This (Action Plan)

### Immediate (5 minutes after EVERY change):

1. **Impact Analysis**

   **PowerShell (Windows):**
   ```powershell
   # What files import what I changed?
   Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "changed-file"
   
   # What depends on this functionality?
   Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "changed-function"
   ```

   **Bash/Linux/Mac:**
   ```bash
   # What files import what I changed?
   grep -r "changed-file" src/
   
   # What depends on this functionality?
   grep -r "changed-function" src/
   ```

2. **Smoke Test Checklist**
   - [ ] Can user sign up? 
   - [ ] Can admin view profiles?
   - [ ] Can admin view resident verification?
   - [ ] Does name display correctly?
   - [ ] Do other admin sections work?
   - [ ] **Can admin navigate between pages without getting logged out?** ⭐ NEW
   - [ ] **Does admin status persist during navigation?** ⭐ NEW
  - [ ] **Can users log in without immutable field errors?** ⭐ NEW
  - [ ] **Does user deletion remove ALL related data?** ⭐ NEW
  - [ ] **Do all React components receive their props correctly?** ⭐ NEW
  - [ ] **Are function props called with guard checks?** ⭐ NEW
  - [ ] **Do deleted users stay deleted after page refresh?** ⭐ NEW ✅ TESTED
  - [ ] **Can admin delete users who only exist in funnels/bookings without profiles?** ⭐ NEW ✅ TESTED
  - [ ] **Can admin delete both business and customer accounts successfully?** ⭐ NEW ✅ TESTED
  - [ ] **Can users verify their email via custom verification system?** ⭐ NEW
  - [ ] **Does email verification status update correctly after verification?** ⭐ NEW
  - [ ] **Are unverified users blocked from protected features?** ⭐ NEW
  - [ ] **Can users resend verification emails from account page?** ⭐ NEW
  - [ ] **Do calendar events with database images show their images (not gradients)?** ⭐ NEW
  - [ ] **Do calendar events without database images show gradient fallbacks?** ⭐ NEW
  - [ ] **Can admin choose to delete or keep businesses when deleting user account?** ⭐ NEW ✅ TESTED
  - [ ] **Does admin deletion prompt show business names when user has businesses?** ⭐ NEW ✅ TESTED
  - [ ] **Are businesses hard deleted when admin chooses to delete them?** ⭐ NEW ✅ TESTED
  - [ ] **Are businesses soft deleted (unlinked) when admin chooses to keep them?** ⭐ NEW ✅ TESTED
  - [ ] **Can users submit business applications without RLS errors?** ⭐ NEW ✅ TESTED
  - [ ] **Do business applications appear in user's "My Business" page after submission?** ⭐ NEW
  - [ ] **Are all Supabase queries using centralized utility (no direct `supabase.from()` calls)?** ⭐ NEW
  - [ ] **Do forms work end-to-end after refactoring (submit → verify data appears)?** ⭐ NEW

3. **Manual Testing**
   - Actually USE the app after every change
   - Click through ALL related pages
   - Don't just test the one thing you changed

---

### Short-term (1-2 days):

1. **Integration Tests**
   ```typescript
   // Test critical flows end-to-end
   describe('Signup to Admin View Flow', () => {
     it('should work end-to-end', async () => {
       // 1. Sign up with name and resident status
       // 2. Verify name saved
       // 3. Verify resident data saved
       // 4. Admin logs in
       // 5. Admin sees name
       // 6. Admin sees resident verification data
     })
   })
   ```

2. **Dependency Documentation**
   ```typescript
   /**
    * DEPENDENCIES:
    * - AuthContext: Provides user session
    * - admin-list-profiles: Returns profile data
    * - ProfileRow type: Defines data structure
    * 
    * CONSUMERS:
    * - ResidentVerificationSection: Displays data
    * - UsersSection: Displays user list
    * 
    * IF YOU CHANGE THIS:
    * - Update ProfileRow type
    * - Update admin-list-profiles query
    * - Test all consumers
    */
   ```

3. **Change Impact Checklist**
   - [ ] What files import this?
   - [ ] What functions depend on this?
   - [ ] What UI components use this?
   - [ ] What data flows through this?
   - [ ] Have I tested ALL of these?

---

### Long-term (1 week):

1. **Architecture Review**
   - Reduce shared state
   - Create clear boundaries
   - Document data flow
   - Create integration tests for each boundary

2. **Automated Testing**
   - Unit tests for individual functions
   - Integration tests for critical flows
   - E2E tests for user journeys
   - Run all tests before merging

3. **Code Review Process**
   - Reviewer checks: "What else might be affected?"
   - Reviewer tests: "Does everything still work?"
   - Reviewer verifies: "Are related files updated?"

---

## Checklist for Every Change

Before committing ANY change:

- [ ] **Impact Analysis:** What else might be affected?
  
  **PowerShell (Windows):**
  ```powershell
  Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "changed-thing"
  ```
  
  **Bash/Linux/Mac:**
  ```bash
  grep -r "changed-thing" src/
  ```
- [ ] **Smoke Tests:** Does everything still work?
  - [ ] Signup works - name must appear immediately after signup
  - [ ] Signin works
  - [ ] Admin pages load
  - [ ] All sections display correctly
  - [ ] Name is stored in database after signup
  - [ ] Name is read from localStorage before database during signup
  - [ ] **Can users submit business applications without RLS errors?** ⭐ NEW
  - [ ] **Do business applications appear in user's "My Business" page after submission?** ⭐ NEW
- [ ] **RLS Policy Checks** (if modifying database policies):
  - [ ] Checked for duplicate policies before creating new ones
  - [ ] Dropped ALL existing policies for the operation before creating new ones
  - [ ] Verified only one policy exists per operation after creation
  - [ ] Policy names match master RLS file
  - [ ] Tested that inserts/updates/deletes work correctly
  - [ ] Verified security (SELECT/DELETE policies still enforce email matching)
- [ ] **Related Files:** Are they all updated?
  - [ ] Types updated?
  - [ ] Functions updated?
  - [ ] Components updated?
  - [ ] Tests updated?
  - [ ] **RLS policies updated?** ⭐ NEW
- [ ] **All Supabase queries migrated to centralized utility?** ⭐ NEW
  - [ ] Search for direct queries:
    - PowerShell: `Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "supabase\.from\("`
    - Bash: `grep -r "supabase\.from\(" src/`
  - [ ] Migrate all instances in one commit
  - [ ] Test forms end-to-end after migration
- [ ] **Integration Test:** Does the whole flow work?
- [ ] **Manual Testing:** Actually USE the app

---

## Most Important Rule

**Before making ANY change, ask yourself:**

1. "What ELSE might be affected?"
2. "Have I tested ALL related functionality?"
3. "Does the WHOLE system still work?"

**If you can't answer these, DON'T commit the change yet.**

---

## Summary

**Root Cause:** 
Fixing one thing without checking what ELSE depends on it.

**Quick Fix (5 min):**
- Run impact analysis (grep)
- Run smoke tests manually
- Don't commit until everything works

**Long-term Fix:**
- Integration tests
- Dependency documentation
- Architecture improvements
- Automated testing

**The Pattern:**
```
Fix X
  → Break Y (hidden dependency)
    → Fix Y
      → Break Z (another hidden dependency)
        → Fix Z
          → Break X again (circular dependency)
            → 🔥 BURN IT ALL DOWN
```

**The Solution:**
```
Fix X
  → Check what depends on X
  → Fix ALL related things
  → Test EVERYTHING
  → Then commit
```

