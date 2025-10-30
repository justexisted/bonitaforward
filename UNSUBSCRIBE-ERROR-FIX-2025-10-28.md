# Unsubscribe Error Fix - 2025-10-28

## ❌ **Problem**

Users trying to unsubscribe from emails were getting this error:

```
We couldn't process your unsubscribe request. Could not find the 'updated_at' 
column of 'profiles' in the schema cache. Please try again or contact support.
```

## 🔍 **Root Cause**

The code was trying to update a non-existent `updated_at` column in the `profiles` table:

```typescript
// ❌ BAD - updated_at doesn't exist in profiles table
const { error } = await supabase
  .from('profiles')
  .update({ 
    email_notifications_enabled: false,
    updated_at: new Date().toISOString()  // <-- This column doesn't exist!
  })
  .eq('id', userId)
```

## ✅ **Solution**

Removed all references to `updated_at` when updating the `profiles` table:

### Files Fixed:

1. **`src/pages/Unsubscribe.tsx`** (line 41)
   - Removed `updated_at` from unsubscribe update

2. **`src/pages/account/dataLoader.ts`** (line 410)
   - Removed `updated_at` from email preferences update

### After Fix:

```typescript
// ✅ GOOD - Only update columns that exist
const { error } = await supabase
  .from('profiles')
  .update({ 
    email_notifications_enabled: false,
    email_unsubscribe_date: new Date().toISOString()
  })
  .eq('id', userId)
```

## 📊 **Impact**

- ✅ Unsubscribe page (`/unsubscribe`) now works correctly
- ✅ Email preferences toggle in Account Settings now works correctly
- ✅ No schema cache errors
- ✅ Users can successfully opt-out of emails

## 🧪 **Testing**

To verify the fix works:

1. **Via Unsubscribe Page:**
   - Go to `/unsubscribe`
   - Enter your email
   - Click "Unsubscribe from Emails"
   - Should see success message

2. **Via Account Settings:**
   - Go to `/account`
   - Scroll to "Email Preferences"
   - Toggle "Account Notifications" off
   - Should see "Email notifications disabled" message

## 🗄️ **Database Schema Note**

The `profiles` table has these email-related columns:
- `email_notifications_enabled` (boolean)
- `marketing_emails_enabled` (boolean)
- `email_consent_date` (timestamp)
- `email_unsubscribe_date` (timestamp)

It does **NOT** have an `updated_at` column. If timestamps are needed in the future, the column must be added to the schema first.

---

**Status:** ✅ **DEPLOYED** - Commit e7c4f04

