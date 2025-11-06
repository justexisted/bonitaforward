# Business Applications Root Cause Analysis
**Date:** 2025-01-XX  
**Issue:** 4 rejected applications not showing in Recently Rejected section

## 🔍 COMPLETE DATA FLOW ANALYSIS

### 1. WHERE APPLICATIONS ARE STORED
**Table:** `business_applications`
- **Columns:** `id`, `email`, `business_name`, `status`, `created_at`, `decided_at` (optional)
- **Status values:** `'pending'`, `'approved'`, `'rejected'`
- **Location:** Supabase database

### 2. HOW APPLICATIONS ARE APPROVED/REJECTED

#### Approval Flow:
**File:** `src/utils/adminBusinessApplicationUtils.ts` → `approveApplication()`
1. Admin clicks "Approve" button
2. Creates provider in `providers` table
3. Updates `business_applications.status = 'approved'` (line 233-238)
4. **❌ DOES NOT SET `decided_at`** - Missing field!
5. Sends email via `notifyApplicationApproved()`
6. Creates notification in `user_notifications` table

#### Rejection Flow:
**File:** `src/utils/adminBusinessApplicationUtils.ts` → `deleteApplication()`
1. Admin clicks "Delete/Reject" button
2. Updates `business_applications.status = 'rejected'` (line 351-356)
3. **❌ DOES NOT SET `decided_at`** - Missing field!
4. Sends email via `notifyChangeRequestRejected()`
5. Creates notification in `user_notifications` table
6. **❌ DELETES THE APPLICATION** (line 427-430) - **THIS IS THE PROBLEM!**

### 3. WHERE NOTIFICATIONS ARE CREATED

**Table:** `user_notifications`
- **Created by:** `adminBusinessApplicationUtils.ts` (lines 257-268 for approved, 384-395 for rejected)
- **Type:** `'application_approved'` or `'application_rejected'`
- **Recipient:** User found by email match in `profiles` table

**Email Notifications:**
- **Service:** `src/services/emailNotificationService.ts`
- **Function:** `notifyApplicationApproved()` or `notifyChangeRequestRejected()`
- **Sent via:** Netlify function `send-email.ts` using Resend

### 4. HOW APPLICATIONS ARE QUERIED

**File:** `src/pages/MyBusiness/hooks/useBusinessOperations.ts` → `loadBusinessData()`
- **Query:** `query('business_applications').select('*').eq('email', auth.email.trim())`
- **RLS Policy:** `applications_select_owner` 
- **Policy Condition:** `email = (SELECT email FROM auth.users WHERE id = auth.uid())`

### 5. THE ROOT CAUSES

#### ❌ ROOT CAUSE #1: APPLICATIONS ARE DELETED, NOT REJECTED
**Problem:**
- When admin rejects an application, `deleteApplication()` DELETES the row (line 427-430)
- The application is removed from the database entirely
- **Result:** Rejected applications don't exist in the database, so they can't be displayed

**Evidence:**
```typescript
// Line 427-430 in adminBusinessApplicationUtils.ts
const deleteResult = await query('business_applications', { logPrefix: '[Admin]' })
  .delete()
  .eq('id', appId)
  .execute()
```

**Why this is wrong:**
- Applications should be kept for audit trail
- Users need to see their rejected applications
- The status is set to 'rejected' but then immediately deleted

#### ❌ ROOT CAUSE #2: `decided_at` COLUMN DOES NOT EXIST
**Problem:**
- The `business_applications` table **DOES NOT HAVE** a `decided_at` column
- The schema only has: `id`, `full_name`, `business_name`, `email`, `phone`, `category`, `challenge`, `created_at`, `tier_requested`, `status`
- The `HistoricalRequestsTab` component tries to filter by `decided_at` for "last 30 days"
- **Result:** Code is trying to use a column that doesn't exist, causing errors

**Evidence:**
- Schema documentation shows `business_applications` table has NO `decided_at` column
- Diagnostic SQL query failed with: `ERROR: 42703: column "decided_at" does not exist`
- Code in `HistoricalRequestsTab.tsx` tries to use `app.decided_at` which doesn't exist

**Comparison with other tables:**
- `provider_change_requests` table HAS `decided_at` column
- `provider_job_posts` table HAS `decided_at` column
- `business_applications` table DOES NOT HAVE `decided_at` column - **MISSING COLUMN!**

#### ❌ ROOT CAUSE #3: RLS POLICY BLOCKING ALL QUERIES
**Problem:**
- RLS policy uses `(SELECT email FROM auth.users WHERE id = auth.uid())`
- This subquery may fail if:
  - `auth.users` table is not accessible
  - Email in `auth.users` doesn't match email in `business_applications`
  - Case sensitivity or whitespace differences
- **Result:** Even test query with no filter returns 0 results

**Evidence from logs:**
```
[MyBusiness] 🔍 DEBUGGING: All applications test (no filter): {count: 0, error: null}
```

**The policy:**
```sql
CREATE POLICY "applications_select_owner" 
ON public.business_applications FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
```

**Why this breaks:**
- PostgreSQL evaluates ALL SELECT policies with OR logic
- If ANY policy fails (e.g., accessing `auth.users`), the entire query fails
- The subquery `(SELECT email FROM auth.users WHERE id = auth.uid())` may return NULL or fail
- If it returns NULL, the comparison `email = NULL` is always FALSE

## 🎯 THE COMPLETE PROBLEM CHAIN

1. **User submits application** → Stored in `business_applications` with `status = 'pending'`
2. **Admin rejects application** → 
   - Status updated to `'rejected'` ✅
   - `decided_at` NOT set ❌
   - Application DELETED from database ❌
3. **User visits `/my-business`** →
   - Query tries to load applications by email
   - RLS policy blocks query (returns 0 results) ❌
   - Even if query worked, applications don't exist (they were deleted) ❌
4. **User clicks "Recently Rejected"** →
   - Component filters by `status = 'rejected'` and `decided_at` in last 30 days
   - No applications found because:
     - Applications were deleted ❌
     - Even if they existed, `decided_at` is null ❌

## 📊 WHAT'S TRACKING WHAT

### Applications Status Tracking:
- **Stored in:** `business_applications.status` column
- **Updated by:** `adminBusinessApplicationUtils.ts` → `approveApplication()` or `deleteApplication()`
- **Problem:** Status is set but then application is deleted

### Notifications:
- **Stored in:** `user_notifications` table
- **Created by:** `adminBusinessApplicationUtils.ts` (lines 257-268, 384-395)
- **Type:** `'application_approved'` or `'application_rejected'`
- **Status:** ✅ Working - notifications are created

### Email Notifications:
- **Sent via:** `emailNotificationService.ts` → `notifyApplicationApproved()` or `notifyChangeRequestRejected()`
- **Status:** ✅ Working - emails are sent (user confirmed receiving them)

### Display in UI:
- **Component:** `HistoricalRequestsTab.tsx`
- **Filters by:** `status = 'rejected'` AND `decided_at` in last 30 days
- **Problem:** 
  - Applications don't exist (deleted) ❌
  - `decided_at` is null even if they existed ❌

## 🔧 THE FIXES NEEDED

### Fix #1: STOP DELETING REJECTED APPLICATIONS
**File:** `src/utils/adminBusinessApplicationUtils.ts` → `deleteApplication()`
- **Current:** Deletes application after setting status to 'rejected'
- **Fix:** Remove the DELETE operation, keep the application with `status = 'rejected'`

### Fix #2: ADD `decided_at` COLUMN TO DATABASE
**File:** Create migration SQL file
- **Add column:** `ALTER TABLE business_applications ADD COLUMN decided_at timestamptz;`
- **Then update code:** Set `decided_at` when status changes to 'approved' or 'rejected'
- **Alternative:** Use `created_at` as fallback if we don't want to add the column

### Fix #3: FIX RLS POLICY
**File:** `ops/rls/02-MASTER-RLS-POLICIES.sql`
- **Current:** Uses `(SELECT email FROM auth.users WHERE id = auth.uid())`
- **Fix:** Use `auth.jwt() ->> 'email'` with case-insensitive matching
- **Why:** JWT email is more reliable and doesn't require `auth.users` access

## 🚨 WHY WE KEEP HITTING RLS BLOCKS

**The Pattern:**
1. RLS policies use `auth.users` table subqueries
2. `auth.users` table may not be accessible to authenticated users
3. When subquery fails or returns NULL, entire query fails
4. We patch the symptom (change the policy) but don't fix the root (stop using `auth.users`)

**The Solution:**
- **NEVER use `(SELECT email FROM auth.users WHERE id = auth.uid())`**
- **ALWAYS use `auth.jwt() ->> 'email'`** for email matching
- **Use case-insensitive matching** with `LOWER(TRIM())` to handle variations
- **Test ALL policies** when creating new ones to ensure they don't access `auth.users`

## 📋 VERIFICATION CHECKLIST

Before running any fixes, verify:
- [ ] How many applications exist in database with `status = 'rejected'`
- [ ] What the actual RLS policies are (run diagnostic SQL)
- [ ] What email is in `auth.users` vs what email is in `business_applications`
- [ ] Whether `decided_at` column exists in `business_applications` table
- [ ] Whether applications are actually being deleted or just hidden by RLS

## 🎯 NEXT STEPS

1. **Run diagnostic SQL** (`ops/rls/DIAGNOSE-BUSINESS-APPLICATIONS-RLS.sql`) to see actual state
2. **Check if rejected applications exist** in database (they might be deleted)
3. **Fix the RLS policy** to use JWT email instead of `auth.users` subquery
4. **Fix the delete function** to NOT delete rejected applications
5. **Add `decided_at`** to status updates
6. **Test end-to-end** to ensure rejected applications show up

