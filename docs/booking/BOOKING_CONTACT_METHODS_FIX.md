# Booking Contact Methods Toggle Fix

## Issue
Calendar booking, phone contact, and email contact toggles were not persisting after save. When enabling these toggles and saving the provider, reopening the provider would show them as disabled again.

## Root Cause
The contact method fields (`enable_calendar_booking`, `enable_call_contact`, `enable_email_contact`) had two issues:

1. **Save Operation**: The `saveProvider` function was missing these fields in the `updateData` object, so they were never being sent to the database
2. **Load Operations**: Three separate database queries that load provider data were missing these fields in their SELECT statements:
   - Initial page load (line 1597)
   - Refresh after save (line 2123)
   - Refresh after delete (line 2344)

## Solution Applied

### 1. Added Fields to Save Operation
In the `saveProvider` function (around line 2056), added:
```typescript
// Contact method toggles for booking
enable_calendar_booking: p.enable_calendar_booking ?? false,
enable_call_contact: p.enable_call_contact ?? false,
enable_email_contact: p.enable_email_contact ?? false,
```

### 2. Updated All Provider SELECT Queries
Added the three contact method fields to all provider data SELECT statements:
- **Initial load** (line 1597): Added fields to initial data fetch on admin page mount
- **Post-save refresh** (line 2123): Added fields to refresh query after saving provider
- **Post-delete refresh** (line 2344): Added fields to refresh query after deleting provider

All SELECT statements now include:
```sql
enable_calendar_booking, enable_call_contact, enable_email_contact
```

## Files Modified
- `src/pages/Admin.tsx` - 4 locations updated

## Expected Behavior After Fix
1. ✅ Toggle contact methods (calendar, phone, email) in the Booking System Configuration
2. ✅ Click "Save Changes"
3. ✅ Navigate away or refresh the page
4. ✅ Return to the same provider
5. ✅ Contact method toggles should retain their enabled/disabled state

## Testing
Test the following scenarios:
1. Enable all three contact methods, save, and verify they persist
2. Enable only calendar booking, save, and verify only it persists
3. Disable all contact methods, save, and verify they all stay disabled
4. Toggle each method individually to confirm each one persists independently

## Related Context
- The toggles are always visible in the Booking System Configuration section
- They are disabled if `booking_enabled` is false or if the provider is not a featured member
- An info message displays when booking is disabled: "💡 Enable the booking system above to activate these contact methods"

