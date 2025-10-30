# Business Owner Notifications - Code Reference
**Date:** October 27, 2025

## Quick Reference: Where Notifications Are Sent

### 📍 Application Approved
**File:** `src/utils/adminBusinessApplicationUtils.ts`  
**Lines:** 236-259  
**Function:** `approveApplication()`

```typescript:236:259:src/utils/adminBusinessApplicationUtils.ts
// Send notification to the applicant if they have a user account
if (ownerUserId) {
  try {
    const notificationTitle = '✅ Business Application Approved!'
    const notificationMessage = `Great news! Your application for "${businessName}" has been approved and your business listing has been created. You can now manage it from your account.`
    
    console.log('[Admin] Sending approval notification to user:', ownerUserId)
    
    const { error: notifError } = await supabase.from('user_notifications').insert({
      user_id: ownerUserId,
      title: notificationTitle,
      message: notificationMessage,
      type: 'application_approved',
      metadata: {}
    })
    
    if (notifError) {
      console.error('[Admin] ❌ Failed to insert approval notification:', notifError)
    }
    
    console.log('[Admin] ✅ Approval notification sent')
  } catch (err) {
    console.error('[Admin] Failed to send approval notification:', err)
    // Don't fail the approval just because notification failed
  }
}
```

**Trigger:** Admin clicks "Approve" button on business application  
**Recipient:** User account with matching email  
**Notification Type:** `application_approved`

---

### 📍 Application Rejected
**File:** `src/utils/adminBusinessApplicationUtils.ts`  
**Lines:** 318-354  
**Function:** `deleteApplication()`

```typescript:318:354:src/utils/adminBusinessApplicationUtils.ts
// Send notification to the applicant if they have a user account
if (app.email) {
  try {
    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', app.email)
      .single()
    
    if (profile) {
      const notificationTitle = '❌ Business Application Rejected'
      const notificationMessage = reason 
        ? `Your application for "${app.business_name || 'your business'}" was rejected. Reason: ${reason}\n\nYou can submit a new application after addressing these concerns.`
        : `Your application for "${app.business_name || 'your business'}" was rejected. Please contact us if you have questions.`
      
      console.log('[Admin] Sending rejection notification to user:', profile.id)
      
      const { error: notifError } = await supabase.from('user_notifications').insert({
        user_id: profile.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'application_rejected',
        metadata: { reason: reason || 'No reason provided' }
      })
      
      if (notifError) {
        console.error('[Admin] ❌ Failed to insert rejection notification:', notifError)
      } else {
        console.log('[Admin] ✅ Rejection notification sent')
      }
    }
  } catch (err) {
    console.error('[Admin] Failed to send rejection notification:', err)
    // Don't fail the rejection just because notification failed
  }
}
```

**Trigger:** Admin clicks "Reject" button and provides reason  
**Recipient:** User account with matching email  
**Notification Type:** `application_rejected`  
**Metadata:** Includes rejection reason

---

### 📍 Featured Upgrade Approved
**File:** `src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx`  
**Lines:** 153-232  
**Function:** `approveChangeRequest()`

```typescript:205:219:src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx
if (req.type === 'feature_request') {
  notificationTitle = '✅ Featured Listing Approved!'
  notificationMessage = `Your request to upgrade "${req.providers?.name || 'your business'}" to Featured status has been approved. Your listing will now appear at the top of search results!`
} else if (req.type === 'claim') {
  notificationTitle = '✅ Business Claim Approved'
  notificationMessage = `Your claim for "${req.providers?.name || 'the business'}" has been approved. You now have full control of this listing.`
} else if (req.type === 'delete') {
  notificationTitle = '✅ Deletion Request Approved'
  notificationMessage = `Your request to delete "${req.providers?.name || 'your business'}" has been processed.`
} else {
  notificationTitle = '✅ Change Approved'
  notificationMessage = `Your requested changes to "${req.providers?.name || 'your business'}" have been approved and applied.`
}

await notifyUser(req.owner_user_id, notificationTitle, notificationMessage, { reqId: req.id })
```

**Trigger:** Admin clicks "✅ Approve" button on featured upgrade request  
**Recipient:** Provider owner (`provider_change_requests.owner_user_id`)  
**Notification Type:** `change_request`  
**Metadata:** Includes request ID

---

### 📍 Featured Upgrade Rejected
**File:** `src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx`  
**Lines:** 237-284  
**Function:** `rejectChangeRequest()`

```typescript:253:275:src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx
if (req.type === 'feature_request') {
  notificationTitle = '❌ Featured Listing Request Rejected'
  notificationMessage = reason 
    ? `Your request to upgrade "${req.providers?.name || 'your business'}" to Featured was rejected. Reason: ${reason}`
    : `Your request to upgrade "${req.providers?.name || 'your business'}" to Featured was rejected.`
} else if (req.type === 'claim') {
  notificationTitle = '❌ Business Claim Rejected'
  notificationMessage = reason
    ? `Your claim for "${req.providers?.name || 'the business'}" was rejected. Reason: ${reason}`
    : `Your claim for "${req.providers?.name || 'the business'}" was rejected.`
} else if (req.type === 'delete') {
  notificationTitle = '❌ Deletion Request Rejected'
  notificationMessage = reason
    ? `Your request to delete "${req.providers?.name || 'your business'}" was rejected. Reason: ${reason}`
    : `Your request to delete "${req.providers?.name || 'your business'}" was rejected.`
} else {
  notificationTitle = '❌ Change Request Rejected'
  notificationMessage = reason
    ? `Your requested changes to "${req.providers?.name || 'your business'}" were rejected. Reason: ${reason}`
    : `Your requested changes to "${req.providers?.name || 'your business'}" were rejected.`
}

await notifyUser(req.owner_user_id, notificationTitle, notificationMessage, { reqId: req.id })
```

**Trigger:** Admin clicks "❌ Reject" button and provides reason (inline form)  
**Recipient:** Provider owner (`provider_change_requests.owner_user_id`)  
**Notification Type:** `change_request`  
**Metadata:** Includes request ID and rejection reason

---

## Helper Function: notifyUser()

**File:** `src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx`  
**Lines:** 123-148

```typescript:123:148:src/components/admin/sections/ChangeRequestsSection-2025-10-19.tsx
const notifyUser = async (user_id: string | null | undefined, title: string, message?: string, metadata?: any) => {
  if (!user_id) {
    console.warn('[ChangeRequestsSection] Cannot send notification - no user_id')
    return
  }
  
  try { 
    console.log('[ChangeRequestsSection] Sending notification:', { user_id, title, message })
    
    const { data, error } = await supabase.from('user_notifications').insert([{ 
      user_id, 
      title, 
      message: message || title,
      type: 'change_request',
      metadata: metadata || null 
    }]).select()
    
    if (error) {
      console.error('[ChangeRequestsSection] ❌ Failed to insert notification:', error)
    } else {
      console.log('[ChangeRequestsSection] ✅ Notification sent successfully:', data)
    }
  } catch (err) {
    console.error('[ChangeRequestsSection] ❌ Exception sending notification:', err)
  }
}
```

This helper function is used for ALL change request notifications (featured requests, claims, updates, deletions).

---

## Notification Display

### NotificationBell Component
**File:** `src/components/NotificationBell.tsx`  
**Purpose:** Displays notification bell icon with unread count

**Key Features:**
- Real-time updates via Supabase subscription
- Shows unread notification count
- Dropdown with notification list
- Mark as read functionality

### Real-time Subscription
```typescript
.channel('user_notifications_changes')
.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'user_notifications',
    filter: `user_id=eq.${userId}`
  },
  (payload) => {
    // Refresh notifications when database changes
  }
)
.subscribe()
```

---

## Debugging Notifications

### Check if notification was sent (Console Logs)

**Application Approved:**
```
[Admin] Sending approval notification to user: <user_id>
[Admin] ✅ Approval notification sent
```

**Application Rejected:**
```
[Admin] Sending rejection notification to user: <user_id>
[Admin] ✅ Rejection notification sent
```

**Change Request (Featured, Claim, Update, Delete):**
```
[ChangeRequestsSection] Sending notification: { user_id, title, message }
[ChangeRequestsSection] ✅ Notification sent successfully
```

### Check for errors (Console Logs)

```
[Admin] ❌ Failed to insert approval notification: <error>
[Admin] ❌ Failed to insert rejection notification: <error>
[ChangeRequestsSection] ❌ Failed to insert notification: <error>
[ChangeRequestsSection] ❌ Exception sending notification: <error>
```

### Common error messages:

1. **"column metadata does not exist"**
   - Fix: Run `fix-notification-metadata-column.sql`

2. **"permission denied for table user_notifications"**
   - Fix: Run `fix-notification-rls-policies.sql`

3. **"Cannot send notification - no user_id"**
   - Problem: User account doesn't exist or email doesn't match
   - Fix: Ensure user has registered account with same email as application

4. **"Failed to find owner user"**
   - Problem: Provider doesn't have owner_user_id set
   - Fix: Link provider to user account

---

## Testing Checklist

### For Each Notification Type:

1. ✅ Check browser console for success/error logs
2. ✅ Query database to verify notification record exists
3. ✅ Verify notification bell shows unread count
4. ✅ Click bell to see notification in dropdown
5. ✅ Verify notification has correct title and message
6. ✅ Click notification to mark as read
7. ✅ Verify unread count decreases

### Database Verification Queries:

```sql
-- Check if notification was created
SELECT * FROM user_notifications 
WHERE user_id = '<user_id>' 
ORDER BY created_at DESC 
LIMIT 1;

-- Check notification details
SELECT 
  type,
  title,
  LEFT(message, 100) as message_preview,
  is_read,
  metadata,
  created_at
FROM user_notifications
WHERE user_id = '<user_id>'
ORDER BY created_at DESC;

-- Check all notifications for a business owner
SELECT 
  n.*,
  p.email
FROM user_notifications n
JOIN profiles p ON p.id = n.user_id
WHERE p.email = '<business_owner_email>'
ORDER BY n.created_at DESC;
```

---

## Summary

**Total Notification Types:** 10

1. ✅ Application Approved
2. ❌ Application Rejected
3. ✅ Featured Upgrade Approved
4. ❌ Featured Upgrade Rejected
5. ✅ Business Claim Approved
6. ❌ Business Claim Rejected
7. ✅ Business Update Approved
8. ❌ Business Update Rejected
9. ✅ Business Deletion Approved
10. ❌ Business Deletion Rejected

**All notifications include:**
- Title (with emoji indicator)
- Detailed message
- Notification type
- Metadata (request ID, reason, etc.)
- Timestamp

**Notifications are delivered via:**
1. Database insert into `user_notifications` table
2. Real-time Supabase subscription updates NotificationBell
3. NotificationBell component displays in UI

**Next Steps:**
1. Run database migration scripts
2. Test one notification flow end-to-end
3. Verify notification appears in bell
4. Check console logs for any errors
5. Query database to confirm records exist

