# Business Application Approval - Tier and Publication Fixes

**Date:** 2025-01-XX  
**Status:** ✅ Fixed

## Summary

Fixed multiple issues with business application approval:
1. Approved businesses not appearing in directory (created with `published: false`)
2. Featured tier not being set on approval (always created as free tier)
3. Duplicate notification messages showing both "under review" and "approved"
4. Featured upgrade approvals not setting both `is_member` and `is_featured`

## Root Cause

1. `approveApplication()` function hardcoded `published: false` instead of `published: true`
2. `approveApplication()` function ignored `tier_requested` field and always set `is_member: false`
3. `ApplicationCard` component always displayed "under review" message regardless of status
4. `ChangeRequestsSection` only set `is_member: true` for featured upgrades, not `is_featured`

## The Fix

1. **Changed `published: false` → `published: true`** in `approveApplication()` so businesses are immediately visible
2. **Added `tier_requested` support** - Sets `is_member` and `is_featured` based on `app.tier_requested`
3. **Added `featured_since` timestamp** for featured tier applications
4. **Fixed notification display** - Made "under review" message conditional (only shows when status is pending)
5. **Fixed featured upgrade approval** - Sets both `is_member` and `is_featured` plus `featured_since` timestamp
6. **Updated email notification** - Uses actual tier instead of always sending 'free'

## Files Changed

- `src/utils/adminBusinessApplicationUtils.ts` - Updated `approveApplication()` function
- `src/pages/MyBusiness/components/ApplicationCard.tsx` - Fixed conditional message display
- `src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx` - Fixed featured upgrade approval

## Prevention Checklist

- ✅ **Always check `tier_requested` field** when approving applications (don't hardcode tier)
- ✅ **Set both `is_member` and `is_featured`** when making featured (keep fields in sync)
- ✅ **Set `featured_since` timestamp** when making featured (for tracking)
- ✅ **Auto-publish approved businesses** unless there's a specific reason not to
- ✅ **Conditional message display** - Only show status messages when they apply
- ✅ **Update email notifications** to use actual tier, not hardcoded values

## Related

- `docs/prevention/CASCADING_FAILURES.md` - Section #29 (to be added)
- `src/utils/adminBusinessApplicationUtils.ts` - Dependency tracking comments added

