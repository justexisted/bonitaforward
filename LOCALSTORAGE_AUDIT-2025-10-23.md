# localStorage Usage Audit

**Date:** 2025-10-23  
**Purpose:** Document all localStorage usage, explain why each item is stored locally vs. database

---

## Summary

**Total localStorage Keys Used:** 11 unique key patterns  
**Total Size:** Varies by user, mostly small (<100KB)

---

## 1. Authentication & Session Management

### `bf-return-url`
- **Location:** `src/contexts/AuthContext.tsx`, `src/utils/helpers.ts`
- **Purpose:** Store URL to redirect to after sign-in/sign-up
- **Why localStorage:**
  - ✅ **Session-specific:** Only needed during sign-in flow
  - ✅ **No server needed:** Client-side routing only
  - ✅ **Temporary:** Cleared after successful redirect
  - ❌ **NOT in database:** Would create unnecessary DB calls for every sign-in

### `bf-pending-profile`
- **Location:** `src/contexts/AuthContext.tsx`, `src/pages/SignIn.tsx`
- **Purpose:** Store user's name/role during sign-up, before account is created
- **Data:** `{ name: string, email: string, role: 'business' | 'community' }`
- **Why localStorage:**
  - ✅ **Pre-authentication:** User doesn't have account yet
  - ✅ **Temporary:** Cleared after profile is created in database
  - ✅ **Race condition prevention:** Ensures role is saved even if profile creation is delayed
  - ❌ **NOT in database:** User doesn't exist in database yet

### `bf-auth` (removed)
- **Location:** `src/contexts/AuthContext.tsx`
- **Purpose:** Legacy auth state (now removed, cleared for cleanup)
- **Status:** ⚠️ **DEPRECATED** - Only cleared, never set

---

## 2. User Preferences & UI State

### `bf-calendar-info-dismissed`
- **Location:** `src/components/Calendar.tsx`
- **Purpose:** Remember if user dismissed the calendar info card
- **Why localStorage:**
  - ✅ **UI preference:** Not critical data
  - ✅ **No authentication needed:** Works for signed-out users
  - ✅ **Low priority:** Doesn't need to sync across devices
  - ❌ **NOT in database:** Would require DB call every page load for trivial preference

**Recommendation:** ⚠️ **SHOULD BE IN DATABASE**
- Would provide better UX across devices
- User sees dismissed state on all devices
- Already have `profiles` table with user preferences

---

## 3. Event Management

### `bf-saved-events` (legacy, no user ID)
- **Location:** `src/components/CalendarSection.tsx`
- **Purpose:** Save events for non-authenticated users
- **Why localStorage:**
  - ✅ **No authentication:** Works for guests
  - ✅ **Temporary:** Until user signs in
  - ❌ **Inconsistent:** Should migrate to database when user signs in

**Issue:** 🔴 **INCONSISTENT IMPLEMENTATION**
- Guest users: localStorage (`bf-saved-events`)
- Signed-in users: Also localStorage (`bf-saved-events-${userId}`)
- **SHOULD BE:** Database table `user_saved_events`

### `bf-saved-events-${userId}`
- **Location:** `src/pages/Calendar.tsx`
- **Purpose:** Save events for authenticated users
- **Why localStorage:**
  - ❌ **BAD PRACTICE:** Should be in database
  - ❌ **Doesn't sync across devices**
  - ❌ **Lost if user clears browser data**
  - ❌ **No backup**

**Recommendation:** 🔴 **MIGRATE TO DATABASE**
- Create `user_saved_events` table:
  ```sql
  CREATE TABLE user_saved_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
  );
  ```

### `bf-event-terms-${userId}`
- **Location:** `src/pages/Calendar.tsx`
- **Purpose:** Track if user accepted terms to create events
- **Why localStorage:**
  - ❌ **BAD PRACTICE:** Should be in database
  - ❌ **Legal requirement:** Terms acceptance should be logged
  - ❌ **Doesn't sync across devices**

**Recommendation:** 🔴 **MIGRATE TO DATABASE**
- Add column to `profiles` table: `event_terms_accepted_at TIMESTAMPTZ`
- Provides audit trail for legal compliance

---

## 4. Admin Tools

### `admin-state`
- **Location:** `src/pages/Admin.tsx`, `src/utils/adminHelpers.ts`
- **Purpose:** Remember which provider was being edited in admin panel
- **Data:** `{ section: string, selectedProviderId: string, timestamp: number }`
- **Why localStorage:**
  - ✅ **UX improvement:** Restore state after page refresh
  - ✅ **Session-specific:** Not needed long-term
  - ✅ **Admin-only:** Low priority data
  - ✅ **Expires after 1 hour**
- **Why NOT database:**
  - Would create DB calls every time admin switches tabs
  - Session data doesn't need persistence

**Verdict:** ✅ **CORRECT USE** - Good use of localStorage for temporary session state

---

## 5. Performance Caching

### `bf-event-images-cache`
- **Location:** `src/utils/eventImageUtils.ts`
- **Purpose:** Cache Unsplash image URLs to avoid repeated API calls
- **Data:** `{ [eventId]: { url: string, timestamp: number, gradient: string } }`
- **Cache Duration:** 24 hours
- **Why localStorage:**
  - ✅ **Performance:** Avoid Unsplash API rate limits (50 requests/hour)
  - ✅ **Temporary:** Images expire after 24 hours
  - ✅ **Large data:** Would bloat database
  - ✅ **Browser-specific:** Each device has own cache

**Verdict:** ✅ **CORRECT USE** - Essential for API rate limiting

**Note:** ⚠️ Size can grow large (estimates show ~50KB for 20 events)

---

## 6. Questionnaire & Tracking

### `bf-tracking-${categoryKey}`
- **Location:** `src/components/Funnel.tsx`
- **Purpose:** Store user's answers to category questionnaire
- **Data:** `{ [questionId]: optionId }`
- **Why localStorage:**
  - ✅ **No authentication needed:** Works for guests
  - ✅ **Temporary:** Cleared after questionnaire completion
  - ✅ **Privacy:** User preferences for filtering, not personally identifiable
  - ❌ **Doesn't sync across devices**

**Recommendation:** ⚠️ **CONSIDER DATABASE FOR SIGNED-IN USERS**
- Could save to database after user signs in
- Allows users to resume questionnaire on different devices

---

## 7. Business Management

### `user_plan_choice_${userId}`
- **Location:** `src/pages/MyBusiness.tsx`
- **Purpose:** Remember if user chose "Keep Free Plan" or is pending featured plan
- **Values:** `'free'` or `'featured-pending'`
- **Why localStorage:**
  - ❌ **BAD PRACTICE:** Should be in database
  - ❌ **Business-critical:** Plan choice should be server-side
  - ❌ **Doesn't sync across devices**
  - ❌ **User could manipulate**

**Recommendation:** 🔴 **MIGRATE TO DATABASE IMMEDIATELY**
- This is business logic and should NOT be client-side
- Add to `profiles` table or create `user_subscriptions` table
- Security risk: User could clear localStorage and see subscription prompts again

---

## 8. Pre-fill Data (UX)

### `bf-signup-prefill`
- **Location:** `src/pages/SignIn.tsx`, `src/pages/BusinessPage.tsx`
- **Purpose:** Pre-fill sign-up form with name/email from business application
- **Data:** `{ name: string, email: string }`
- **Why localStorage:**
  - ✅ **Pre-authentication:** User doesn't have account yet
  - ✅ **Temporary:** Cleared after sign-up
  - ✅ **UX improvement:** Avoid re-typing information

**Verdict:** ✅ **CORRECT USE** - Good UX pattern for multi-step flows

### `bf-business-app`
- **Location:** `src/pages/BusinessPage.tsx`
- **Purpose:** Backup of business application form data
- **Why localStorage:**
  - ✅ **Backup:** In case form submission fails
  - ✅ **Pre-authentication:** User might not be signed in

**Verdict:** ✅ **CORRECT USE** - Good safety net

### `bf-user-contact`
- **Location:** `src/pages/ContactPage.tsx`
- **Purpose:** Store contact form submission as backup
- **Why localStorage:**
  - ✅ **Backup:** In case email submission fails
  - ✅ **Pre-authentication:** Contact form works for guests

**Verdict:** ✅ **CORRECT USE** - Good safety net

---

## Risk Assessment

### 🔴 **CRITICAL ISSUES**

1. **`user_plan_choice_${userId}` - Business Logic in Client**
   - **Risk:** User could manipulate subscription state
   - **Impact:** Revenue loss, inconsistent user experience
   - **Fix:** Move to database immediately

2. **`bf-saved-events-${userId}` - User Data Not Persisted**
   - **Risk:** Users lose saved events when switching devices
   - **Impact:** Poor UX, data loss
   - **Fix:** Create `user_saved_events` table

3. **`bf-event-terms-${userId}` - Legal Compliance Issue**
   - **Risk:** No audit trail of terms acceptance
   - **Impact:** Legal liability
   - **Fix:** Add `event_terms_accepted_at` to profiles table

---

## Recommendations

### ✅ **Keep in localStorage** (Correct Usage)
- `bf-return-url` - Navigation state
- `admin-state` - Session state
- `bf-event-images-cache` - Performance cache
- `bf-signup-prefill` - UX pre-fill
- `bf-business-app` - Form backup
- `bf-user-contact` - Form backup

### ⚠️ **Consider Moving to Database**
- `bf-calendar-info-dismissed` - Better cross-device UX
- `bf-tracking-${categoryKey}` - For signed-in users only

### 🔴 **Must Move to Database**
1. `user_plan_choice_${userId}` - Business logic
2. `bf-saved-events-${userId}` - User data
3. `bf-event-terms-${userId}` - Legal compliance

---

## Storage Guidelines

### ✅ **Use localStorage For:**
- Temporary session state
- UI preferences (non-critical)
- Performance caching (with expiration)
- Pre-authentication form data
- Client-side routing state

### ❌ **Never Use localStorage For:**
- Business logic or pricing decisions
- User data that should persist long-term
- Legal/compliance data (terms acceptance, consent)
- Data that needs to sync across devices
- Sensitive user information

---

## Action Items

1. **IMMEDIATE:** Move `user_plan_choice_${userId}` to database
2. **HIGH PRIORITY:** Move saved events to database
3. **HIGH PRIORITY:** Move event terms acceptance to database
4. **MEDIUM:** Consider database for UI preferences (signed-in users)
5. **LOW:** Add localStorage size monitoring and cleanup

---

## Current Size Estimate

Based on typical usage:
- Event images cache: ~50KB (20 events)
- Saved events: ~1KB (50 event IDs)
- Questionnaire answers: ~0.5KB per category
- Other preferences: ~2KB
- **Total:** ~60-100KB per user

**Status:** ✅ Well within 5-10MB localStorage limit

