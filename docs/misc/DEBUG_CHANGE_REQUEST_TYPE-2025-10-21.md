# Change Request Type Debugging - October 21, 2025

## Issue Report
User reported: "Someone made a request to update their description, not to be featured, yet in the admin page I am seeing a request to be featured from that account."

## Code Analysis

### Change Request Types (from `src/lib/supabaseData.ts`)
- `'update'` - Business listing updates (description, hours, etc.)
- `'delete'` - Delete a business
- `'feature_request'` - Request to become a featured business ($97/year)
- `'claim'` - Claim an existing business

### Where Update Requests Are Created (`src/pages/MyBusiness.tsx:1041-1046`)
```typescript
const { error, id } = await createProviderChangeRequest({
  provider_id: listingId,
  owner_user_id: auth.userId!,
  type: 'update',  // ✅ CORRECT - Set to 'update'
  changes: updates,
  reason: `Business listing update request from ${auth.email}`
})
```

### Where Feature Requests Are Created (`src/pages/MyBusiness.tsx:795-821`)
```typescript
const { error } = await supabase
  .from('provider_change_requests')
  .insert([{
    provider_id: providerId,
    owner_user_id: auth.userId,
    type: 'feature_request',  // ✅ CORRECT - Set to 'feature_request'
    changes: {
      tier: 'featured',
      upgrade_reason: listingId 
        ? 'User requested featured upgrade for specific listing' 
        : 'User requested featured upgrade from subscription selection',
      ...
    },
    status: 'pending'
  }])
```

### Display Logic in Admin (`src/pages/Admin.tsx:1293-1296`)
```typescript
{req.type === 'feature_request' ? 'Featured Upgrade' : 
 req.type === 'update' ? 'Listing Update' : 
 req.type === 'delete' ? 'Listing Deletion' :
 req.type === 'claim' ? 'Business Claim' : req.type}
```

## Possible Root Causes

1. **Database Data Issue**: The request in the database actually has `type='feature_request'` when it should be `type='update'`
   - Could be from an old buggy version
   - Could be manual database manipulation
   - Could be from migration

2. **Multiple Requests**: The same business has BOTH an update request AND a feature request pending
   - User submitted description update (type='update')
   - User also clicked featured upgrade button (type='feature_request')
   - Admin is seeing the feature request notification and thinking it's the update

3. **Display Bug**: Some display logic is incorrectly showing 'feature_request' for 'update' requests
   - Checked all display logic - looks correct
   - Less likely based on code review

## Recommended Fix

Add better differentiation in the admin panel to make it crystal clear what each request contains:

1. For 'update' requests: Show the specific fields being changed
2. For 'feature_request': Show pricing and upgrade benefits
3. Add visual badges/colors to distinguish request types
4. Show the raw `type` field value for debugging
5. Add a "Changes Preview" section showing before/after values


