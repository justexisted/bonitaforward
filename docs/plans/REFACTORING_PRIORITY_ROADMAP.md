# Refactoring Priority Roadmap - Preventing Breaking Points

**Date:** 2025-01-XX  
**Status:** Active Planning  
**Goal:** Prevent cascading failures and breaking points

---

## 🎯 Critical Priorities (Do First)

### 1. **Complete Query Utility Migration** ⭐ HIGHEST PRIORITY

**Problem:** Some files still use direct `supabase.from()` queries, causing RLS errors and inconsistent error handling.

**Files Still Using Direct Queries:**
- ✅ `src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx` - 2 direct queries
  - Line 134: `supabase.from('user_notifications').insert()`
  - Line 186: `supabase.from('providers').update()`
- ✅ `src/components/admin/sections/JobPostsSection-2025-10-19.tsx` - 2 direct queries
  - Line 110: `supabase.from('user_notifications').insert()`
  - Line 193: `supabase.from('provider_job_posts').delete()`
- ✅ `src/lib/supabaseQuery.ts` - The utility itself (expected)

**Impact:**
- Direct queries bypass retry logic and standardized error handling
- When RLS policies change, direct queries fail with 403 errors
- Forms break after refactoring other parts
- Inconsistent error messages

**Fix:**
1. Migrate `ChangeRequestsSection` to use centralized query utility
2. Migrate `JobPostsSection` to use centralized query utility
3. Verify all queries use centralized utility: `npm run verify:migration`

**Prevention:**
- Add to pre-commit hook: Check for direct queries
- Add to CI/CD: Fail build if direct queries found
- Document pattern: Always use `query()` utility for table queries

---

### 2. **Audit All RLS Policies for Missing Admin INSERT Policies** ⭐ HIGH PRIORITY

**Problem:** The `providers` table had UPDATE/DELETE admin policies but no INSERT admin policy. Other tables might have the same issue.

**Tables to Audit:**
- ✅ `providers` - **FIXED** (added `providers_insert_admin`)
- ✅ `calendar_events` - **FIXED** (added `events_insert_admin`)
- ❌ `provider_job_posts` - **SKIPPED** (no admin flow creates job posts - unnecessary)
- ❌ `provider_change_requests` - **SKIPPED** (no admin flow creates change requests - unnecessary)
- ❌ `booking_events` - **SKIPPED** (service role bypasses RLS, no admin manual creation - unnecessary)
- ✅ `user_notifications` - **OK** (has both user and admin INSERT policies)

**Pattern to Check:**
```sql
-- For each table, verify:
-- 1. INSERT policies: Should have both user policy AND admin policy (if admins need to create)
-- 2. UPDATE policies: Should have both user policy AND admin policy (if table allows updates)
-- 3. DELETE policies: Should have both user policy AND admin policy (if table allows deletes)
```

**Fix:**
1. Run audit script for each table: `ops/rls/AUDIT-PROVIDERS-INSERT-RLS.sql` (template)
2. Check if admin INSERT policy exists for tables that need admin creation
3. Add missing admin INSERT policies following the same pattern as `providers`

**Admin INSERT Policies Added:**
```sql
-- ✅ calendar_events (FIXED - actually needed)
CREATE POLICY "events_insert_admin" 
ON public.calendar_events FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));
```

**Admin INSERT Policies Skipped (Unnecessary):**
- `provider_job_posts` - No admin flow creates job posts
- `provider_change_requests` - No admin flow creates change requests
- `booking_events` - Service role bypasses RLS, no admin manual creation needed

**Prevention:**
- When adding RLS policies for a table, always add admin policies for ALL operations
- Use consistent naming: `table_insert_admin`, `table_update_admin`, `table_delete_admin`
- Document in master RLS file which tables need admin policies

---

### 3. **Consolidate `is_admin_user()` Function Duplicates** ⚠️ MEDIUM PRIORITY

**Problem:** Audit showed TWO `is_admin_user()` functions with different definitions:
1. One checks JWT email directly: `auth.jwt()->>'email' = 'justexisted@gmail.com'`
2. One checks `admin_emails` table: `EXISTS (SELECT 1 FROM admin_emails WHERE email = ...)`

**Impact:**
- Inconsistent admin checks across policies
- Hard to maintain (multiple places to update)
- Could cause admin policies to fail if wrong function is used

**Fix:**
1. Drop duplicate function definitions
2. Keep only the one that checks `admin_emails` table (scalable)
3. Update master RLS file to ensure correct function is created
4. Verify all RLS policies use the correct function

**Prevention:**
- Document which `is_admin_user()` function is the source of truth
- Add check in pre-commit hook: Verify only one `is_admin_user()` function exists
- Document in master RLS file: Always use `is_admin_user(auth.uid())` pattern

---

### 4. **Standardize RLS Policy Patterns Across All Tables** ⚠️ MEDIUM PRIORITY

**Problem:** Different tables use different RLS policy patterns, making it hard to maintain and predict behavior.

**Current Patterns:**
- Some tables: `OR is_admin_user(auth.uid())` in USING clause (UPDATE/DELETE)
- Some tables: Separate admin policies (INSERT)
- Some tables: Combined policies vs. separate policies

**Fix:**
1. Standardize pattern: Always use separate admin policies for INSERT
2. For UPDATE/DELETE: Can use `OR is_admin_user(auth.uid())` in USING clause (consistent)
3. Document standard pattern in master RLS file
4. Update all tables to follow standard pattern

**Standard Pattern:**
```sql
-- INSERT: Always separate policies
CREATE POLICY "table_insert_auth" ... WITH CHECK (user_id = auth.uid());
CREATE POLICY "table_insert_admin" ... WITH CHECK (is_admin_user(auth.uid()));

-- UPDATE: Can combine OR use separate policies
CREATE POLICY "table_update_owner" ... USING (user_id = auth.uid());
CREATE POLICY "table_update_admin" ... USING (is_admin_user(auth.uid()));

-- DELETE: Can combine OR use separate policies
CREATE POLICY "table_delete_owner" ... USING (user_id = auth.uid());
CREATE POLICY "table_delete_admin" ... USING (is_admin_user(auth.uid()));
```

---

## 📋 Medium Priorities (Do Next)

### 5. **Add RLS Policy Audit Scripts for All Tables**

**Problem:** We only have audit scripts for specific tables. Need comprehensive audit for all tables.

**Fix:**
1. Create generic audit script template
2. Generate audit scripts for all tables that admins interact with
3. Add to pre-deployment checklist: Run RLS audits before deploying

**Files to Create:**
- `ops/rls/AUDIT-ALL-TABLES-RLS.sql` - Comprehensive audit script
- `ops/rls/AUDIT-TABLE-INSERT-RLS.sql` - Template for INSERT policies
- `ops/rls/AUDIT-TABLE-ADMIN-RLS.sql` - Template for admin policies

---

### 6. **Add Automated RLS Policy Validation**

**Problem:** RLS policies are manually maintained. Need automated checks to catch issues.

**Fix:**
1. Create script to verify all tables have required policies
2. Add to pre-commit hook: Verify RLS policies match master file
3. Add to CI/CD: Fail build if policies don't match expected pattern

**Script:**
```typescript
// scripts/verify-rls-policies.ts
// Checks:
// 1. All tables have required policies (INSERT, UPDATE, DELETE, SELECT)
// 2. Admin policies exist for tables that need them
// 3. Policy names match master RLS file
// 4. No duplicate policies
```

---

### 7. **Document All Admin Flows and Their RLS Requirements**

**Problem:** Admin flows (approve applications, create providers, etc.) need specific RLS policies, but this isn't documented.

**Fix:**
1. Document each admin flow and its RLS requirements
2. Create dependency tracking document for admin flows
3. Update cascading failures doc with admin flow patterns

**Flows to Document:**
- Approve business application → Create provider (needs admin INSERT policy)
- Reject business application → Update status (needs admin UPDATE policy)
- Delete user → Delete/keep businesses (needs admin DELETE policy)
- Approve change request → Update provider (needs admin UPDATE policy)
- Approve job post → Update status (needs admin UPDATE policy)
- Create notification → Insert notification (needs admin INSERT policy)

---

## 🔍 Low Priorities (Do When Time Permits)

### 8. **Migrate Remaining ~434 Queries to Centralized Utility**

**Status:** Incremental migration in progress (6 files migrated, ~58 files remaining)

**Approach:**
- Migrate high-impact files first (user-facing pages, critical hooks)
- Test thoroughly after each migration
- Use automated checks to verify migration

**Priority Files:**
1. `src/pages/Calendar.tsx` - High visibility, many queries
2. `src/pages/ProviderPage.tsx` - User-facing, critical queries
3. `src/hooks/useAdminDataLoader.ts` - Admin panel, critical queries
4. Netlify functions - Serverless context, important for reliability

---

### 9. **Add Integration Tests for Critical Flows**

**Problem:** No automated tests for critical flows (signup, admin approval, etc.).

**Fix:**
1. Create integration tests for critical flows
2. Add to CI/CD pipeline
3. Run before every deployment

**Critical Flows to Test:**
- User signup → Profile creation → Name display
- Business application submission → Admin approval → Provider creation
- Admin approves application → Provider created → Notification sent
- User deletion → Business handling → Data cleanup

---

### 10. **Consolidate Duplicate RLS Fix Files**

**Problem:** Multiple RLS fix files for the same table (e.g., `fix-providers-rls.sql`, `fix-providers-update-rls.sql`, `fix-providers-delete-rls.sql`).

**Fix:**
1. Consolidate all fix files into master RLS file
2. Keep only master RLS file as source of truth
3. Archive old fix files (don't delete, for reference)

---

## 🛡️ Prevention Strategies

### Immediate (Add Now)

1. **Pre-commit Hook:**
   ```bash
   # Check for direct Supabase queries
   npm run verify:migration
   
   # Check for RLS policy issues
   npm run verify:rls-policies
   
   # Check for breaking changes
   npm run check:breaking
   ```

2. **CI/CD Pipeline:**
   ```yaml
   - Run query migration verification
   - Run RLS policy verification
   - Run breaking changes check
   - Run linting
   - Fail build if any checks fail
   ```

3. **Documentation:**
   - Document all admin flows and RLS requirements
   - Create dependency tracking for admin flows
   - Update cascading failures doc with new patterns

### Short-term (1-2 weeks)

1. **Automated RLS Policy Validation:**
   - Script to verify all tables have required policies
   - Script to check for missing admin policies
   - Add to pre-commit hook

2. **Comprehensive Audit Scripts:**
   - Generic audit script template
   - Audit scripts for all tables
   - Add to deployment checklist

3. **Standardize RLS Patterns:**
   - Document standard pattern for all tables
   - Update master RLS file to follow standard
   - Update all tables to match standard

### Long-term (1 month+)

1. **Integration Tests:**
   - Test critical flows end-to-end
   - Add to CI/CD pipeline
   - Run before every deployment

2. **Complete Query Migration:**
   - Migrate all remaining ~434 queries
   - Test thoroughly after each migration
   - Use automated checks to verify

3. **Architecture Improvements:**
   - Reduce shared state
   - Create clear boundaries
   - Document data flow

---

## 📊 Current State Summary

### ✅ Completed
- ✅ Centralized query utility created and working
- ✅ 6 files migrated to centralized utility
- ✅ `providers` admin INSERT policy added
- ✅ Business applications RLS fixed
- ✅ NotificationBell migrated to centralized utility
- ✅ Automated verification scripts created

### ⚠️ In Progress
- ⚠️ ~434 queries across ~58 files still need migration (incremental)
- ⚠️ RLS policy audits for other tables (providers done, others pending)
- ⚠️ `is_admin_user()` function consolidation (2 duplicates exist)

### ❌ Not Started
- ❌ RLS policy standardization across all tables
- ❌ Automated RLS policy validation
- ❌ Integration tests for critical flows
- ❌ Comprehensive admin flow documentation

---

## 🎯 Next Immediate Steps

1. **✅ COMPLETED: Added admin INSERT policy for `calendar_events`**
   - Created fix file: `ops/rls/fix-calendar-events-admin-insert-rls.sql`
   - Updated master RLS file: `ops/rls/02-MASTER-RLS-POLICIES.sql`
   - Updated documentation: `docs/prevention/CASCADING_FAILURES.md`

2. **Migrate remaining direct queries:**
   - `ChangeRequestsSection` - Migrate to centralized utility
   - `JobPostsSection` - Migrate to centralized utility

3. **Consolidate `is_admin_user()` function:**
   - Drop duplicate function definitions
   - Keep only the `admin_emails` table version
   - Verify all RLS policies use correct function

4. **Add automated checks:**
   - RLS policy validation script
   - Pre-commit hook for RLS checks
   - CI/CD pipeline for RLS validation

---

**Last Updated:** 2025-01-XX  
**Status:** Active Planning
