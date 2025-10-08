# Calendar RLS Permission Fix

## Problem

You're getting a **403 Forbidden** error when trying to import calendar events:
```
new row violates row-level security policy for table "calendar_events"
```

This happens because:
1. You're using the old deployed version (need to redeploy with fixes)
2. The database RLS policy checks for `role = 'admin'` but your app uses `is_admin` flag

## Solution

### Step 1: Fix Database RLS Policies

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   - Go to **SQL Editor**

2. **Run this SQL:**

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Only admins can insert calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Only admins can update calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Only admins can delete calendar events" ON calendar_events;

-- Create new policies that check is_admin flag
CREATE POLICY "Only admins can insert calendar events" ON calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update calendar events" ON calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete calendar events" ON calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Ensure the is_admin column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;
```

3. **Set yourself as admin:**

```sql
-- Replace with YOUR admin email
UPDATE profiles SET is_admin = true WHERE email = 'justexisted@gmail.com';
```

### Step 2: Deploy the Updated Code

The date parsing fixes are in your local build but not deployed yet.

**Option A: Deploy to Netlify (Recommended)**

```bash
# Push to trigger Netlify deployment
git push origin main
```

Then wait for Netlify to build and deploy (usually 2-3 minutes).

**Option B: Test Locally First**

```bash
# Test locally with the new build
npm run dev
# Open http://localhost:5173
# Try the CSV import
```

### Step 3: Clear Browser Cache

The browser might be caching the old JavaScript file.

1. **Hard refresh:** Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Or clear cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

### Step 4: Test the Import Again

1. Go to your Admin page
2. Open browser console (F12)
3. Try importing your CSV
4. You should now see:
   ```
   Parsing date on line 2: "2025-10-07" -> cleaned: "2025-10-07"
     ✓ Parsed as YYYY-MM-DD: 2025-10-07T12:00:00.000Z
   ✓ Parsed line 2: Event Title
   
   Successfully parsed 18 events
   Successfully added 18 events!
   ```

## Verification Checklist

- [ ] Ran SQL to update RLS policies in Supabase
- [ ] Set is_admin = true for your admin email
- [ ] Pushed code to trigger Netlify deployment
- [ ] Waited for Netlify build to complete
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Console shows new parsing messages with "✓ Parsed as YYYY-MM-DD"
- [ ] Events successfully imported (no 403 error)
- [ ] Calendar page shows events in two sections

## Alternative: Use Service Role Key (Temporary)

If you need to import events immediately while waiting for the above fixes:

1. **Get your Service Role Key from Supabase**
   - Project Settings → API → service_role key (keep this secret!)

2. **Use a script to import directly:**

```typescript
// Quick import script using service role
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY' // This bypasses RLS
)

// Parse your CSV and insert...
const events = [...] // your parsed events
await supabase.from('calendar_events').insert(events)
```

⚠️ **Warning:** Never commit or expose the service role key! It has full database access.

## Why This Happened

1. **RLS Policy Mismatch:**
   - SQL script used: `profiles.role = 'admin'`
   - App actually uses: `profiles.is_admin = true` or email checking
   - These didn't match, so inserts were blocked

2. **Old Deployment:**
   - Date parsing fixes were local only
   - Production still had the old buggy parser
   - Need to deploy to Netlify

## After Fix

Once fixed, you'll be able to:
- ✅ Import regular dated events (`2025-10-07`)
- ✅ Import recurring events ("Annual Event", "Summer 2025")
- ✅ See detailed console logging
- ✅ View events in separate calendar sections

---

**Created:** October 8, 2025  
**Status:** SQL script ready, deployment needed

