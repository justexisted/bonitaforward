# Featured Account Update Fix

## Issue
The Contact / Get Featured section in the `/admin` page under the Featured tab had issues when updating featured accounts. The `select` statements in `toggleFeaturedStatus` and `updateSubscriptionType` were manually listing column names, missing several fields that exist in the database.

## Problem
**Missing Fields:**
- `published`
- `enable_calendar_booking`
- `enable_call_contact`
- `enable_email_contact`
- `coupon_code`
- `coupon_discount`
- `coupon_description`
- `coupon_expires_at`

**Impact:**
When refreshing provider data after updating featured status or subscription type, these fields would be missing from the refreshed data, causing:
- Data loss on the frontend
- Potential UI breaks in components that expect these fields
- Incomplete provider records in the admin panel

## Solution
Changed hardcoded field lists to `select('*')` in both functions:

### 1. `toggleFeaturedStatus` Function
**Before:**
```typescript
const { data: pData } = await supabase
  .from('providers')
  .select('id, name, category_key, tags, badges, rating, phone, email, website, address, images, owner_user_id, is_member, is_featured, featured_since, subscription_type, created_at, updated_at, description, specialties, social_links, business_hours, service_areas, google_maps_url, bonita_resident_discount, booking_enabled, booking_type, booking_instructions, booking_url')
  .order('name', { ascending: true })
```

**After:**
```typescript
// Refresh providers data - using select('*') to get all fields including newly added ones
const { data: pData } = await supabase
  .from('providers')
  .select('*')
  .order('name', { ascending: true })
```

### 2. `updateSubscriptionType` Function
Same change applied here as well.

## Benefits
✅ **All fields always included** - No more missing data when schema changes  
✅ **Future-proof** - New fields automatically included without code changes  
✅ **Maintainable** - No need to update hardcoded field lists  
✅ **Consistent** - Matches pattern used in other admin data fetching functions

## Testing
After deploying:
1. Go to `/admin`
2. Click "Contact / Get Featured" in the dropdown
3. Toggle featured status on any provider
4. Change subscription type for a featured provider
5. Verify all provider fields remain intact after update

## Files Changed
- `src/pages/Admin.tsx` - Updated `toggleFeaturedStatus` and `updateSubscriptionType` functions

