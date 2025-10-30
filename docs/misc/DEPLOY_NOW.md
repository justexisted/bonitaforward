# 🚀 Deploy Instructions - Date Import Fix

## Problem You're Seeing

The console shows:
```
Parsing date on line 2: "2025-10-07" -> cleaned: "2025-10-07"
Skipping line 2 with invalid date: "2025-10-07"
```

**This is the OLD deployed version** (`index-CevLYQjv.js`). The fix is ready but not deployed yet!

## ✅ What I Just Fixed

I simplified the date parser to use JavaScript's native `Date` constructor, which natively supports `YYYY-MM-DD` format. The old code had complex regex matching that was rejecting valid dates.

**Latest commit:** `436a716` - "Fix: Simplify date parsing to use native Date parser"

## 🔧 Deploy Steps (2 Methods)

### Method 1: Push and Let Netlify Build (Recommended)

```bash
# Push the latest fix
git push origin main

# Wait 2-3 minutes for Netlify to build and deploy
# Then hard refresh your browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Method 2: Deploy Dist Folder Manually (Faster)

If Netlify deployment is having issues, you can manually deploy the `dist/` folder:

1. **The `dist/` folder is already built** with the latest fix
2. Go to Netlify dashboard → Your site → Deploys
3. Drag and drop the entire `dist/` folder into the deploy zone
4. Wait ~30 seconds for deployment
5. Hard refresh browser: **Ctrl+Shift+R**

## 📋 After Deployment Checklist

1. **Hard refresh your browser** (Ctrl+Shift+R) - This is CRITICAL!
2. **Check console** - Look for new file name (NOT `index-CevLYQjv.js`)
3. **Try CSV import again**
4. **Expected console output:**
   ```
   Parsing date on line 2: "2025-10-22" -> cleaned: "2025-10-22"
     ✓ Parsed using native parser: 2025-10-22T12:00:00.000Z
   ✓ Parsed line 2: Event Title
   
   Successfully parsed 18 events
   ```

## ⚠️ Don't Forget Database Fix

Even after the date parsing works, you'll still get a **403 Forbidden** error unless you fix the database RLS policies.

**Quick fix in Supabase SQL Editor:**

```sql
-- 1. Update RLS policies
DROP POLICY IF EXISTS "Only admins can insert calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Only admins can update calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Only admins can delete calendar events" ON calendar_events;

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

-- 2. Set yourself as admin (replace email)
UPDATE profiles SET is_admin = true WHERE email = 'justexisted@gmail.com';
```

## 🎯 Complete Success Looks Like

```
Processing 22 lines from CSV...
Parsing date on line 2: "2025-10-07" -> cleaned: "2025-10-07"
  ✓ Parsed using native parser: 2025-10-07T12:00:00.000Z
✓ Parsed line 2: Bonita Event Name

Parsing date on line 3: "2025-10-08" -> cleaned: "2025-10-08"
  ✓ Parsed using native parser: 2025-10-08T12:00:00.000Z
✓ Parsed line 3: Another Event

📅 Recurring event detected on line 19: Annual Festival (Annual Event)
✓ Parsed line 19: Annual Festival (Recurring)

Successfully parsed 18 events
Successfully added 18 events!  ← Success!
```

## Files Changed

- ✅ `src/pages/Admin.tsx` - Simplified date parser
- ✅ `src/pages/Calendar.tsx` - Recurring events section
- ✅ `scripts/fix-calendar-rls.sql` - Database fix
- ✅ `dist/` folder already built with fixes

## What Dates Now Work

- ✅ `2025-10-22` (YYYY-MM-DD)
- ✅ `2025-10-07` (YYYY-MM-DD)
- ✅ `10/22/2025` (MM/DD/YYYY)
- ✅ `10/7/2025` (M/D/YYYY)
- ✅ `Annual Event` (recurring)
- ✅ `Summer 2025` (seasonal)

---

**Ready to deploy:** Yes! ✅  
**Build status:** Successful ✅  
**Next step:** Run `git push origin main` OR drag-drop `dist/` folder to Netlify

