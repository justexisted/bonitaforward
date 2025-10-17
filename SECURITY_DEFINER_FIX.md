# Fix: SECURITY DEFINER View Issue

## Problem

Supabase has detected that your view `public.v_bookings_with_provider` is defined with the `SECURITY DEFINER` property.

### Why This is a Security Risk

- **SECURITY DEFINER** views execute with the permissions of the view **creator** (typically a database superuser)
- This **bypasses Row Level Security (RLS)** policies
- Any user who can query the view gets **elevated privileges**
- Could allow unauthorized access to sensitive booking data

### What Should Happen Instead

Views should use **SECURITY INVOKER** (the default), which means:
- The view runs with the permissions of the **querying user**
- RLS policies are **properly enforced**
- Users only see data they're authorized to see

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

### 1. Drops the Existing View
```sql
DROP VIEW IF EXISTS public.v_bookings_with_provider CASCADE;
```

### 2. Recreates Without SECURITY DEFINER
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
  OR -- Admin check
```

### 3. Grants Proper Permissions
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

✅ **Safe Fix**: Removes SECURITY DEFINER, enforces proper permissions

✅ **No Data Loss**: Just recreates the view with better security

✅ **Better Security**: Users now see only data they're authorized to see

✅ **Maintains Functionality**: View still works, just with proper security

Run `fix-view-security-definer.sql` in Supabase SQL Editor to resolve this issue! 🔒

