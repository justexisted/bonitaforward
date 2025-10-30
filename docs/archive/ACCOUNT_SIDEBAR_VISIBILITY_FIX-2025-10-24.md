# Account Sidebar Visibility Fix
**Date**: October 24, 2025
**Issue**: Business accounts with featured businesses not seeing Business Management & Pending Applications sections

## Problem

### Original Behavior (BROKEN):
```typescript
// Only checked if user had businesses in providers table
const visibleSidebarItems = SIDEBAR_ITEMS.filter(item => {
  if (item.id === 'business' || item.id === 'applications') {
    return data.myBusinesses.length > 0  // ❌ Too restrictive
  }
  return true
})
```

### Issues This Caused:

1. **Featured Business Owners**: If their business was approved but for some reason not showing in `myBusinesses`, they couldn't see these sections
2. **Application Submitters**: Users who submitted applications but haven't been approved yet couldn't see "Pending Applications"
3. **Timing Issues**: If `myBusinesses` loaded slowly or failed, sections would be hidden

---

## Solution

### New Behavior (FIXED):
```typescript
// Check if user has businesses OR applications
const visibleSidebarItems = SIDEBAR_ITEMS.filter(item => {
  if (item.id === 'business' || item.id === 'applications') {
    const hasBusinesses = data.myBusinesses.length > 0
    const hasApplications = data.pendingApps.length > 0
    return hasBusinesses || hasApplications  // ✅ Show if EITHER exists
  }
  return true
})
```

---

## Logic Breakdown

### Show "Business Management" & "Pending Applications" IF:

#### ✅ User has businesses (`myBusinesses.length > 0`)
- Featured businesses in providers table
- Free businesses in providers table
- Any approved listing

#### ✅ OR user has applications (`pendingApps.length > 0`)
- Pending applications
- Approved applications
- Rejected applications

### Hide these sections IF:

#### ❌ User has NO businesses AND NO applications
- Pure community members
- Users who never submitted business applications

---

## User Scenarios

### Scenario 1: Community Member
```
myBusinesses: []
pendingApps: []
Result: Business Management & Pending Applications HIDDEN ✅
```

### Scenario 2: Submitted Application (Pending)
```
myBusinesses: []
pendingApps: [{ id: '123', status: 'pending', ... }]
Result: Business Management & Pending Applications SHOWN ✅
```

### Scenario 3: Approved Free Business
```
myBusinesses: [{ id: 'abc', name: 'My Business', is_member: false }]
pendingApps: [{ id: '123', status: 'approved', ... }]
Result: Business Management & Pending Applications SHOWN ✅
```

### Scenario 4: Approved Featured Business
```
myBusinesses: [{ id: 'xyz', name: 'My Business', is_member: true }]
pendingApps: [{ id: '456', status: 'approved', ... }]
Result: Business Management & Pending Applications SHOWN ✅
```

---

## Debugging Added

Added console logging to help diagnose issues when business accounts don't see their sections:

```typescript
if (!hasBusinesses && !hasApplications && auth.role === 'business') {
  console.log('[Account] Business account but no data:', {
    myBusinesses: data.myBusinesses,
    pendingApps: data.pendingApps,
    userId: auth.userId,
    email: auth.email
  })
}
```

This will help identify:
- Data loading failures
- Missing businesses in database
- RLS policy issues blocking data access

---

## Testing Checklist

### As Community Member:
- ✅ Should NOT see "Business Management"
- ✅ Should NOT see "Pending Applications"

### As Business User (Pending Application):
- ✅ Should see "Business Management"
- ✅ Should see "Pending Applications"
- ✅ Applications section shows pending status

### As Business User (Free Account):
- ✅ Should see "Business Management"
- ✅ Should see "Pending Applications"
- ✅ Business Management shows free tier business

### As Business User (Featured Account):
- ✅ Should see "Business Management"
- ✅ Should see "Pending Applications"
- ✅ Business Management shows featured tier business
- ✅ Can edit business details immediately (no approval needed)

---

## Related Files

- `src/pages/Account.tsx` - Main account page with sidebar filtering logic
- `src/pages/account/dataLoader.ts` - Loads myBusinesses and pendingApps data
- `src/pages/account/constants.ts` - Defines SIDEBAR_ITEMS

---

## Summary

The fix ensures that **any business account holder** (featured or free) will see the Business Management and Pending Applications sections, while **community members** without businesses won't see these sections.

The key change is using **OR logic** instead of **AND logic**:
- OLD: Show only if has businesses ❌
- NEW: Show if has businesses OR has applications ✅

This accommodates all stages of the business account lifecycle:
1. Application submitted → See sections
2. Application approved → See sections  
3. Business listed → See sections
4. Business featured → See sections

