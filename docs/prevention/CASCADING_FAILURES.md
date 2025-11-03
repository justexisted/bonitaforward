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

## How to Prevent This (Action Plan)

### Immediate (5 minutes after EVERY change):

1. **Impact Analysis**
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
- [ ] **Related Files:** Are they all updated?
  - [ ] Types updated?
  - [ ] Functions updated?
  - [ ] Components updated?
  - [ ] Tests updated?
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

