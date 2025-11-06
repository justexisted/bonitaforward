# What's Next - Roadmap

**Date:** 2025-01-XX  
**Status:** Critical Fixes Complete - Ready for Testing

---

## ✅ Recently Completed

### 1. Step-Based Business Plan Flow
- ✅ Added Step 1 badge to plan selection
- ✅ Added Step 2 badge to listing creation
- ✅ Redirect logic: Users must choose plan before creating listing
- ✅ Empty state messages guide users through steps
- ✅ Upgrade to Featured option already available after listing creation

### 2. Fixed Business Applications Issues
- ✅ Migrated `BusinessPage.tsx` to centralized query utility
- ✅ Migrated `adminService.ts` to centralized query utility
- ✅ Fixed `useBusinessOperations.ts` to use centralized utility
- ✅ Added delay after insert to ensure data visibility
- ✅ Fixed TypeScript build errors (unused imports, implicit any types)

### 3. Updated Documentation
- ✅ Added PowerShell commands to `CASCADING_FAILURES.md`
- ✅ Added Section #25: Direct Supabase Queries Breaking After Refactoring
- ✅ Updated prevention checklists with Windows-compatible commands

---

## 🎯 Immediate Next Steps (Priority Order)

### 1. **Test the Step-Based Flow** ⭐ HIGH PRIORITY
**What to test:**
- [ ] New business user signs up
- [ ] User sees Step 1 (plan selection) with badge
- [ ] User cannot create listing without choosing plan
- [ ] Clicking "Create Your First Listing" redirects to Step 1
- [ ] After choosing plan, Step 2 becomes available
- [ ] Step 2 badge appears on listings tab
- [ ] Listing creation works after plan selection
- [ ] Upgrade to Featured button appears on free listings

**How to test:**
1. Sign up as new business user
2. Navigate to `/my-business`
3. Try to create listing without choosing plan
4. Choose plan (Free or Featured)
5. Verify listing creation works
6. Verify upgrade option appears

---

### 2. **Verify Business Applications Work End-to-End** ⭐ HIGH PRIORITY
**What to verify:**
- [ ] Submit business application from `/business` page
- [ ] Application appears in "Applications" tab immediately
- [ ] Notification bell shows new application
- [ ] Submit application from `/my-business` page
- [ ] Both forms work identically

**How to verify:**
1. Submit application from public form (`/business`)
2. Check Applications tab in `/my-business`
3. Check notification bell
4. Submit application from authenticated form (`/my-business`)
5. Verify it appears immediately

---

### 3. **Check for Remaining Direct Supabase Queries** ⭐ MEDIUM PRIORITY
**Current status:**
- ✅ `business_applications` queries: All migrated
- ✅ Critical forms: All migrated
- ⚠️ Admin sections: 2 files still use direct queries (lower priority)

**Files to check:**
- `src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx`
- `src/components/admin/sections/JobPostsSection-2025-10-19.tsx`

**Action:**
- These are admin-only sections, so lower risk
- Can migrate when working on admin panel improvements
- Not blocking user-facing functionality

---

### 4. **Continue Query Migration (Incremental)** ⭐ LOW PRIORITY
**Status:**
- 6 files migrated (including recent fixes)
- ~434 queries across ~58 files remaining
- Migration should be incremental with testing

**Next files to consider:**
1. High-impact user-facing pages (`Calendar.tsx`, `ProviderPage.tsx`)
2. Critical hooks (`useAdminDataLoader.ts`, etc.)
3. Netlify functions (serverless context)

**Approach:**
- One file at a time
- Test thoroughly after each migration
- Use the automated checks: `npm run verify:migration`

---

## 🔍 Verification Steps

### Quick Verification Commands

**PowerShell (Windows):**
```powershell
# Check for remaining direct Supabase queries
Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "supabase\.from\("

# Check for business_applications queries
Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Select-String -Pattern "business_applications"

# Run automated checks
npm run verify:migration
npm run verify:format
npm run lint
```

**Bash (Linux/Mac):**
```bash
grep -r "supabase\.from\(" src/
grep -r "business_applications" src/ --include="*.ts" --include="*.tsx"
npm run verify:all
```

---

## 📋 Testing Checklist

Before considering this "done":

- [ ] **Step-Based Flow Test**
  - [ ] New user sees Step 1 first
  - [ ] Cannot create listing without plan
  - [ ] Plan selection unlocks Step 2
  - [ ] Listing creation works after plan choice

- [ ] **Business Applications Test**
  - [ ] Public form (`/business`) works
  - [ ] Authenticated form (`/my-business`) works
  - [ ] Applications appear immediately after submission
  - [ ] Notifications show new applications

- [ ] **Build Verification**
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes
  - [ ] `npm run verify:all` passes
  - [ ] No TypeScript errors

- [ ] **Smoke Test**
  - [ ] Sign up works
  - [ ] Sign in works
  - [ ] Business plan selection works
  - [ ] Listing creation works
  - [ ] Applications appear in UI

---

## 🚀 Future Enhancements

### Phase 2: Query Migration (Lower Priority)
- Migrate remaining ~434 queries incrementally
- Focus on high-impact files first
- Test thoroughly after each migration

### Phase 3: Testing Infrastructure
- Set up integration tests for critical flows
- Automate end-to-end testing
- Add regression tests for common breakages

### Phase 4: Documentation
- Complete API documentation for query utility
- Create migration examples for common patterns
- Document best practices

---

## 📝 Notes

- **Critical fixes complete:** All business applications queries migrated
- **Step-based flow implemented:** Users must choose plan before listing
- **Documentation updated:** PowerShell commands added for Windows users
- **Build errors fixed:** TypeScript compilation passes

**Next focus:** Test the step-based flow and verify everything works end-to-end.

---

**Last Updated:** 2025-01-XX

