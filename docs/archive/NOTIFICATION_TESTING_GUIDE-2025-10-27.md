# Business Owner Notification Testing Guide
**Date:** October 27, 2025

## Quick Start: Fix & Test in 5 Minutes

### Step 1: Run Database Migrations (2 minutes)

Open Supabase SQL Editor and run these files **in order**:

1. **`fix-notification-metadata-column.sql`**
   - Adds metadata column to user_notifications table
   - This is required for notifications to work

2. **`fix-notification-rls-policies.sql`**
   - Fixes Row Level Security policies
   - Allows admins to create notifications for business owners

3. **`verify-notification-system.sql`**
   - Run diagnostic queries to verify everything is working
   - Check queries #1, #2, #3, #7, and #8

### Step 2: Test One Complete Flow (3 minutes)

#### Test Business Application Approval

1. **Create a test application:**
   - Go to `/business` page
   - Submit a new business application
   - Use an email that has a registered user account

2. **Approve as admin:**
   - Log in as admin
   - Go to `/admin` page
   - Find the application in "Business Applications" section
   - Click "Approve"

3. **Verify notification:**
   - Log in as the business owner
   - Check the notification bell (top right)
   - Should see: "✅ Business Application Approved!"

4. **Check database:**
   ```sql
   SELECT * FROM user_notifications 
   WHERE type = 'application_approved' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

## All Notification Types & How to Test

### 1. Business Application Approved
- **Admin Action:** Admin.tsx → Business Applications → Approve button
- **Notification Title:** "✅ Business Application Approved!"
- **Expected Recipient:** Application owner (matched by email)
- **Test:** Submit application → Admin approves → Check notification bell

### 2. Business Application Rejected  
- **Admin Action:** Admin.tsx → Business Applications → Reject button
- **Notification Title:** "❌ Business Application Rejected"
- **Expected Recipient:** Application owner (matched by email)
- **Test:** Submit application → Admin rejects → Check notification bell

### 3. Featured Upgrade Approved
- **Admin Action:** Admin.tsx → Change Requests → Featured upgrade → Approve
- **Notification Title:** "✅ Featured Listing Approved!"
- **Expected Recipient:** Provider owner
- **Test:** 
  1. Log in as business owner
  2. Go to `/my-business`
  3. Click "Upgrade to Featured" 
  4. Admin approves the request
  5. Check notification bell

### 4. Featured Upgrade Rejected
- **Admin Action:** Admin.tsx → Change Requests → Featured upgrade → Reject
- **Notification Title:** "❌ Featured Listing Request Rejected"
- **Expected Recipient:** Provider owner
- **Test:** Same as #3 but admin clicks Reject with reason

### 5. Business Information Update Approved
- **Admin Action:** Admin.tsx → Change Requests → Update request → Approve
- **Notification Title:** "✅ Change Approved"
- **Expected Recipient:** Provider owner
- **Test:**
  1. Log in as business owner
  2. Edit business information
  3. Submit changes
  4. Admin approves
  5. Check notification bell

### 6. Business Information Update Rejected
- **Admin Action:** Admin.tsx → Change Requests → Update request → Reject
- **Notification Title:** "❌ Change Request Rejected"
- **Expected Recipient:** Provider owner
- **Test:** Same as #5 but admin clicks Reject with reason

### 7. Business Claim Approved
- **Admin Action:** Admin.tsx → Change Requests → Claim request → Approve
- **Notification Title:** "✅ Business Claim Approved"
- **Expected Recipient:** Claimer user
- **Test:**
  1. User requests to claim an existing business
  2. Admin approves
  3. Check notification bell

### 8. Business Claim Rejected
- **Admin Action:** Admin.tsx → Change Requests → Claim request → Reject
- **Notification Title:** "❌ Business Claim Rejected"
- **Expected Recipient:** Claimer user
- **Test:** Same as #7 but admin clicks Reject with reason

### 9. Business Deletion Approved
- **Admin Action:** Admin.tsx → Change Requests → Delete request → Approve
- **Notification Title:** "✅ Deletion Request Approved"
- **Expected Recipient:** Provider owner
- **Test:**
  1. Business owner requests to delete their listing
  2. Admin approves
  3. Check notification bell

### 10. Business Deletion Rejected
- **Admin Action:** Admin.tsx → Change Requests → Delete request → Reject
- **Notification Title:** "❌ Deletion Request Rejected"
- **Expected Recipient:** Provider owner
- **Test:** Same as #9 but admin clicks Reject with reason

## Troubleshooting

### Notifications Not Showing Up?

#### 1. Check if notification was created in database
```sql
SELECT * FROM user_notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

**If empty:** Notifications are not being inserted. Check:
- Is metadata column added? (Run `fix-notification-metadata-column.sql`)
- Are RLS policies correct? (Run `fix-notification-rls-policies.sql`)
- Is admin user actually admin? Check `profiles.is_admin = true`

**If records exist:** Notifications are being created but not displaying. Check:
- Browser console for JavaScript errors
- NotificationBell component for rendering issues
- Real-time subscription for connection issues

#### 2. Check RLS policies
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'user_notifications' 
AND cmd = 'INSERT';
```

**Expected policies:**
- "Users can insert own notifications"
- "Admins can insert any notification"
- "Service role can insert notifications"

**If missing:** Run `fix-notification-rls-policies.sql`

#### 3. Check metadata column
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_notifications' 
AND column_name = 'metadata';
```

**Expected:** One row with data_type = 'jsonb'

**If empty:** Run `fix-notification-metadata-column.sql`

#### 4. Check admin status
```sql
SELECT email, is_admin 
FROM profiles 
WHERE id = auth.uid();
```

**Expected:** is_admin = true for admin user

**If false:** Update the admin user:
```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'your-admin-email@example.com';
```

#### 5. Check browser console
Open Developer Tools → Console tab

**Look for errors like:**
- ❌ "Failed to insert notification"
- ❌ "permission denied for table user_notifications"
- ❌ "column metadata does not exist"

**If you see these:** Run the migration scripts

#### 6. Check notification bell component
The notification bell should:
- Show a red dot when there are unread notifications
- Display notification count
- Update in real-time when new notifications arrive

**If not working:**
- Check if NotificationBell component is mounted
- Check real-time subscription connection
- Check if user_id matches between profiles and notifications

## Verification Checklist

After running migrations, verify:

- [ ] metadata column exists in user_notifications table
- [ ] RLS policies include "Admins can insert any notification"
- [ ] Admin user has is_admin = true in profiles table
- [ ] At least one notification exists in user_notifications table
- [ ] Notification bell renders in the UI
- [ ] Notification bell shows unread count
- [ ] Clicking notification bell shows notification list
- [ ] Notifications include proper title and message
- [ ] Notifications can be marked as read

## Common Issues & Solutions

### Issue: "column metadata does not exist"
**Solution:** Run `fix-notification-metadata-column.sql`

### Issue: "permission denied for table user_notifications"
**Solution:** Run `fix-notification-rls-policies.sql`

### Issue: Notifications created but not visible
**Solution:** 
1. Check if user_id in notifications matches profiles.id
2. Clear browser cache: `localStorage.clear(); sessionStorage.clear();`
3. Check browser console for JavaScript errors

### Issue: Notification bell doesn't update in real-time
**Solution:**
1. Check if Supabase real-time is enabled for user_notifications table
2. Check browser console for subscription errors
3. Try refreshing the page

### Issue: Admin can't insert notifications for other users
**Solution:**
1. Verify admin has is_admin = true
2. Run `fix-notification-rls-policies.sql`
3. Check that policy "Admins can insert any notification" exists

## Success Criteria

The notification system is working correctly when:

1. ✅ Admin approves application → Business owner sees notification
2. ✅ Admin rejects application → Business owner sees notification with reason
3. ✅ Admin approves featured request → Business owner sees notification
4. ✅ Admin rejects featured request → Business owner sees notification with reason
5. ✅ All notifications appear in notification bell
6. ✅ Notification bell shows correct unread count
7. ✅ Notifications update in real-time without page refresh
8. ✅ Clicking notification marks it as read
9. ✅ Notifications persist across page refreshes
10. ✅ Database queries show proper notification records

## Next Steps

Once you've verified the notification system works:

1. **Consider adding email notifications** for critical events
2. **Add notification preferences** so users can choose what they want to be notified about
3. **Create admin dashboard** to view notification delivery status
4. **Add retry mechanism** for failed notifications
5. **Implement notification templates** for consistency

## Support

If notifications still don't work after following this guide:

1. Run all diagnostic queries in `verify-notification-system.sql`
2. Share the results with the development team
3. Check Supabase logs for any error messages
4. Verify that all migration scripts completed successfully

