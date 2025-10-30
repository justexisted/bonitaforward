# 🎯 RLS MASTER GUIDE - STOP GUESSING, START FIXING
### Your Complete Database & RLS Troubleshooting System

**Last Updated:** October 28, 2025  
**Purpose:** Eliminate guesswork. Fix RLS issues in minutes, not hours.

---

## 📖 Table of Contents

1. [Quick Start: Got an RLS Error?](#quick-start)
2. [The 3-File System](#the-3-file-system)
3. [Complete Database Reference](#database-reference)
4. [Common RLS Error Patterns](#error-patterns)
5. [Step-by-Step Troubleshooting](#troubleshooting)
6. [Prevention Best Practices](#prevention)
7. [Master Policy Reference](#master-policies)

---

## 🚨 Quick Start: Got an RLS Error? {#quick-start}

### Step 1: Identify the Table (10 seconds)

Look at the error message:
```
POST /rest/v1/USER_SAVED_EVENTS 403 (Forbidden)
Error: new row violates row-level security policy for table "user_saved_events"
```

**Table:** `user_saved_events`

### Step 2: Run Fast Diagnostic (30 seconds)

Open `FAST-RLS-DIAGNOSTIC.sql` and replace the table name:

```sql
-- Change line 16 from 'booking_events' to your table:
WHERE tablename = 'user_saved_events'  
```

Run it in Supabase SQL Editor. This shows:
- ✅ All policies on the table
- ✅ Which ones are broken
- ✅ Your current auth context

### Step 3: Apply the Fix (2 minutes)

**Option A:** If the table is in `02-MASTER-RLS-POLICIES.sql`:
- Just run that section of the master file
- Done!

**Option B:** If it's a new table or not in master:
- Use the pattern from `fix-user-saved-events-rls.sql`
- Create SELECT, INSERT, UPDATE, DELETE policies
- Always include admin access

### Step 4: Verify (30 seconds)

```sql
-- Check policies were created
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'your_table';

-- Test in your app
-- Refresh the page
-- Error should be gone ✅
```

**Total Time: ~3 minutes**

---

## 🛠️ The 3-File System {#the-3-file-system}

We have 3 SQL files that work together:

### 1. **01-AUDIT-CURRENT-RLS-STATE.sql** (Diagnostic)
**When to use:** Need to understand the CURRENT state of ALL tables

**What it shows:**
- Which tables have RLS enabled
- Which tables are missing RLS (security risk!)
- All existing policies
- Policy count per table
- Tables with missing DELETE policies
- Duplicate/conflicting policies
- Full policy details for documentation

**How to use:**
```sql
-- Just run the entire file in Supabase SQL Editor
-- Review the 10 sections of output
```

### 2. **FAST-RLS-DIAGNOSTIC.sql** (Quick Fix)
**When to use:** Got a permission error on a SPECIFIC table

**What it shows:**
- All policies on that specific table
- Which ones access `auth.users` (common problem)
- Your current auth context
- Ready-to-use fix templates

**How to use:**
```sql
-- Change the table name on line 16
WHERE tablename = 'YOUR_TABLE'

-- Run it
-- Look for auth.users references
-- Apply the fix template at the bottom
```

### 3. **02-MASTER-RLS-POLICIES.sql** (The Fix)
**When to use:** Need to reset ALL policies to a clean state

**What it does:**
- Drops ALL old/conflicting policies
- Creates clean, consistent policies for all tables
- Idempotent (safe to run multiple times)
- Includes admin access for all tables

**How to use:**
```sql
-- Option 1: Run the entire file (resets everything)
BEGIN;
-- ... all the SQL ...
COMMIT;

-- Option 2: Run just the section for one table
-- Copy lines 37-75 for 'providers' table
-- Paste in SQL Editor
-- Run
```

---

## 📊 Complete Database Reference {#database-reference}

### Core Business Tables

| Table | Purpose | RLS Owner Field | Admin Access | Public Read |
|-------|---------|----------------|--------------|-------------|
| **providers** | Business listings | `owner_user_id` | ✅ Yes | ✅ Yes |
| **provider_job_posts** | Job postings | `owner_user_id` | ✅ Yes | ⚠️ Approved only |
| **provider_change_requests** | Edit requests | `owner_user_id` | ✅ Yes | ❌ No |
| **business_applications** | New business apps | `email` (matches auth) | ✅ Yes | ⚠️ Can submit |

### Booking & Events Tables

| Table | Purpose | RLS Owner Field | Admin Access | Public Read |
|-------|---------|----------------|--------------|-------------|
| **booking_events** | Customer bookings | `customer_email` | ✅ Yes | ❌ No |
| **bookings** | Booking records | `user_id` | ✅ Yes | ❌ No |
| **calendar_events** | Public events | `created_by_user_id` | ✅ Yes | ✅ Yes |
| **user_saved_events** | Saved event IDs | `user_id` | ✅ Yes | ❌ No |
| **event_votes** | Event upvotes | `user_id` | ❌ No | ✅ Read all, manage own |
| **event_flags** | Flagged events | `user_id` | ✅ Yes | ❌ No |

### User & Notification Tables

| Table | Purpose | RLS Owner Field | Admin Access | Public Read |
|-------|---------|----------------|--------------|-------------|
| **profiles** | User profiles | `id` (matches auth.uid) | ✅ Yes | ❌ No |
| **user_notifications** | In-app notifications | `user_id` | ✅ Yes | ❌ No |
| **dismissed_notifications** | Dismissed notice IDs | `user_id` | ❌ No | ❌ No |

### Public Submission Tables

| Table | Purpose | RLS Owner Field | Admin Access | Public Read |
|-------|---------|----------------|--------------|-------------|
| **contact_leads** | Contact form | N/A | ✅ Yes | ⚠️ Can submit |
| **funnel_responses** | Onboarding funnel | `user_email` | ✅ Yes | ⚠️ Can submit |

### Misc Tables

| Table | Purpose | RLS Owner Field | Admin Access | Public Read |
|-------|---------|----------------|--------------|-------------|
| **categories** | Business categories | N/A | ✅ Yes (write only) | ✅ Yes |
| **saved_providers** | Saved businesses | `user_id` | ❌ No | ❌ No |
| **coupon_redemptions** | Coupon usage | `user_id` | ❌ No | ❌ No |
| **blog_posts** | Blog content | N/A | ✅ Yes (write only) | ✅ Yes |

### Admin-Only Tables

| Table | Purpose | RLS Pattern |
|-------|---------|-------------|
| **admin_emails** | Admin whitelist | Admin-only for ALL operations |
| **admin_audit_log** | Admin action log | Admin-only for ALL operations |
| **providers_backup** | Provider backups | Admin-only for ALL operations |

---

## ⚠️ Common RLS Error Patterns {#error-patterns}

### Pattern 1: "403 Forbidden" or "new row violates row-level security"

**Error Message:**
```
POST /rest/v1/user_saved_events 403 (Forbidden)
new row violates row-level security policy for table "user_saved_events"
```

**What it means:**
- The INSERT policy is missing or broken
- User doesn't have permission to create rows

**Fix:**
```sql
CREATE POLICY "table_insert_own" 
ON table_name FOR INSERT
WITH CHECK (user_id = auth.uid());
```

---

### Pattern 2: "permission denied for table users"

**Error Message:**
```
403 Forbidden - permission denied for table users
```

**What it means:**
- A policy is trying to access `auth.users` table
- The `auth.users` table itself has RLS that blocks regular users

**Fix:**
```sql
-- ❌ BAD - Don't do this:
WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())

-- ✅ GOOD - Use this instead:
WHERE email = auth.jwt()->>'email'
```

**How to find the broken policy:**
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE'
AND qual::text LIKE '%auth.users%';
```

---

### Pattern 3: "Could not find the 'COLUMN_NAME' column"

**Error Message:**
```
Could not find the 'updated_at' column of 'profiles'
```

**What it means:**
- Your code is trying to update/read a column that doesn't exist
- Common after migrations or schema changes

**Fix:**
```sql
-- Check what columns actually exist:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Then update your code to use the correct column names
```

---

### Pattern 4: DELETE fails but SELECT/INSERT work

**Error Message:**
```
403 Forbidden (on DELETE operation)
```

**What it means:**
- SELECT, INSERT, UPDATE policies exist
- But DELETE policy is missing!

**How to check:**
```sql
SELECT cmd, COUNT(*) 
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE' 
GROUP BY cmd;

-- If DELETE is missing or COUNT is 0, that's the problem
```

**Fix:**
```sql
CREATE POLICY "table_delete_own" 
ON table_name FOR DELETE
USING (owner_user_id = auth.uid());

CREATE POLICY "table_delete_admin" 
ON table_name FOR DELETE
USING (is_admin_user(auth.uid()));
```

---

### Pattern 5: Policies exist but still getting 403

**What it means:**
- Multiple policies with conflicting logic
- One broken policy is blocking all the others (especially for SELECT)

**How to diagnose:**
```sql
-- Show ALL policies for the table:
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE'
ORDER BY cmd, policyname;

-- Look for:
-- - Duplicate policy names
-- - Too many policies for one operation (>3 is suspicious)
-- - Different logic for similar operations
```

**Fix:**
Use `02-MASTER-RLS-POLICIES.sql` to drop ALL old policies and recreate clean ones.

---

## 🔧 Step-by-Step Troubleshooting {#troubleshooting}

### Phase 1: Identify (1 minute)

**1. Read the error message**
```
POST https://PROJECT.supabase.co/rest/v1/TABLE_NAME 403 (Forbidden)
Error: new row violates row-level security policy for table "TABLE_NAME"
```

Extract:
- **Table name:** `TABLE_NAME`
- **Operation:** `POST` = INSERT, `PATCH` = UPDATE, `DELETE` = DELETE, `GET` = SELECT
- **Error type:** "violates RLS policy" or "permission denied"

**2. Identify the user**
```sql
-- Run this in Supabase SQL Editor:
SELECT 
  auth.uid() as my_user_id,
  auth.jwt()->>'email' as my_email,
  auth.role() as my_role;
```

**3. Check if table has RLS**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'TABLE_NAME' AND schemaname = 'public';
```

---

### Phase 2: Diagnose (2 minutes)

**4. Run Fast Diagnostic**

Open `FAST-RLS-DIAGNOSTIC.sql`, change line 16:
```sql
WHERE tablename = 'TABLE_NAME'
```

Run it. Look for:
- ❌ **0 policies found** → Need to create policies
- ❌ **`auth.users` in policy** → Need to replace with `auth.jwt()`
- ❌ **No policy for the operation** → Need to add INSERT/UPDATE/DELETE policy

**5. Check for common issues**

```sql
-- Missing DELETE policies?
SELECT tablename, cmd, COUNT(*) 
FROM pg_policies 
WHERE tablename = 'TABLE_NAME' 
GROUP BY tablename, cmd;
-- Should have SELECT, INSERT, UPDATE, DELETE

-- Broken auth.users references?
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'TABLE_NAME'
AND (qual::text LIKE '%auth.users%' OR with_check::text LIKE '%auth.users%');
-- Should return 0 rows

-- Too many duplicate policies?
SELECT cmd, COUNT(*) 
FROM pg_policies 
WHERE tablename = 'TABLE_NAME' 
GROUP BY cmd 
HAVING COUNT(*) > 3;
-- Should return 0 rows (or only a few trusted ones)
```

---

### Phase 3: Fix (3 minutes)

**6. Choose your fix strategy**

**Option A: Table is in Master File**
- Open `02-MASTER-RLS-POLICIES.sql`
- Find your table (Ctrl+F)
- Copy that section (DROP POLICY + CREATE POLICY)
- Run it in Supabase SQL Editor

**Option B: Table NOT in Master File**
- Use this template:

```sql
-- 1. Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 2. Drop old policies (if any)
DROP POLICY IF EXISTS "old_policy_1" ON table_name;
DROP POLICY IF EXISTS "old_policy_2" ON table_name;

-- 3. Create clean policies
CREATE POLICY "table_select_own" 
ON table_name FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "table_select_admin" 
ON table_name FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "table_insert_own" 
ON table_name FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "table_update_own" 
ON table_name FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "table_update_admin" 
ON table_name FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "table_delete_own" 
ON table_name FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "table_delete_admin" 
ON table_name FOR DELETE
USING (is_admin_user(auth.uid()));
```

**Option C: auth.users References**
- Find the broken policy:
```sql
SELECT policyname, qual FROM pg_policies 
WHERE tablename = 'TABLE_NAME'
AND qual::text LIKE '%auth.users%';
```

- Replace with safe pattern:
```sql
-- ❌ BAD:
WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())

-- ✅ GOOD:
WHERE email = auth.jwt()->>'email'
```

---

### Phase 4: Verify (1 minute)

**7. Confirm policies were created**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'TABLE_NAME'
ORDER BY cmd, policyname;
```

Expected output:
```
 policyname              | cmd
--------------------------+--------
 table_delete_admin       | DELETE
 table_delete_own         | DELETE
 table_insert_own         | INSERT
 table_select_admin       | SELECT
 table_select_own         | SELECT
 table_update_admin       | UPDATE
 table_update_own         | UPDATE
```

**8. Test in your app**
- Clear cache: `localStorage.clear(); sessionStorage.clear(); location.reload(true);`
- Try the operation again
- Check browser console
- Error should be gone ✅

---

## 🛡️ Prevention Best Practices {#prevention}

### Rule 1: ALWAYS Use These Safe Patterns

```sql
-- ✅ For user ID checks
auth.uid() = user_id_column

-- ✅ For email checks
auth.jwt()->>'email' = email_column

-- ✅ For admin checks
is_admin_user(auth.uid())

-- ✅ For role checks
auth.jwt()->>'role' = 'admin'

-- ❌ NEVER access auth.users
(SELECT email FROM auth.users WHERE id = auth.uid())  -- DON'T DO THIS!
```

### Rule 2: ALWAYS Create ALL 4 Operations

Every table with RLS needs:
- ✅ SELECT policy (who can read)
- ✅ INSERT policy (who can create)
- ✅ UPDATE policy (who can modify)
- ✅ DELETE policy (who can remove)

### Rule 3: ALWAYS Include Admin Access

```sql
-- Users can manage their own
CREATE POLICY "table_select_own" 
ON table_name FOR SELECT
USING (user_id = auth.uid());

-- Admins can manage all (separate policy!)
CREATE POLICY "table_select_admin" 
ON table_name FOR SELECT
USING (is_admin_user(auth.uid()));
```

### Rule 4: ALWAYS Test with Non-Admin User

1. Create test policy
2. Sign in as regular user (not admin)
3. Try the operation
4. If it fails, fix before deploying

### Rule 5: ALWAYS Run Audit After Changes

After creating/modifying policies:
```sql
-- Quick check:
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE'
GROUP BY tablename;
-- Should have 5-8 policies (depending on complexity)

-- Full audit:
-- Run 01-AUDIT-CURRENT-RLS-STATE.sql
```

### Rule 6: ALWAYS Use Descriptive Policy Names

```sql
-- ❌ BAD (generic, unclear)
CREATE POLICY "user_policy" ON table_name ...
CREATE POLICY "admin_policy" ON table_name ...

-- ✅ GOOD (specific, clear)
CREATE POLICY "job_posts_select_owner" ON provider_job_posts ...
CREATE POLICY "job_posts_delete_admin" ON provider_job_posts ...
```

Pattern: `{table}_{operation}_{who}`

---

## 📚 Master Policy Reference {#master-policies}

### Admin Check Function

**Always create this first:**
```sql
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_emails
    WHERE email = (SELECT email FROM auth.users WHERE id = user_id)
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### Standard User-Owned Table Pattern

For tables where users own their own data (bookings, profiles, etc):

```sql
-- SELECT: Own data + Admin sees all
CREATE POLICY "table_select_own" ON table_name FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "table_select_admin" ON table_name FOR SELECT
USING (is_admin_user(auth.uid()));

-- INSERT: Users create own
CREATE POLICY "table_insert_own" ON table_name FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE: Own data + Admin updates all
CREATE POLICY "table_update_own" ON table_name FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "table_update_admin" ON table_name FOR UPDATE
USING (is_admin_user(auth.uid()));

-- DELETE: Own data + Admin deletes all
CREATE POLICY "table_delete_own" ON table_name FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "table_delete_admin" ON table_name FOR DELETE
USING (is_admin_user(auth.uid()));
```

### Public Read, User Write Pattern

For tables that everyone can read (blog posts, calendar events):

```sql
-- SELECT: Everyone
CREATE POLICY "table_select_all" ON table_name FOR SELECT
USING (true);

-- INSERT: Authenticated users
CREATE POLICY "table_insert_auth" ON table_name FOR INSERT
WITH CHECK (created_by_user_id = auth.uid());

-- UPDATE: Owner + Admin
CREATE POLICY "table_update_owner" ON table_name FOR UPDATE
USING (created_by_user_id = auth.uid());

CREATE POLICY "table_update_admin" ON table_name FOR UPDATE
USING (is_admin_user(auth.uid()));

-- DELETE: Owner + Admin
CREATE POLICY "table_delete_owner" ON table_name FOR DELETE
USING (created_by_user_id = auth.uid());

CREATE POLICY "table_delete_admin" ON table_name FOR DELETE
USING (is_admin_user(auth.uid()));
```

### Public Submit, Admin Manage Pattern

For tables where anyone can submit (contact forms, applications):

```sql
-- SELECT: Admin only
CREATE POLICY "table_select_admin" ON table_name FOR SELECT
USING (is_admin_user(auth.uid()));

-- Also allow users to see their own:
CREATE POLICY "table_select_owner" ON table_name FOR SELECT
USING (email = auth.jwt()->>'email');

-- INSERT: Anyone (no auth required)
CREATE POLICY "table_insert_public" ON table_name FOR INSERT
WITH CHECK (true);

-- UPDATE: Admin only
CREATE POLICY "table_update_admin" ON table_name FOR UPDATE
USING (is_admin_user(auth.uid()));

-- DELETE: Admin only + users can delete their own
CREATE POLICY "table_delete_admin" ON table_name FOR DELETE
USING (is_admin_user(auth.uid()));

CREATE POLICY "table_delete_owner" ON table_name FOR DELETE
USING (email = auth.jwt()->>'email');
```

### Admin-Only Pattern

For tables that only admins should access (admin_emails, audit logs):

```sql
-- ALL operations: Admin only
CREATE POLICY "table_all_admin" ON table_name FOR ALL
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));
```

---

## 🚀 Quick Reference Cards

### When You Get an RLS Error:

```
1. IDENTIFY → What table? What operation?
2. DIAGNOSE → Run FAST-RLS-DIAGNOSTIC.sql
3. FIX     → Use 02-MASTER-RLS-POLICIES.sql or template
4. VERIFY  → Check policies + test in app
```

### Safe Auth Patterns:

```sql
✅ auth.uid() = user_id
✅ auth.jwt()->>'email' = email
✅ is_admin_user(auth.uid())
❌ (SELECT FROM auth.users ...)
```

### Every Table Needs:

```
✅ SELECT policy
✅ INSERT policy  
✅ UPDATE policy
✅ DELETE policy
✅ Admin access for each
```

---

## 📁 File Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `01-AUDIT-CURRENT-RLS-STATE.sql` | Shows EVERYTHING about ALL tables | Weekly check or when confused |
| `FAST-RLS-DIAGNOSTIC.sql` | Quick diagnostic for ONE table | When you get an error |
| `02-MASTER-RLS-POLICIES.sql` | Complete policy reset for ALL tables | Major cleanup or deployment |
| `fix-TABLE-NAME-rls.sql` | Individual table fixes | One-off table issues |
| `RLS_DEBUGGING_LESSONS.md` | Lessons learned from past issues | Learning from mistakes |
| `THIS FILE` | Complete reference & process | Every RLS issue, every time |

---

## ✅ Success Criteria

You know you're done when:

1. ✅ Error is gone in browser console
2. ✅ Operation works in your app
3. ✅ Policies exist for all 4 operations (SELECT, INSERT, UPDATE, DELETE)
4. ✅ No `auth.users` references in policies
5. ✅ Admin can still access everything
6. ✅ Regular users can only access their own data

---

## 🆘 Still Stuck?

If you've followed this guide and still have issues:

1. Run `01-AUDIT-CURRENT-RLS-STATE.sql` and save the output
2. Run `FAST-RLS-DIAGNOSTIC.sql` for your table and save the output  
3. Check browser console for the EXACT error message
4. Review the [Common Error Patterns](#error-patterns) section
5. Try running the complete `02-MASTER-RLS-POLICIES.sql` (nuclear option)

---

**Last Updated:** October 28, 2025  
**Version:** 1.0  
**Status:** ✅ PRODUCTION READY

**Never guess again. This is your RLS bible.** 🎯

