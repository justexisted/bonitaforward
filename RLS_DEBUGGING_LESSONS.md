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


