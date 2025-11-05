# Supabase Query Migration Testing Guide

**Date:** 2025-01-XX  
**Status:** Migration In Progress  
**Files Migrated:** 4 files, ~14 queries

---

## ✅ Migration Status

### Files Migrated (Using Centralized Query Utility)

1. ✅ `src/utils/profileUtils.ts` - 4 queries migrated
   - Profile existence check
   - Profile fetch (role, name, email preferences)
   - Profile update
   - Profile insert

2. ✅ `src/utils/adminDataLoadingUtils.ts` - 1 query migrated
   - Booking events fallback query

3. ✅ `src/services/analyticsService.ts` - 8 queries migrated
   - Listing analytics tracking
   - Funnel attribution tracking
   - Booking attribution tracking
   - Provider analytics retrieval (multiple queries)
   - Funnel responses retrieval
   - Booking attribution retrieval

4. ✅ `src/services/emailNotificationService.ts` - 1 query migrated
   - Email preference check

### Query Utility Enhancements

- ✅ Added `gte()` method for date range filtering
- ✅ Added `lte()` method for date range filtering
- ✅ Added support for `count` option in `select()` method
- ✅ Maintains Supabase-compatible `{ data, error }` format

---

## 🔍 Critical Dependencies Verified

### Profile Updates (profileUtils.ts)

**Dependencies:**
- `Onboarding.tsx` - Uses `updateUserProfile()` during signup
- `AuthContext.tsx` - Uses `updateUserProfile()` during auth refresh
- `AccountSettings.tsx` - Uses `updateUserProfile()` for profile updates

**Critical Flows:**
1. **Business Signup Flow:** SignIn → Onboarding → Profile Save
2. **Auth Refresh:** Login → AuthContext → Profile Update
3. **Account Settings:** Profile Update → Database Update

**What Could Break:**
- Profile updates failing silently
- Name not saved during signup
- Immutable field errors (role)
- Existing data cleared during updates

### Analytics Tracking (analyticsService.ts)

**Dependencies:**
- `ProviderPage.tsx` - Tracks listing views
- `Funnel.tsx` - Tracks funnel attribution
- `AnalyticsTab.tsx` - Displays analytics data

**Critical Flows:**
1. **Listing View:** User views provider → Track event → Save to database
2. **Funnel Submission:** User submits funnel → Track attribution → Link to provider
3. **Analytics Dashboard:** Load analytics → Display metrics → Show charts

**What Could Break:**
- Analytics events not being tracked
- Attribution data not linked correctly
- Analytics dashboard showing empty data

### Email Notifications (emailNotificationService.ts)

**Dependencies:**
- `adminBusinessApplicationUtils.ts` - Checks email preferences
- `ChangeRequestsSection.tsx` - Sends notifications
- Various Netlify functions - Send booking reminders, etc.

**Critical Flows:**
1. **Email Preference Check:** Before sending email → Check preference → Send or block
2. **Notification Sending:** Event triggered → Check preference → Send email

**What Could Break:**
- Emails sent to unsubscribed users
- Emails blocked for subscribed users
- Email preference checks failing

---

## ✅ Automated Checks (What I Can Verify)

### 1. Type Safety Check
- ✅ All migrated files pass TypeScript compilation
- ✅ No linting errors in migrated files
- ✅ Query utility maintains type safety

### 2. Error Handling Compatibility
- ✅ Query utility returns `{ data, error }` format (same as Supabase)
- ✅ Error objects maintain Supabase error structure
- ✅ Error logging standardized with prefixes

### 3. Query Builder API Compatibility
- ✅ All Supabase query methods supported (select, eq, maybeSingle, etc.)
- ✅ Date range filtering supported (gte, lte)
- ✅ Count option supported in select

### 4. Code Review Verification
- ✅ All queries use centralized utility
- ✅ Log prefixes added for debugging
- ✅ Comments explain why query utility is used
- ✅ Error handling preserved correctly

---

## 🧪 Manual Testing Instructions

### Critical Path 1: Profile Updates (HIGHEST PRIORITY)

#### Test 1.1: Business Account Signup
**Steps:**
1. Go to `/signin`
2. Click "Sign up" for business account
3. Enter name, email, password
4. Complete onboarding form
5. Verify profile is saved correctly

**Expected Results:**
- ✅ Name appears immediately after signup
- ✅ Profile saved to database with all fields
- ✅ No errors in console
- ✅ Admin panel shows complete profile

**What to Check:**
- Console logs show `[Profile Update from onboarding]` prefix
- No "immutable field" errors
- Name is preserved during auth refresh
- Profile data is complete in admin panel

#### Test 1.2: Auth Refresh (Existing User)
**Steps:**
1. Log in as existing user
2. Wait for auth state to refresh
3. Check profile is not cleared

**Expected Results:**
- ✅ Existing name preserved (not cleared)
- ✅ Role preserved (not updated if already set)
- ✅ No errors in console
- ✅ Profile data remains intact

**What to Check:**
- Console logs show `[Profile Update from auth-context]` prefix
- No "immutable field" errors
- Name doesn't disappear during refresh
- No database errors in console

#### Test 1.3: Account Settings Update
**Steps:**
1. Log in as existing user
2. Go to Account Settings
3. Update profile information
4. Save changes

**Expected Results:**
- ✅ Profile updates successfully
- ✅ Changes saved to database
- ✅ No errors in console
- ✅ Updated data visible immediately

**What to Check:**
- Console logs show standardized error format if errors occur
- Profile updates work correctly
- No database errors

---

### Critical Path 2: Analytics Tracking

#### Test 2.1: Listing View Tracking
**Steps:**
1. Go to any provider page
2. View the page (should trigger tracking)
3. Check browser console for analytics logs

**Expected Results:**
- ✅ Analytics event tracked in console
- ✅ No errors in console
- ✅ Event saved to database

**What to Check:**
- Console logs show `[Analytics]` prefix
- No database errors
- Analytics dashboard shows view count

#### Test 2.2: Funnel Attribution
**Steps:**
1. View a provider page
2. Click "Get Started" or submit funnel
3. Check browser console

**Expected Results:**
- ✅ Funnel attribution tracked
- ✅ Attribution linked to provider
- ✅ No errors in console

**What to Check:**
- Console logs show `[Analytics]` prefix
- No database errors
- Attribution data appears in analytics

#### Test 2.3: Analytics Dashboard
**Steps:**
1. Log in as business owner
2. Go to My Business → Analytics
3. View analytics dashboard

**Expected Results:**
- ✅ Analytics data loads correctly
- ✅ Charts display correctly
- ✅ Metrics show correct values
- ✅ No errors in console

**What to Check:**
- Console logs show `[Analytics]` prefix
- No database errors
- Analytics queries return data
- Date range filtering works

---

### Critical Path 3: Email Notifications

#### Test 3.1: Email Preference Check
**Steps:**
1. Log in as user with email notifications enabled
2. Trigger an event that sends email (e.g., change request approved)
3. Check if email is sent

**Expected Results:**
- ✅ Email sent if preference enabled
- ✅ Email blocked if preference disabled
- ✅ No errors in console

**What to Check:**
- Console logs show `[EmailService]` prefix
- Email preference check works correctly
- No database errors when checking preferences

#### Test 3.2: Unsubscribed User
**Steps:**
1. Log in as user with email notifications disabled
2. Trigger an event that sends email
3. Check if email is blocked

**Expected Results:**
- ✅ Email blocked for unsubscribed users
- ✅ Console shows "Email blocked - user has unsubscribed"
- ✅ No errors in console

**What to Check:**
- Console logs show `[EmailService]` prefix
- Email preference check returns false
- Email is not sent

---

### Critical Path 4: Admin Data Loading

#### Test 4.1: Admin Booking Events
**Steps:**
1. Log in as admin
2. Go to Admin panel
3. Navigate to Bookings section
4. Verify booking events load

**Expected Results:**
- ✅ Booking events load correctly
- ✅ No errors in console
- ✅ Fallback query works if Netlify function unavailable

**What to Check:**
- Console logs show `[Admin]` prefix
- No database errors
- Fallback query executes if needed

---

## 🔧 Error Testing

### Test Error Scenarios

#### Test Error Handling
**Steps:**
1. Disable network connection (simulate network error)
2. Try to perform profile update
3. Check error handling

**Expected Results:**
- ✅ Error is caught and logged with standardized format
- ✅ Retry logic attempts to retry (for retryable errors)
- ✅ User sees appropriate error message
- ✅ No unhandled errors

**What to Check:**
- Console logs show standardized error format
- Error classification works (retryable vs non-retryable)
- Retry logic attempts retries for network errors
- Non-retryable errors (like RLS) return immediately

#### Test RLS Errors
**Steps:**
1. Try to access data without proper permissions
2. Check error handling

**Expected Results:**
- ✅ RLS error is caught and logged
- ✅ No retry attempts (RLS errors are not retryable)
- ✅ Error message indicates permission issue

**What to Check:**
- Console logs show `RLS_ERROR` code
- No retry attempts for RLS errors
- Error message is clear

---

## 📊 Verification Checklist

### Before Testing
- [ ] All migrated files pass TypeScript compilation
- [ ] No linting errors
- [ ] Query utility is properly imported
- [ ] Development environment is set up

### During Testing
- [ ] Profile updates work correctly
- [ ] Analytics tracking works correctly
- [ ] Email notifications work correctly
- [ ] Admin data loading works correctly
- [ ] No errors in browser console
- [ ] Error handling works correctly
- [ ] Retry logic works for network errors

### After Testing
- [ ] All critical paths verified
- [ ] No breaking changes detected
- [ ] Error handling works correctly
- [ ] Performance is acceptable
- [ ] Console logs are helpful for debugging

---

## 🚨 Red Flags to Watch For

### Critical Issues
1. **Profile updates failing silently** - Check console for errors
2. **Name disappearing during auth refresh** - Check profile update logic
3. **Analytics events not being tracked** - Check database for events
4. **Emails sent to unsubscribed users** - Check email preference logic
5. **Immutable field errors** - Check profile update payload

### Performance Issues
1. **Slow queries** - Check if retry logic is causing delays
2. **Excessive retries** - Check retry configuration
3. **Memory leaks** - Check if queries are properly cleaned up

### Error Handling Issues
1. **Unhandled errors** - Check error handling in migrated files
2. **Inconsistent error messages** - Check error logging format
3. **Retry logic not working** - Check error classification

---

## 📝 Console Log Patterns to Verify

### Profile Updates
- Look for: `[Profile Update from onboarding]` or `[Profile Update from auth-context]`
- Should see: Query execution logs, success/error messages
- Should NOT see: Unhandled errors, missing error messages

### Analytics Tracking
- Look for: `[Analytics]` prefix
- Should see: Event tracking logs, query execution logs
- Should NOT see: Database errors, missing events

### Email Notifications
- Look for: `[EmailService]` prefix
- Should see: Email preference checks, send/block decisions
- Should NOT see: Database errors, missing preference checks

---

## 🔄 Rollback Plan

If critical issues are found:

1. **Immediate:** Revert migrated files to use direct Supabase queries
2. **Short-term:** Fix issues in query utility
3. **Long-term:** Re-migrate after fixes are verified

**Files to Revert:**
- `src/utils/profileUtils.ts`
- `src/utils/adminDataLoadingUtils.ts`
- `src/services/analyticsService.ts`
- `src/services/emailNotificationService.ts`

**How to Revert:**
- Replace `query('table', options)` with `supabase.from('table')`
- Remove query utility imports
- Restore original error handling

---

## ✅ Success Criteria

Migration is successful if:

1. ✅ All critical paths work correctly
2. ✅ No breaking changes detected
3. ✅ Error handling works correctly
4. ✅ Performance is acceptable
5. ✅ Console logs are helpful
6. ✅ All tests pass

---

## 📞 Next Steps

After testing:

1. **If successful:** Continue migrating more files
2. **If issues found:** Fix issues and re-test
3. **If critical:** Rollback and investigate

**Next Files to Migrate:**
- `src/hooks/*.ts` - Admin hooks
- `src/pages/**/*.tsx` - Page files
- `src/components/**/*.tsx` - Component files

---

**Last Updated:** 2025-01-XX  
**Status:** Ready for Testing

