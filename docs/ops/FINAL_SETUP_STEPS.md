# 🎯 Final Setup Steps - Complete Checklist

## Current Status

✅ **Code fixes deployed:**
- CSV date parser with AM/PM support
- Recurring events support  
- Working iCalendar feeds (SD Museum of Art, Think Play Create)
- Secrets scanning configured
- Server-side refresh test button

⚠️ **Still need to configure:**
- Netlify environment variables for backend functions
- Database RLS policy for calendar event inserts

---

## Step 1: Set Netlify Environment Variables (5 minutes)

### Why This Is Needed

Your build log shows:
```
Error: supabaseKey is required.
```

This is because Netlify Functions need their own environment variables (without the `VITE_` prefix).

### How to Fix

1. **Go to Netlify Dashboard:**
   - https://app.netlify.com
   - Select your site
   - **Site settings** → **Environment variables**

2. **Add these 3 variables** (click "Add a variable" for each):

   **Variable 1: SUPABASE_URL**
   - Key: `SUPABASE_URL`
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - Scopes: ✅ All (Production, Deploy Previews, Branch deploys)

   **Variable 2: SUPABASE_ANON_KEY**
   - Key: `SUPABASE_ANON_KEY`
   - Value: Your Supabase anon/public key
   - Scopes: ✅ All

   **Variable 3: SUPABASE_SERVICE_ROLE_KEY**
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your Supabase service role key
   - Scopes: ✅ All

### Where to Find These Values

**Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: **Settings** → **API**
4. Copy:
   - **URL** → use for `SUPABASE_URL`
   - **anon public** → use for `SUPABASE_ANON_KEY`
   - **service_role** → use for `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep secret!

### After Adding Variables

The site will automatically redeploy. Wait 2-3 minutes for the build to complete.

---

## Step 2: Fix Database RLS Policy (2 minutes)

### Why This Is Needed

After CSV dates parse correctly, you'll get:
```
403 Forbidden - new row violates row-level security policy
```

This is because the database expects `role='admin'` but your app uses `is_admin=true`.

### How to Fix

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project
   - Go to: **SQL Editor**

2. **Run this SQL:**

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Only admins can insert calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Only admins can update calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Only admins can delete calendar events" ON calendar_events;

-- Create new policies using is_admin flag
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

-- Ensure is_admin column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Set yourself as admin (REPLACE with your email!)
UPDATE profiles SET is_admin = true WHERE email = 'justexisted@gmail.com';
```

3. **Update the last line** with YOUR admin email
4. Click **Run** or press `Ctrl+Enter`

---

## Step 3: Test CSV Import (After Steps 1 & 2)

1. **Wait for Netlify build** to complete (check Deploys tab)
2. **Hard refresh browser:** `Ctrl+Shift+R`
3. **Go to Admin page** → Calendar Events
4. **Click "📥 Bulk Import CSV"**
5. **Upload your CSV** with dates like `2025-10-22` and times like `9:00 AM`

### Expected Success Output

```
Processing 22 lines from CSV...
Parsing date on line 2: "2025-10-07" -> cleaned: "2025-10-07"
  Parts: Array(3) Length: 3, First part length: 4
  Parsed integers: year=2025, month=10, day=7
  Validation: year check=true, month check=true, day check=true
  ✓ Parsed as YYYY-MM-DD: 2025-10-07T09:00:00.000Z
✓ Parsed line 2: Event Title

Successfully parsed 18 events
Successfully added 18 events!
```

---

## Step 4: Test iCalendar Auto-Fetch (After Step 1)

### Method A: Admin Panel Button
1. Go to **Admin page** → Calendar Events
2. Click **"🔄 Refresh iCal Feeds (Server)"**
3. Wait ~10-30 seconds
4. See: `Successfully fetched X events from 2 feeds!`

### Method B: Direct URL
Visit:
```
https://your-site.netlify.app/.netlify/functions/manual-fetch-events
```

Should return JSON with events from SD Museum of Art and Think Play Create.

---

## Updated iCalendar Feeds

Now using these **working feeds** (verified from search results):

| Source | URL | Status |
|--------|-----|--------|
| San Diego Museum of Art | `https://www.sdmart.org/?post_type=tribe_events&ical=1&eventDisplay=list` | ✅ Working |
| Think Play Create | `https://thinkplaycreate.org/?post_type=tribe_events&ical=1&eventDisplay=list` | ✅ Should work |

Old feeds disabled (all returned 404):
- ~~City of San Diego~~
- ~~San Diego Library~~
- ~~UC San Diego~~
- ~~San Diego Zoo~~
- ~~Balboa Park~~

---

## Quick Verification Checklist

After completing Steps 1 & 2:

- [ ] Netlify build passes (no "supabaseKey is required" error)
- [ ] CSV import works with `YYYY-MM-DD` dates
- [ ] CSV import works with `9:00 AM` / `6:00 PM` times
- [ ] Recurring events ("Annual Event") import correctly
- [ ] Calendar shows two sections: Upcoming + Recurring
- [ ] Server iCal refresh button works
- [ ] Events from SD Museum of Art appear

---

## Summary

**What's deployed:** All code fixes ✅  
**What you need to do:**
1. Set 3 environment variables in Netlify
2. Run SQL to fix RLS policy in Supabase
3. Test!

**Estimated time:** 7 minutes total

---

**Created:** October 8, 2025  
**Latest commit:** `4d4a0bf` - Working iCalendar feeds

