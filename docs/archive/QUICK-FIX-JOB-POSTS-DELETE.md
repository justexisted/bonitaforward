# 🚨 Quick Fix: Job Posts Delete 403 Error

**Issue:** Getting `403 Forbidden` when trying to delete job posts  
**Cause:** Missing or incorrect RLS (Row Level Security) policy on `provider_job_posts` table  
**Solution:** Run the SQL script below in Supabase

---

## 🎯 Quick Fix (Copy & Paste This)

**Go to:** [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → SQL Editor

**Paste and Run:**

```sql
-- QUICK FIX: Drop conflicting policies and create correct ones

-- Drop all existing policies
DROP POLICY IF EXISTS "delete_own_jobs" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Owners can delete their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Users can delete their own job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Business owners can delete their job posts" ON public.provider_job_posts;
DROP POLICY IF EXISTS "Allow users to delete their own job posts" ON public.provider_job_posts;

-- Enable RLS (in case it's disabled)
ALTER TABLE public.provider_job_posts ENABLE ROW LEVEL SECURITY;

-- Create DELETE policy (THIS FIXES THE 403 ERROR)
CREATE POLICY "delete_own_jobs" 
ON public.provider_job_posts
FOR DELETE
USING (owner_user_id = auth.uid());

-- Verify it was created
SELECT 
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'provider_job_posts'
  AND cmd = 'DELETE';
```

---

## ✅ Expected Result

After running the SQL above, you should see:

```
policyname      | operation
----------------+-----------
delete_own_jobs | DELETE
```

---

## 🧪 Test It

1. **Refresh your browser page** (to get a new auth token)
2. Try deleting a job post again
3. It should work now! ✅

---

## 🔍 If Still Not Working

### Check 1: Are you authenticated?
```sql
SELECT auth.uid() as my_user_id;
```
Should return your user ID (not null)

### Check 2: Do you own the job post?
```sql
SELECT 
  id,
  title,
  owner_user_id,
  auth.uid() as my_user_id,
  (owner_user_id = auth.uid()) as i_own_this
FROM provider_job_posts
WHERE id = 'YOUR-JOB-POST-ID';
```
The `i_own_this` column should be `true`

### Check 3: Is RLS enabled?
```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'provider_job_posts';
```
Should return `true`

---

## 🛠️ Full Fix (If Quick Fix Doesn't Work)

If the quick fix above doesn't work, run the comprehensive fix:

**File:** `FIX-JOB-POSTS-DELETE-2025-10-28.sql`

This file drops **all** possible policy names and creates a clean set of policies.

---

## 📚 Technical Details

### The Problem
The RLS policy for DELETE was either:
1. ❌ Missing entirely
2. ❌ Named incorrectly (so it wasn't being applied)
3. ❌ Had wrong logic (not checking `owner_user_id = auth.uid()`)

### The Solution
Created a DELETE policy that allows users to delete job posts where:
- `owner_user_id` (the job post's owner) equals `auth.uid()` (the current user)

This is the standard pattern for "users can delete their own data" in Supabase.

---

## 🎯 Other Operations

While fixing DELETE, you might as well ensure these work too:

```sql
-- SELECT: View your own job posts
CREATE POLICY "select_own_jobs" 
ON public.provider_job_posts
FOR SELECT
USING (owner_user_id = auth.uid());

-- UPDATE: Edit your own job posts
CREATE POLICY "update_own_jobs" 
ON public.provider_job_posts
FOR UPDATE
USING (owner_user_id = auth.uid());

-- INSERT: Create new job posts
CREATE POLICY "insert_jobs" 
ON public.provider_job_posts
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());
```

---

## 🔐 Security Note

This fix follows the **principle of least privilege**:
- ✅ Users can only delete their **own** job posts
- ✅ Users cannot delete other users' job posts
- ✅ Admins (if configured) can still manage all job posts

---

## 💡 Pro Tip

After fixing, **clear your browser cache** or do a hard refresh:
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

This ensures your browser gets a fresh auth token with the new permissions.

---

## ✅ Done!

After running the SQL fix and refreshing your page, you should be able to delete job posts without any 403 errors!

If you still have issues, let me know and I'll help debug further.

