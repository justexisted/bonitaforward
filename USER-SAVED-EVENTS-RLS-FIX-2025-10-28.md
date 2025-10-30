# User Saved Events RLS Fix - 2025-10-28

## 🚨 **Issue**

Users are unable to save events on the calendar page due to RLS (Row-Level Security) policy violation:

```
POST /rest/v1/user_saved_events 403 (Forbidden)
Error: new row violates row-level security policy for table "user_saved_events"
```

---

## 🔍 **Root Cause**

The `user_saved_events` table has RLS enabled but the policies either:
1. Don't exist in production (migrations weren't run)
2. Are misconfigured or conflicting
3. Have overly restrictive conditions

---

## ✅ **Solution**

Run the SQL script `fix-user-saved-events-rls.sql` in your Supabase SQL Editor.

---

## 📋 **What the Fix Does**

### 1. **Diagnoses the Issue**
- Shows all current policies on the table
- Helps identify conflicting or missing policies

### 2. **Cleans Up Old Policies**
- Drops ALL existing policies (including any with old naming)
- Ensures a clean slate

### 3. **Creates New Policies**
- **SELECT Policy**: Users can view their own saved events + Admin access
- **INSERT Policy**: Users can save events to their own account + Admin access
- **DELETE Policy**: Users can unsave their own events + Admin access

### 4. **Verifies the Fix**
- Shows the newly created policies to confirm they're correct

---

## 🔧 **Manual Fix Steps**

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste** the contents of `fix-user-saved-events-rls.sql`

4. **Run the script** (press F5 or click "Run")

5. **Verify**
   - You should see the old policies (if any)
   - Then see 3 new policies created:
     - `user_saved_events_select_own`
     - `user_saved_events_insert_own`
     - `user_saved_events_delete_own`

6. **Test**
   - Go to `/calendar` on your site
   - Try saving an event (click the heart/bookmark icon)
   - It should now work without errors

---

## 🎯 **Policy Details**

### SELECT Policy:
```sql
USING (
  auth.uid() = user_id
  OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)
```
**What it does:** Users can see their own saved events. Admins can see all saved events.

### INSERT Policy:
```sql
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)
```
**What it does:** Users can only save events to their own account (prevents saving to someone else's account). Admins can save events for any user.

### DELETE Policy:
```sql
USING (
  auth.uid() = user_id
  OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)
```
**What it does:** Users can only unsave their own events. Admins can unsave any events.

---

## 📊 **Table Structure**

```sql
CREATE TABLE user_saved_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);
```

- **user_id**: Links to the authenticated user
- **event_id**: The calendar event ID being saved
- **Unique constraint**: Prevents duplicate saves

---

## 🔐 **Security Notes**

1. **User Isolation**: Users can ONLY interact with their own saved events
2. **Admin Access**: Admins can manage all saved events (for support/moderation)
3. **Authentication Required**: All operations require a valid auth.uid()
4. **Cascade Delete**: If a user is deleted, their saved events are automatically removed

---

## 🧪 **Testing**

### Test as Regular User:
1. Sign in as a regular user
2. Go to `/calendar`
3. Click the save/heart icon on any event
4. It should save successfully
5. Refresh the page - the event should still be marked as saved
6. Click the icon again to unsave

### Test as Admin:
1. Sign in as admin
2. You should be able to see all users' saved events (in admin panel if implemented)

### Test Anonymous User:
1. Sign out completely
2. Try to save an event
3. It should fall back to localStorage (no error)

---

## 📱 **Related Files**

- **Database Script**: `fix-user-saved-events-rls.sql`
- **Database Utils**: `src/utils/savedEventsDb.ts`
- **Component Usage**: `src/components/CalendarSection.tsx`

---

## 🔗 **Related Issues**

Similar RLS fixes applied to other tables:
- `booking_events` - See `BOOKING_EVENTS_RLS_FIX.md`
- `user_notifications` - See `NOTIFICATION_FIX_COMPLETE-2025-10-27.md`
- `providers` - See `fix-providers-rls.sql`

---

## ⚠️ **Important Notes**

1. **This fix is safe to run multiple times** - It drops and recreates policies
2. **No data is lost** - Only policies are modified, not table data
3. **Immediate effect** - Changes take effect instantly (no app restart needed)
4. **Production ready** - Safe to run in production

---

**Status:** 🔄 **Ready to Deploy**

**Next Step:** Run `fix-user-saved-events-rls.sql` in Supabase SQL Editor

