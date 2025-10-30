# 🎯 RLS QUICK REFERENCE
### One-Page Cheat Sheet - Print & Keep Handy

---

## Got an RLS Error? Follow This:

```
┌─────────────────────────────────────────────┐
│  1. IDENTIFY  → Table name? Operation?     │
│  2. DIAGNOSE  → FAST-RLS-DIAGNOSTIC.sql    │
│  3. FIX       → 02-MASTER-RLS-POLICIES.sql │
│  4. VERIFY    → Check policies + test app  │
└─────────────────────────────────────────────┘
```

**Estimated Time:** 3-5 minutes

---

## The 3 SQL Files You Need

| File | Use When | Time |
|------|----------|------|
| **FAST-RLS-DIAGNOSTIC.sql** | Got error on specific table | 30 sec |
| **02-MASTER-RLS-POLICIES.sql** | Need to fix/reset policies | 2 min |
| **01-AUDIT-CURRENT-RLS-STATE.sql** | Want to see everything | 1 min |

---

## Common Errors & Instant Fixes

### ❌ Error: "403 Forbidden - new row violates RLS policy"
**Problem:** Missing INSERT policy  
**Fix:** Add this to your table
```sql
CREATE POLICY "table_insert_own" 
ON table_name FOR INSERT
WITH CHECK (user_id = auth.uid());
```

### ❌ Error: "permission denied for table users"
**Problem:** Policy accessing `auth.users`  
**Fix:** Replace with safe pattern
```sql
-- ❌ Don't use: (SELECT FROM auth.users ...)
-- ✅ Use this: auth.jwt()->>'email'
```

### ❌ Error: DELETE fails but SELECT works
**Problem:** Missing DELETE policy  
**Fix:** Add this
```sql
CREATE POLICY "table_delete_own" 
ON table_name FOR DELETE
USING (user_id = auth.uid());
```

---

## Safe Auth Patterns (Copy/Paste)

```sql
-- ✅ Check user ID
auth.uid() = user_id

-- ✅ Check email
auth.jwt()->>'email' = email_column

-- ✅ Check admin
is_admin_user(auth.uid())

-- ❌ NEVER DO THIS
(SELECT email FROM auth.users WHERE id = auth.uid())
```

---

## Standard Policy Template

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "old_policy" ON table_name;

-- Create policies
CREATE POLICY "table_select_own" ON table_name FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "table_select_admin" ON table_name FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "table_insert_own" ON table_name FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "table_update_own" ON table_name FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "table_update_admin" ON table_name FOR UPDATE
USING (is_admin_user(auth.uid()));

CREATE POLICY "table_delete_own" ON table_name FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "table_delete_admin" ON table_name FOR DELETE
USING (is_admin_user(auth.uid()));
```

---

## Diagnostic Queries

```sql
-- Show all policies for a table
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE';

-- Find broken auth.users references
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE'
AND qual::text LIKE '%auth.users%';

-- Check what operations have policies
SELECT cmd, COUNT(*) 
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE' 
GROUP BY cmd;

-- Verify current user
SELECT 
  auth.uid() as my_id,
  auth.jwt()->>'email' as my_email;
```

---

## Every Table Needs

```
✅ SELECT policy  (who can read)
✅ INSERT policy  (who can create)
✅ UPDATE policy  (who can modify)
✅ DELETE policy  (who can remove)
✅ Admin access   (for each operation)
```

---

## Complete Database Tables

### User-Owned Tables
`profiles`, `bookings`, `user_notifications`, `user_saved_events`, `saved_providers`, `coupon_redemptions`

### Business Tables  
`providers`, `provider_job_posts`, `provider_change_requests`

### Public Submit Tables
`business_applications`, `contact_leads`, `funnel_responses`

### Public Read Tables
`calendar_events`, `categories`, `blog_posts`, `event_votes`

### Admin-Only Tables
`admin_emails`, `admin_audit_log`, `providers_backup`

---

## Success Checklist

Before you close the ticket:

- [ ] Error gone in browser console
- [ ] Operation works in app
- [ ] Policies exist for SELECT, INSERT, UPDATE, DELETE
- [ ] No `auth.users` references in policies
- [ ] Admin can still access everything
- [ ] Regular user can only access their own data
- [ ] Tested with non-admin user

---

## Still Stuck?

1. Open `RLS-MASTER-GUIDE-2025-10-28.md` (full documentation)
2. Run `01-AUDIT-CURRENT-RLS-STATE.sql` (see everything)
3. Run `02-MASTER-RLS-POLICIES.sql` (nuclear reset)
4. Check browser console for exact error message

---

**Remember:** Never guess. Always diagnose first. Fix in minutes, not hours. 🎯

