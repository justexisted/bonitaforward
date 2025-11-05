# 5-Minute Manual Smoke Test

**Date:** 2025-01-XX  
**Purpose:** Quick verification that migrated queries work correctly in production  
**Time:** ~5 minutes

---

## ⚠️ When to Run This Test

Run this test **after** automated checks pass:

```bash
npm run verify:all
```

**If automated checks pass:** ✅ Run this 5-minute smoke test  
**If automated checks fail:** ❌ Fix issues first, then run smoke test

---

## 🧪 Quick Smoke Test (5 Minutes)

### Test 1: Profile Updates (2 minutes)

#### 1.1: Business Account Signup
**Steps:**
1. Go to `/signin`
2. Click "Sign up" for business account
3. Enter name, email, password
4. Complete onboarding form
5. **Verify:** Name appears immediately after signup

**Expected Results:**
- ✅ Name saved to database
- ✅ Profile appears in admin panel
- ✅ No errors in browser console
- ✅ Console logs show `[Profile Update from onboarding]` prefix

**What Could Break:**
- ❌ Name not saved during signup
- ❌ Profile data missing in admin panel
- ❌ Console errors about database

---

#### 1.2: Existing User Login
**Steps:**
1. Log in as existing user
2. Wait for auth state to refresh
3. **Verify:** Existing name is preserved (not cleared)

**Expected Results:**
- ✅ Name preserved during auth refresh
- ✅ No errors in browser console
- ✅ Console logs show `[Profile Update from auth-context]` prefix

**What Could Break:**
- ❌ Name disappears during refresh
- ❌ "Immutable field" errors in console
- ❌ Profile data cleared

---

### Test 2: Analytics Tracking (1 minute)

#### 2.1: Provider Page View Tracking
**Steps:**
1. Go to any provider page (e.g., `/provider/[id]`)
2. View the page
3. Check browser console for analytics logs

**Expected Results:**
- ✅ Analytics event tracked in console
- ✅ Console logs show `[Analytics]` prefix
- ✅ No database errors
- ✅ Analytics dashboard shows view count (if available)

**What Could Break:**
- ❌ Analytics events not tracked
- ❌ Database errors in console
- ❌ Analytics dashboard shows empty data

---

### Test 3: Error Handling (2 minutes)

#### 3.1: Browser Console Check
**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform Test 1 and Test 2 above
4. **Verify:** No errors in console

**Expected Results:**
- ✅ No red error messages
- ✅ Log prefixes visible (`[Profile Update]`, `[Analytics]`)
- ✅ Error messages are clear (if any occur)

**What Could Break:**
- ❌ Red error messages in console
- ❌ Unclear error messages
- ❌ Missing log prefixes

---

## ✅ Pass/Fail Criteria

### ✅ Pass (All Good)
- ✅ Profile saves correctly during signup
- ✅ Profile preserved during auth refresh
- ✅ Analytics events tracked
- ✅ No errors in browser console
- ✅ Log prefixes visible

### ❌ Fail (Needs Fix)
- ❌ Profile not saved during signup
- ❌ Profile cleared during auth refresh
- ❌ Analytics events not tracked
- ❌ Errors in browser console
- ❌ Missing log prefixes

---

## 🚨 If Test Fails

### Immediate Actions

1. **Check Browser Console:**
   - Look for specific error messages
   - Note which test failed
   - Copy error messages

2. **Check Network Tab:**
   - Look for failed requests
   - Check request/response details
   - Verify database connection

3. **Check Database:**
   - Verify profile data saved
   - Check analytics events recorded
   - Verify RLS policies

4. **Rollback Plan:**
   - See `docs/SUPABASE_QUERY_MIGRATION_TESTING.md` for rollback instructions
   - Revert to previous version if critical

---

## 📋 Quick Checklist

Before running this test:

- [ ] ✅ Automated checks passed (`npm run verify:all`)
- [ ] ✅ Database connection working
- [ ] ✅ Browser DevTools open (F12)
- [ ] ✅ Console tab visible

During test:

- [ ] ✅ Test 1.1: Signup → Name saved
- [ ] ✅ Test 1.2: Login → Name preserved
- [ ] ✅ Test 2.1: Provider page → Analytics tracked
- [ ] ✅ Test 3.1: Console → No errors

After test:

- [ ] ✅ All tests passed
- [ ] ✅ No errors in console
- [ ] ✅ Log prefixes visible

---

## 🎯 Summary

**Time:** ~5 minutes  
**Tests:** 3 critical paths  
**Focus:** Profile updates, analytics tracking, error handling

**If all pass:** ✅ Migration successful!  
**If any fail:** ❌ Check console errors, review rollback plan

---

**Last Updated:** 2025-01-XX  
**Status:** Ready to Use

