# Testing Netlify Functions - Quick Reference

## The Problem

The `scheduled-fetch-events` function runs every 4 hours automatically, but you need to test it NOW.

## Solution: Use the Manual Trigger

You have a `manual-fetch-events` function that does the EXACT same thing as the scheduled one, but you can trigger it on demand.

## 3 Ways to Test

### Method 1: Admin Panel Button (Easiest) ✅

1. Go to your **Admin page**
2. Scroll to **Calendar Events** section
3. Click the **"🔄 Refresh iCal Feeds (Server)"** button
4. Wait ~10-30 seconds
5. You'll see: `Successfully fetched X events from Y feeds!`

### Method 2: Direct URL

Visit this in your browser:
```
https://your-site.netlify.app/.netlify/functions/manual-fetch-events
```

You'll see a JSON response like:
```json
{
  "success": true,
  "message": "Successfully processed iCalendar feeds",
  "results": [...],
  "processedFeeds": 5,
  "totalEvents": 127,
  "timestamp": "2025-10-08T..."
}
```

### Method 3: Command Line (curl)

```bash
curl https://your-site.netlify.app/.netlify/functions/manual-fetch-events
```

## What It Does

The manual function:
1. Fetches iCalendar feeds from:
   - City of San Diego
   - San Diego Public Library
   - UC San Diego
   - San Diego Zoo
   - Balboa Park

2. Parses events from the .ics files
3. Filters out:
   - Past events (older than 1 day)
   - Far future events (more than 1 year out)

4. Clears old iCalendar events from database
5. Inserts new events
6. Returns summary

## Checking the Logs

### In Netlify Dashboard

1. Go to **Functions** tab
2. Click on `manual-fetch-events`
3. View **Function logs** to see:
   - Which feeds were processed
   - How many events from each
   - Any errors

### In Browser Console

After clicking the button in Admin, check browser console for:
```
Successfully fetched 127 events from 5 feeds!
```

## Environment Variables Required

Remember to set these in Netlify (NOT with VITE_ prefix):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (needed for manual-fetch-events)

## Troubleshooting

### "supabaseKey is required" Error

You're missing environment variables in Netlify. See `NETLIFY_ENV_FIX.md` for instructions.

### "403 Forbidden" Error

The RLS policy needs updating. See `CALENDAR_RLS_FIX.md` for SQL to run.

### No Events Returned

- Check Netlify function logs for errors
- External iCalendar URLs might be down
- Feeds might not have events in the date range (past 1 day to 1 year future)

## Schedule Details

The automatic `scheduled-fetch-events` function:
- **Runs:** Every 4 hours
- **Cron:** `0 */4 * * *` (at :00 minutes: 12am, 4am, 8am, 12pm, 4pm, 8pm)
- **Does:** Same as manual function
- **Can't be tested:** Except by waiting or triggering via Netlify dashboard

## Quick Test Now

**Right now, without waiting:**

1. Click the "🔄 Refresh iCal Feeds (Server)" button in your Admin panel
2. Watch for success message
3. Go to Calendar page to see the imported events

OR

Visit this URL directly:
```
https://your-site.netlify.app/.netlify/functions/manual-fetch-events
```

---

**Updated:** October 8, 2025  
**Status:** Manual trigger function ready to use

