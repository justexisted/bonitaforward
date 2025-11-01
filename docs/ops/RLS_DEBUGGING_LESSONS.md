# RLS Debugging: Lessons Learned 🎯

## The Problem We Had

**Error:** `403 Forbidden - permission denied for table users`  
**Table:** `booking_events`  
**What we thought:** The admin policy was broken  
**What it actually was:** OTHER policies were broken and blocking everything

---

## Key Lesson: Check ALL Policies, Not Just Yours

### How PostgreSQL RLS Works

For **SELECT queries**, PostgreSQL evaluates policies with **OR logic**:
```
User can read IF:
  Policy 1 allows OR
  Policy 2 allows OR  
  Policy 3 allows OR
  ...
```

BUT if **ANY** policy throws an error (like "permission denied for table users"), the **ENTIRE QUERY FAILS**.

### What This Means

Even if your new admin policy is perfect, an old broken policy can block everything.

---

## Fast Diagnostic (Next Time)

### Step 1: Check ALL Policies (30 seconds)

```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE'
ORDER BY cmd, policyname;
```

**Look for:**
- ❌ `FROM auth.users` 
- ❌ `SELECT ... auth.users`
- ❌ Any subquery accessing restricted tables

### Step 2: Find the Culprit (10 seconds)

```sql
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE'
AND (qual::text LIKE '%auth.users%' OR with_check::text LIKE '%auth.users%');
```

This shows which policies are accessing `auth.users`.

### Step 3: Fix ALL Broken Policies (2 minutes)

Replace `auth.users` queries with safe alternatives:

**❌ BAD (causes permission errors):**
```sql
WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
```

**✅ GOOD (no auth.users access):**
```sql
WHERE email = auth.jwt()->>'email'
```

---

## Our Specific Case

### Broken Policies Found

1. **"Business owners can view their bookings"**
   ```sql
   WHERE providers.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())
   ```
   ❌ Accesses `auth.users`

2. **"Users can view their own bookings"**  
   ```sql
   WHERE customer_email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())
   ```
   ❌ Accesses `auth.users`

### The Fix

```sql
-- Policy 1: Fixed
WHERE providers.email = auth.jwt()->>'email'

-- Policy 2: Fixed  
WHERE customer_email = auth.jwt()->>'email'
```

**Result:** ✅ Immediate success

---

## Why This Took So Long

### What We Did Wrong

1. ✅ Created correct admin policy
2. ✅ Added debugging
3. ✅ Tested the admin policy
4. ❌ **Didn't check OTHER policies until the end**
5. ❌ Assumed only the new policy mattered
6. ❌ Spent time trying different admin policy approaches

### What We Should Have Done

1. ✅ Get permission error
2. ✅ **Immediately run:** `SELECT * FROM pg_policies WHERE tablename = 'booking_events'`
3. ✅ **Look for `auth.users` in ANY policy**
4. ✅ Fix all broken policies at once
5. ✅ Done in 5 minutes

---

## The Fast Way (For Next Time)

### Total Time: ~5 minutes

```sql
-- 1. Show all policies (30 sec)
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'TABLE_NAME';

-- 2. Find auth.users references (10 sec)
SELECT policyname FROM pg_policies 
WHERE tablename = 'TABLE_NAME' 
AND qual::text LIKE '%auth.users%';

-- 3. Fix all at once (2 min)
DROP POLICY IF EXISTS "Broken Policy 1" ON table_name;
DROP POLICY IF EXISTS "Broken Policy 2" ON table_name;

CREATE POLICY "Fixed Policy 1" ... USING (auth.jwt()->>'email' = ...);
CREATE POLICY "Fixed Policy 2" ... USING (auth.jwt()->>'email' = ...);

-- 4. Verify (30 sec)
-- Refresh app, check console
```

---

## Prevention

### When Creating New Tables with RLS

**Always use these safe patterns:**

```sql
-- ✅ For email checks
auth.jwt()->>'email' = 'user@example.com'

-- ✅ For user ID checks  
auth.uid() = user_id_column

-- ✅ For role checks
auth.jwt()->>'role' = 'admin'

-- ❌ NEVER do this
(SELECT email FROM auth.users WHERE id = auth.uid())
```

### Why auth.users Fails

The `auth.users` table often has its own RLS policies that block regular users from reading it. Even with `SECURITY DEFINER`, accessing it from another policy can cause permission errors.

**Solution:** Use `auth.jwt()` and `auth.uid()` instead - these are built-in functions that don't query tables.

---

## Files Created

- ✅ `FAST-RLS-DIAGNOSTIC.sql` - Quick diagnostic script
- ✅ `RLS_DEBUGGING_LESSONS.md` - This document
- ✅ Updated `src/services/adminDataService.ts` - With debugging
- ✅ `diagnose-booking-events-rls.sql` - Detailed diagnostic

---

## Summary

| What | Time Spent | Time It Should Take |
|------|------------|-------------------|
| Our approach | ~45 minutes | ❌ Too long |
| Fast approach | Should be ~5 minutes | ✅ Efficient |

**Key Insight:** Always check ALL policies on a table first, not just the one you're working on.

---

**Next time:** Run `FAST-RLS-DIAGNOSTIC.sql` immediately when you get any RLS error!

---

## Profile UPDATE Policy Issue (2025-01-XX)

### The Problem

**Error:** `403 Forbidden` and `406 Not Acceptable` on profile UPDATE operations  
**Error Message:** `Update verification failed. Expected: "Get Lifted" Got: ""`  
**Table:** `profiles`  
**What we thought:** UPDATE policy was missing `WITH CHECK` clause  
**What it actually was:** **MISSING ENTIRE `profiles_update_own` POLICY** - only `profiles_update_admin` existed

### Root Cause

The database state didn't match the master file:
- ❌ **Missing:** `profiles_update_own` policy (users couldn't update own profiles)
- ❌ **Wrong:** `profiles_select_all` (should be `profiles_select_own` + `profiles_select_admin`)
- ❌ **Wrong:** `profiles_insert_auth` name (should be `profiles_insert_own`)
- ✅ **Correct:** `profiles_delete_admin` existed

**Key Issue:** The master file had the correct policies, but they were **never deployed to the database**. The database had old/wrong policies that didn't match the master file.

### Why This Happened

1. **Master file updated but not deployed:** Someone updated `02-MASTER-RLS-POLICIES.sql` but didn't run it in Supabase
2. **No audit was run first:** We tried to fix without seeing the actual database state
3. **Assumed master file matched database:** We thought the database had the policies from the master file
4. **Static DROP statements failed:** Tried to drop specific policy names, but missed `profiles_delete_admin`

### The Fix Process

**Step 1: Audit First** ✅
```sql
-- Run diagnose-profiles-rls.sql
-- Discovered: Only 4 policies exist, missing profiles_update_own
```

**Step 2: Fix Based on Audit** ✅
```sql
-- Use dynamic SQL to drop ALL existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- Then create correct policies from master file
```

**Step 3: Verify** ✅
- Policies created correctly
- Both `USING` and `WITH CHECK` present on UPDATE policies
- Application tested and working

### Lessons Learned

#### 1. Always Audit First ⚠️
**DON'T:**
- ❌ Assume master file matches database
- ❌ Create fixes without seeing actual state
- ❌ Skip the diagnostic step

**DO:**
- ✅ **ALWAYS run audit/diagnostic FIRST** (`ops/rls/diagnose-profiles-rls.sql`)
- ✅ **See what's actually in the database** before fixing
- ✅ **Compare database state to master file** before assuming

#### 2. Missing Policies vs Missing Clauses ⚠️
**The Problem Was:**
- ❌ Entire policy was missing (`profiles_update_own` didn't exist)
- ❌ Not just missing `WITH CHECK` clause
- ❌ Only admin policy existed, so regular users had no UPDATE permission

**How to Diagnose:**
```sql
-- Check policy count by operation
SELECT cmd, COUNT(*) as policy_count, 
       STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE tablename = 'profiles'
GROUP BY cmd;

-- Look for missing operations or missing user policies
-- Expected: UPDATE should have 2 policies (own + admin)
-- Found: UPDATE had only 1 policy (admin only) ❌
```

#### 3. Dynamic DROP Is Essential ⚠️
**Problem with Static DROP:**
```sql
-- ❌ BAD: Misses policies with different names
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
-- Fails if policy name is slightly different
```

**Solution: Dynamic DROP:**
```sql
-- ✅ GOOD: Drops ALL policies regardless of names
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;
```

#### 4. Master File ≠ Database State ⚠️
**Critical Insight:**
- Master file is the **source of truth** for what **should** exist
- Database is the **actual state** of what **does** exist
- These can differ if master file wasn't deployed or old policies exist

**Solution:**
- Always audit database state before fixing
- Compare audit results to master file
- Use master file as template, but verify what's actually deployed

#### 5. UPDATE Policies Need Both Clauses ⚠️
**Always include both:**
```sql
CREATE POLICY "table_update_own" 
ON table_name FOR UPDATE
USING (id = auth.uid())        -- ✅ Required: Checks existing row
WITH CHECK (id = auth.uid());  -- ✅ Required: Checks new values
```

**PostgreSQL evaluates:**
- `USING` checks if you can SEE the row to update
- `WITH CHECK` checks if the NEW values are allowed after update
- **Both are required** for UPDATE operations

### Prevention Checklist

Before fixing any RLS issue:

- [ ] **Run diagnostic script** (`ops/rls/diagnose-{table}-rls.sql`)
- [ ] **Check policy count** (should have policies for all operations)
- [ ] **Verify UPDATE policies** have both `USING` and `WITH CHECK`
- [ ] **Compare to master file** - see if database matches
- [ ] **Use dynamic DROP** - drop all existing policies before creating new ones
- [ ] **Update master file** - keep source of truth updated
- [ ] **Test in application** - verify fix actually works
- [ ] **Document the fix** - add to tracking/lessons learned

### Files Updated

- ✅ `ops/rls/02-MASTER-RLS-POLICIES.sql` - Already had correct policies
- ✅ `ops/rls/fix-profiles-rls-complete.sql` - Fix script with dynamic DROP
- ✅ `ops/rls/diagnose-profiles-rls.sql` - Diagnostic script
- ✅ `docs/ops/RLS-TRACKING-STATUS.md` - Status tracking
- ✅ `docs/ops/RLS_DEBUGGING_LESSONS.md` - This file

### Summary

**Time Spent:** ~2 hours (should have been ~10 minutes)  
**Root Cause:** Missing `profiles_update_own` policy + database state didn't match master file  
**Solution:** Audit first, then drop all policies dynamically, then create correct ones from master file  
**Key Lesson:** **Always audit database state before fixing - never assume master file matches what's deployed**

---

**Next time:** 
1. Run diagnostic script immediately
2. Compare results to master file
3. Drop all policies dynamically
4. Create from master file
5. Verify and test

**Never skip the audit step!**
