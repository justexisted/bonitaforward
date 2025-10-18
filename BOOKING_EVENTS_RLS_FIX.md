# Booking Events RLS Permission Fix

## Problem

Admin panel getting permission error when trying to fetch booking events:

```
GET .../booking_events?select=...  403 (Forbidden)
Error: {code: '42501', message: 'permission denied for table users'}
```

## Root Cause

The `booking_events` table has RLS (Row Level Security) policies that only allow:
1. ✅ Customers to view their own bookings
2. ✅ Business owners to view their bookings  
3. ❌ **NO policy for admin users to view ALL bookings**

### Current RLS Policies on `booking_events`

```sql
-- Customers can view own bookings
CREATE POLICY "Customers can view own bookings" ON public.booking_events
  FOR SELECT USING (
    customer_email = auth.jwt() ->> 'email'
  );

-- Business owners can view bookings for their businesses
CREATE POLICY "Business owners can view their bookings" ON public.booking_events
  FOR SELECT USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );
```

**Missing:** Admin policy to view all bookings!

## Solution

### Option 1: Add Admin RLS Policy (Recommended)

Run the SQL file `fix-booking-events-admin-access.sql` in your Supabase SQL Editor:

```sql
-- 1. Create admin check function (if not exists)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
    'justexisted@gmail.com',  -- Your admin email
    'your-admin@example.com'  -- Add more as needed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add admin SELECT policy
CREATE POLICY "Admins can view all bookings" 
ON public.booking_events
FOR SELECT
USING (is_admin_user());

-- 3. Add admin UPDATE policy
CREATE POLICY "Admins can update all bookings"
ON public.booking_events
FOR UPDATE
USING (is_admin_user())
WITH CHECK (is_admin_user());
```

**Remember to update the admin emails in the function!**

### Option 2: Disable RLS Temporarily (Not Recommended)

```sql
ALTER TABLE public.booking_events DISABLE ROW LEVEL SECURITY;
```

⚠️ This removes all security - not recommended for production!

### Option 3: Use Service Role (Already Works)

If you're using the Supabase service role key (not the anon key), the existing policy should work:

```sql
CREATE POLICY "Service role can update bookings" ON public.booking_events
  FOR UPDATE USING (auth.role() = 'service_role');
```

But this requires using the service role key in your admin panel, which is a security risk if exposed to the browser.

## Code Changes Made

Updated `src/services/adminDataService.ts` to handle the permission error gracefully:

### Before
```typescript
if (error) {
  console.error('[AdminDataService] Error fetching booking events:', error)
  throw error
}
```

### After
```typescript
if (error) {
  // RLS permission error - user may not have admin access
  // This is expected if admin RLS policies haven't been set up yet
  console.warn('[AdminDataService] No access to booking events (RLS):', error.message)
  return [] // Return empty array, admin panel will still function
}
```

**Result:** Admin panel loads successfully, just without booking events data (until RLS is fixed)

## Why This Error Mentions "users" Table

The RLS policies use `auth.jwt()` and `auth.uid()` which internally reference the `auth.users` table. When PostgreSQL evaluates these policies, it needs to check the users table, hence the "permission denied for table users" message.

## Impact

### Before Fix
- ❌ Console error: "permission denied for table users"
- ❌ Admin panel may fail to load
- ❌ Booking events not visible

### After Code Fix (Graceful Handling)
- ⚠️ Console warning (not error)
- ✅ Admin panel loads successfully
- ⚠️ Booking events section empty (until SQL fix applied)

### After SQL Fix (Complete Solution)
- ✅ No console warnings
- ✅ Admin panel loads successfully
- ✅ Booking events visible to admins
- ✅ Proper RLS security maintained

## Testing

After applying the SQL fix, verify:

1. **Check policies exist:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'booking_events';
   ```
   Should show the new "Admins can view all bookings" policy

2. **Test query as admin:**
   ```sql
   SELECT * FROM booking_events LIMIT 5;
   ```
   Should return booking events (if any exist)

3. **Check admin panel:**
   - Load admin panel
   - Check console - should have no warnings
   - Check "Booking Events" section - should show data

## Files

- ✅ `fix-booking-events-admin-access.sql` - SQL to add admin policies
- ✅ `src/services/adminDataService.ts` - Graceful error handling
- ✅ `BOOKING_EVENTS_RLS_FIX.md` - This documentation

## Related Files

- `create-booking-events-table.sql` - Original table creation (missing admin policy)
- `fix-booking-rls-policies.sql` - Similar RLS fixes for providers table

## Next Steps

1. **Run the SQL fix** in Supabase SQL Editor:
   - Use `fix-booking-events-admin-access.sql`
   - Update admin emails in the function
   
2. **Verify in console:**
   - Refresh admin panel
   - Check for no warnings
   - Verify booking events load

3. **Test permissions:**
   - Log in as admin
   - Check booking events section
   - Try updating a booking status

---

**Status:** ✅ Code fixed (graceful handling)  
**Database:** ⚠️ SQL fix required  
**Priority:** Medium (admin panel works, just missing booking events data)  
**Action Required:** Run SQL in Supabase Dashboard

