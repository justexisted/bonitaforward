# RLS System Status Tracker
**Last Updated:** 2025-01-XX  
**Purpose:** Track RLS system status and prevent duplicate fixes

---

## 🔄 Current Status

### System Status: ✅ ACTIVE
- **Master File:** `ops/rls/02-MASTER-RLS-POLICIES.sql`
- **Standard Pattern:** `ops/rls/STANDARD_RLS_POLICIES-2025-10-30.sql`
- **Guide:** `docs/ops/RLS-MASTER-GUIDE-2025-10-28.md`
- **SOP:** `docs/ops/RLS_SOP-2025-10-30.md`

---

## 📋 Workflow Steps

### Step 1: Diagnose
✅ Run `ops/rls/FAST-RLS-DIAGNOSTIC.sql` or `ops/rls/AUDIT_RLS-2025-10-30.sql`

### Step 2: Fix
✅ **Update** `ops/rls/02-MASTER-RLS-POLICIES.sql` (DO NOT create new fix files)

### Step 3: Test
✅ Run verification queries from master file or guide

### Step 4: Deploy
✅ Run the master file section in Supabase SQL Editor

---

## 🚨 Active Issues

### Issue #1: Profiles UPDATE Policy
**Status:** ✅ FIXED AND DEPLOYED  
**Date:** 2025-01-XX  
**Problem:** UPDATE operations failing - **MISSING `profiles_update_own` policy**  
**Root Cause:** Database only had `profiles_update_admin` - users couldn't update own profiles  

**Audit Results (Before Fix):**
- ❌ Missing: `profiles_update_own` policy
- ❌ Wrong: `profiles_select_all` (should be `profiles_select_own` + `profiles_select_admin`)
- ❌ Wrong: `profiles_insert_auth` name (should be `profiles_insert_own`)
- ✅ Correct: `profiles_delete_admin` existed

**Fix Applied:** `ops/rls/fix-profiles-rls-complete.sql` ✅  
**Deployment Status:** ✅ COMPLETE

**Post-Fix Audit Results:**
- ✅ DELETE: 1 policy (`profiles_delete_admin`)
- ✅ INSERT: 1 policy (`profiles_insert_own`)
- ✅ SELECT: 2 policies (`profiles_select_own`, `profiles_select_admin`)
- ✅ UPDATE: 2 policies (`profiles_update_own`, `profiles_update_admin`)

**Action Required:** 
1. ✅ Run diagnostic - DONE
2. ✅ Run fix script - DONE
3. ✅ Verify UPDATE policies - DONE
4. ✅ Test profile update in application - DONE ✅ WORKS

**Resolution:** ✅ COMPLETE - Profile updates working correctly

**Before:**
```sql
CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE
USING (id = auth.uid());  -- ❌ Missing WITH CHECK
```

**After:**
```sql
CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());  -- ✅ Added
```

---

## ✅ Verification Checklist

Before marking an issue as fixed:

- [ ] Updated `02-MASTER-RLS-POLICIES.sql` (not created new file)
- [ ] Policy includes both `USING` and `WITH CHECK` for UPDATE operations
- [ ] Policy follows naming convention: `{table}_{operation}_{who}`
- [ ] Admin policy exists alongside user policy
- [ ] Verified against `STANDARD_RLS_POLICIES-2025-10-30.sql` pattern
- [ ] Ran verification queries in Supabase
- [ ] Tested in application
- [ ] Updated this tracking document

---

## 📚 Standard Patterns

### UPDATE Policy Pattern (From STANDARD_RLS_POLICIES-2025-10-30.sql)

```sql
-- User-owned table UPDATE policy
CREATE POLICY "table_update_own" 
ON table_name FOR UPDATE
USING (auth.uid() = user_id)  -- Can see row
WITH CHECK (auth.uid() = user_id);  -- Can set new values

-- Admin UPDATE policy
CREATE POLICY "table_update_admin" 
ON table_name FOR UPDATE
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));
```

**Key Point:** UPDATE policies MUST have both `USING` and `WITH CHECK`

---

## 🔍 How to Verify Policy is Correct

### 1. Check Policy Structure
```sql
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'UPDATE';
```

Should show:
- `profiles_update_own` with both `qual` (USING) and `with_check` populated
- `profiles_update_admin` with both `qual` (USING) and `with_check` populated

### 2. Test UPDATE
```sql
-- As authenticated user (id matches auth.uid())
UPDATE profiles SET name = 'Test' WHERE id = auth.uid();
-- Should succeed ✅
```

---

## 🚫 DO NOT

- ❌ Create new `fix-*-rls.sql` files
- ❌ Update policies without updating master file
- ❌ Skip verification step
- ❌ Deploy without testing
- ❌ Create policies without following standard pattern

---

## ✅ DO

- ✅ Always update `02-MASTER-RLS-POLICIES.sql`
- ✅ Follow `STANDARD_RLS_POLICIES-2025-10-30.sql` patterns
- ✅ Include both `USING` and `WITH CHECK` for UPDATE
- ✅ Verify with queries before deploying
- ✅ Test in application after deployment
- ✅ Update this tracking document

---

## 📖 Reference Files

- **Master Policies:** `ops/rls/02-MASTER-RLS-POLICIES.sql`
- **Standard Patterns:** `ops/rls/STANDARD_RLS_POLICIES-2025-10-30.sql`
- **Quick Diagnostic:** `ops/rls/FAST-RLS-DIAGNOSTIC.sql`
- **Audit Script:** `ops/rls/AUDIT_RLS-2025-10-30.sql`
- **Master Guide:** `docs/ops/RLS-MASTER-GUIDE-2025-10-28.md`
- **SOP:** `docs/ops/RLS_SOP-2025-10-30.md`

---

## 📝 Change Log

### 2025-01-XX - Profiles UPDATE Policy Fix ✅ RESOLVED
- **Issue:** Profile UPDATE operations failing with 403/406 errors
- **Root Cause:** **Missing `profiles_update_own` policy entirely** - only `profiles_update_admin` existed
- **Additional Issues:** Wrong SELECT policy (`profiles_select_all`), wrong INSERT policy name
- **Discovery:** Audit revealed database state didn't match master file
- **Fix Applied:** 
  1. Ran `ops/rls/diagnose-profiles-rls.sql` (audit first)
  2. Created `ops/rls/fix-profiles-rls-complete.sql` with dynamic DROP
  3. Dropped all existing policies dynamically
  4. Created correct policies from master file
- **Verification:** 
  - ✅ All 6 policies created correctly
  - ✅ UPDATE policies have both `USING` and `WITH CHECK`
  - ✅ Application tested and working
- **Status:** ✅ COMPLETE - Profile updates working correctly
- **Master File:** Already had correct policies, but wasn't deployed
- **Key Lesson:** Always audit database state before fixing - master file ≠ database state

---

## ✅ Resolved Issues

### Profiles UPDATE Policy (2025-01-XX) ✅
- ✅ Audit completed
- ✅ Fix deployed
- ✅ Policies verified
- ✅ Application tested and working
- ✅ Master file confirmed correct
- **Status:** RESOLVED

---

## 🔄 Prevention Guidelines

### Before Any RLS Fix:

1. **Always audit first** - Run diagnostic script for the table
2. **Compare to master file** - See if database matches what should exist
3. **Use dynamic DROP** - Don't rely on specific policy names
4. **Update master file** - Keep source of truth updated
5. **Verify after fix** - Check policies were created correctly
6. **Test in application** - Don't assume it works without testing

### Critical Rules:

- ❌ **NEVER** skip the audit step
- ❌ **NEVER** assume master file matches database
- ❌ **NEVER** create fix files - update master file instead
- ❌ **NEVER** use static DROP statements - use dynamic SQL
- ✅ **ALWAYS** run diagnostic first
- ✅ **ALWAYS** verify UPDATE policies have both USING and WITH CHECK
- ✅ **ALWAYS** test in application after deployment

---

**Remember:** The system only works if we follow it. Always audit first, update the master file, verify, then deploy.

