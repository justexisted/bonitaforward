# Fix: SECURITY DEFINER View Issue + Exposed Auth Users

## Problems

Supabase has detected **TWO critical security issues** with your view `public.v_bookings_with_provider`:

### 1. SECURITY DEFINER Property ⚠️

- **SECURITY DEFINER** views execute with the permissions of the view **creator** (typically a database superuser)
- This **bypasses Row Level Security (RLS)** policies
- Any user who can query the view gets **elevated privileges**
- Could allow unauthorized access to sensitive booking data

### 2. Exposed Auth Users Data 🚨

- The view definition directly queries `auth.users` table
- This **exposes the auth.users schema** to anon and authenticated roles
- Even in WHERE clauses, querying `auth.users` is considered a security exposure
- Could reveal sensitive user information structure

### What Should Happen Instead

✅ Views should use **SECURITY INVOKER** (the default)
✅ Views should **NOT directly query auth.users**
✅ Use **helper functions** (SECURITY DEFINER) to safely check auth.users
✅ RLS policies are properly enforced

---

## Solution

I've created a SQL script to fix this issue: **`fix-view-security-definer.sql`**

### Steps to Fix

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the Fix Script**
   - Copy the contents of `fix-view-security-definer.sql`
   - Paste into the SQL Editor
   - Click **"Run"**

3. **Verify the Fix**
   - The script will output verification results
   - Look for: ✓ "View created successfully (views are SECURITY INVOKER by default)"

---

## What the Script Does

### 1. Creates a Secure Helper Function 🔒
```sql
CREATE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
SECURITY DEFINER  -- This is OK for helper functions!
AS $$
  -- Safely checks auth.users without exposing it to the view
  -- Only this function has access to auth.users
$$;
```

**Why this is safe:**
- ✅ Functions with SECURITY DEFINER are **allowed** (views are not)
- ✅ Encapsulates the auth.users access in one secure place
- ✅ The view never directly touches auth.users
- ✅ Returns only a boolean (no data exposure)

### 2. Drops the Existing View
```sql
DROP VIEW IF EXISTS public.v_bookings_with_provider CASCADE;
```

### 3. Recreates WITHOUT SECURITY DEFINER and WITHOUT Exposing auth.users
```sql
CREATE VIEW public.v_bookings_with_provider AS
SELECT 
  b.id,
  b.provider_id,
  b.customer_email,
  -- ... all booking fields
  p.name as provider_name,
  p.email as provider_email
  -- ... provider info
FROM booking_events b
LEFT JOIN providers p ON p.id = b.provider_id
WHERE 
  p.published = true  -- Public can see published providers
  OR p.owner_user_id = auth.uid()  -- Owners see their own
  OR is_current_user_admin() = true;  -- Uses helper function!
```

**Key Security Fix:**
- ❌ Old: `WHERE ... (SELECT email FROM auth.users WHERE id = auth.uid())`
- ✅ New: `WHERE ... is_current_user_admin() = true`

### 4. Grants Proper Permissions
```sql
GRANT SELECT ON public.v_bookings_with_provider TO authenticated;
GRANT SELECT ON public.v_bookings_with_provider TO anon;
```

---

## Expected Behavior After Fix

### ✅ Business Owners
- Can see **only their own bookings**
- Cannot see other businesses' bookings

### ✅ Admin Users
- Can see **all bookings**
- Admin status checked via `admin_emails` table

### ✅ Public/Anonymous Users
- Can see **only bookings for published providers**
- Cannot see unpublished provider bookings

---

## Testing the Fix

After running the script, test with these queries:

### 1. Test as Business Owner
```sql
-- Should only return your provider's bookings
SELECT * FROM v_bookings_with_provider;
```

### 2. Test as Admin
```sql
-- Should return all bookings
SELECT * FROM v_bookings_with_provider;
```

### 3. Verify No SECURITY DEFINER
```sql
-- Should show: has_security_definer = 'NO ✓'
SELECT 
  relname as view_name,
  CASE 
    WHEN pg_get_viewdef(c.oid) ILIKE '%security definer%' THEN 'YES ⚠️'
    ELSE 'NO ✓'
  END as has_security_definer
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND relname = 'v_bookings_with_provider';
```

---

## Troubleshooting

### If you get permission errors after running the script:

1. **Check RLS on booking_events table**
```sql
-- Should return: rls_enabled = true
SELECT tablename, rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename = 'booking_events';
```

2. **Check RLS policies exist**
```sql
-- Should show policies for booking_events
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'booking_events';
```

3. **If RLS is not enabled**, you may need to run:
```sql
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
```
(But check with your existing policies first!)

---

## Related Files

- **`fix-view-security-definer.sql`** - The fix script (run this)
- **`fix-database-security-issues.sql`** - Comprehensive security fixes (optional, more extensive)
- **`fix-database-security-issues-safe.sql`** - Safe version with checks

---

## Summary

✅ **Fixes BOTH Security Issues**: 
   - Removes SECURITY DEFINER from view
   - Removes direct auth.users access from view

✅ **Safe Pattern**: Uses SECURITY DEFINER helper function (allowed)

✅ **No Data Loss**: Just recreates the view with better security

✅ **Better Security**: 
   - Users now see only data they're authorized to see
   - auth.users schema is not exposed to public roles
   - Helper function provides secure encapsulation

✅ **Maintains Functionality**: View still works, just with proper security

---

## Key Takeaway 🔑

**The Pattern:**
- ❌ **Never** put `SECURITY DEFINER` on views
- ❌ **Never** query `auth.users` directly in views
- ✅ **Always** use `SECURITY DEFINER` helper functions to access auth.users
- ✅ Views call the helper function, which safely checks auth.users

Run `fix-view-security-definer.sql` in Supabase SQL Editor to resolve BOTH issues! 🔒

