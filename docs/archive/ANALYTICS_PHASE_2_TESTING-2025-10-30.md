# Analytics Phase 2 Testing Guide
**Created:** 2025-10-30  
**Status:** Ready for testing

## ✅ Phase 2: Complete Implementation

All tracking features are implemented and ready to test.

---

## 📋 Test Checklist

### 1. **View Tracking** ✅
**Location:** ProviderPage.tsx lines 214-256

**Test Steps:**
1. Visit any provider page (e.g., `/provider/xxx`)
2. Open browser console
3. Look for: `[Analytics] View tracked for: [Provider Name]`
4. Check database:
```sql
SELECT * FROM listing_analytics 
WHERE event_type = 'view' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- One view per session per provider
- No duplicates (protected by `useRef` and `sessionStorage`)
- Contains: `provider_id`, `session_id`, `user_id` (if logged in), `metadata`

---

### 2. **Phone Click Tracking** ✅
**Location:** ProviderPage.tsx lines 141-154

**Test Steps:**
1. Visit provider page with phone number
2. Click the phone number link
3. Check console for: `[Analytics] Phone click tracked for: [Provider Name]`
4. Check database:
```sql
SELECT * FROM listing_analytics 
WHERE event_type = 'phone_click' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- Each click creates a new record
- Metadata includes: `category`, `is_featured`, `phone`

---

### 3. **Website Click Tracking** ✅
**Location:** ProviderPage.tsx lines 160-173

**Test Steps:**
1. Visit provider page with website
2. Click "Visit Website" link
3. Check console for: `[Analytics] Website click tracked for: [Provider Name]`
4. Check database:
```sql
SELECT * FROM listing_analytics 
WHERE event_type = 'website_click' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- Each click creates a new record
- Metadata includes: `category`, `is_featured`, `website`

---

### 4. **Save Tracking** ✅
**Location:** ProviderPage.tsx lines 282-291

**Test Steps:**
1. **Login first** (only authenticated users can save)
2. Visit provider page
3. Click "Save Business" button
4. Check console for: `[Analytics] Save tracked for: [Provider Name]`
5. Check database:
```sql
SELECT * FROM listing_analytics 
WHERE event_type = 'save' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- Only tracks "save" action (not "unsave")
- Requires authentication
- Metadata includes: `category`, `is_featured`

---

### 5. **Funnel Attribution** ✅
**Location:** Funnel.tsx lines 89-100

**Test Steps:**
1. Visit a provider page (stores `last_viewed_provider` in sessionStorage)
2. Within 60 minutes, go to a category page and submit the funnel
3. Check console for: `[Analytics] Funnel attributed to provider: [Provider ID]`
4. Check database:
```sql
SELECT fa.*, fr.category, fr.user_email
FROM funnel_attribution fa
JOIN funnel_responses fr ON fa.funnel_response_id = fr.id
WHERE fa.provider_id IS NOT NULL
ORDER BY fa.created_at DESC
LIMIT 5;
```

**Expected:**
- If viewed provider within 60 minutes → `provider_id` is set
- If no recent view → `provider_id` is NULL (direct submission)
- Each funnel response can only have ONE attribution (unique constraint)

**Test Edge Cases:**
- Submit funnel without viewing any provider → `provider_id` should be NULL
- Wait 61 minutes after viewing provider → `provider_id` should be NULL
- View multiple providers → Last viewed provider wins

---

### 6. **Booking Attribution** ✅
**Location:** ProviderPage.tsx lines 336-345

**Test Steps:**
1. Visit provider page with booking enabled
2. Create a booking through the calendar modal
3. Check console for: `[Analytics] Booking attributed to provider: [Provider ID]`
4. Check database:
```sql
SELECT ba.*, be.customer_name, be.customer_email, be.booking_date
FROM booking_attribution ba
JOIN booking_events be ON ba.booking_id = be.id
WHERE ba.provider_id IS NOT NULL
ORDER BY ba.created_at DESC
LIMIT 5;
```

**Expected:**
- Source: `listing_view` (booking from provider page)
- `provider_id` is set
- Each booking can only have ONE attribution (unique constraint)

**Other booking sources:**
- `search` - from search results
- `direct` - direct URL access
- `calendar` - from calendar events page

---

## 🔍 Database Verification Queries

### Get All Analytics for a Provider
```sql
SELECT 
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM listing_analytics
WHERE provider_id = 'YOUR_PROVIDER_ID'
GROUP BY event_type
ORDER BY count DESC;
```

### Get Funnel Attribution Summary
```sql
SELECT 
  p.name as provider_name,
  COUNT(fa.id) as attributed_funnels
FROM funnel_attribution fa
JOIN providers p ON fa.provider_id = p.id
GROUP BY p.id, p.name
ORDER BY attributed_funnels DESC;
```

### Get Booking Attribution Summary
```sql
SELECT 
  p.name as provider_name,
  ba.source,
  COUNT(ba.id) as booking_count
FROM booking_attribution ba
JOIN providers p ON ba.provider_id = p.id
GROUP BY p.id, p.name, ba.source
ORDER BY booking_count DESC;
```

### Check for Duplicates (Should be 0)
```sql
SELECT 
  provider_id,
  session_id,
  user_id,
  event_type,
  COUNT(*) as duplicate_count
FROM listing_analytics
WHERE event_type = 'view'
GROUP BY provider_id, session_id, user_id, event_type
HAVING COUNT(*) > 1;
```

---

## 🐛 Known Issues & Fixes

### Issue: Duplicate Views in Development
**Cause:** React StrictMode runs effects twice
**Fix:** `useRef` prevents concurrent tracking (lines 106, 226-229)
**Status:** ✅ Fixed

### Issue: "updated_at column not found"
**Cause:** Schema mismatch in profiles table
**Fix:** Removed references to non-existent column
**Status:** ✅ Fixed

### Issue: RLS policy violations
**Cause:** Missing or incorrect policies
**Fix:** `enable-analytics-rls.sql` creates proper policies
**Status:** ✅ Fixed

---

## 📈 Next Steps: Phase 3 - Analytics Dashboard

**Goal:** Display analytics in `/my-business` page

**Features to build:**
1. Summary cards (views, clicks, saves, conversions)
2. Date range picker
3. Event type breakdown chart
4. Funnel responses list (attributed to this listing)
5. Booking conversion metrics
6. Export to CSV

**Estimated Time:** 3-4 hours

---

## 🔐 Security Notes

**RLS Policies:**
- ✅ Anyone can INSERT tracking events (anonymous OK)
- ✅ Owners can SELECT their own analytics
- ✅ Admins can SELECT all analytics
- ✅ Only admins can DELETE analytics

**Privacy:**
- ✅ User IDs only stored if logged in
- ✅ Session IDs are anonymous (cleared on tab close)
- ✅ Referrer is stored as DOMAIN only (not full URL)
- ✅ User agent stored for analytics (can be redacted if needed)

---

## ✅ Test Results

| Feature | Tested | Status | Notes |
|---------|--------|--------|-------|
| View Tracking | ⏳ | Pending | |
| Phone Click | ⏳ | Pending | |
| Website Click | ⏳ | Pending | |
| Save Tracking | ⏳ | Pending | |
| Funnel Attribution | ⏳ | Pending | |
| Booking Attribution | ⏳ | Pending | |

**Instructions:** Update this table as you test each feature.

---

## 📞 Support

If you encounter issues:
1. Check browser console for `[Analytics]` logs
2. Verify RLS policies are enabled: `enable-analytics-rls.sql`
3. Check database for data: queries above
4. Clear sessionStorage: `sessionStorage.clear()` in console
5. Review RLS-MASTER-GUIDE-2025-10-28.md for RLS debugging


