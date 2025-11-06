# BULLETPROOF IMAGE PRESERVATION - COMPLETE SETUP INSTRUCTIONS

## ⚠️ CRITICAL: Follow These Steps in Order

These instructions will populate images for ALL events and then protect them from deletion.

---

## 📋 STEP 1: Populate Images for ALL Events

### **What This Does:**
- Populates images for ALL 74 events (not just the 41 that have them)
- Fetches images from Unsplash and stores them in Supabase Storage
- Skips events that already have valid Supabase Storage images

### **How to Run:**

1. **Open Terminal** in your project directory:
   ```powershell
   cd "d:\Bonita Forward\bonita-forward"
   ```

2. **Run the populate script:**
   ```powershell
   npm run populate:event-images
   ```

3. **Wait for completion:**
   - The script will process all events
   - Events with valid Supabase Storage images will be skipped
   - Events without images will get images from Unsplash
   - You should see a summary showing how many events were processed

4. **Verify completion:**
   - Check the console output - it should show "Success: X events"
   - The script will tell you when it's done

### **Expected Output:**
```
🚀 Starting event image population...

📋 Fetching ALL events to populate images...
📊 Found 74 events

[1/74] Processing: "Event Title"
   ✅ Already has valid Supabase Storage image, skipping...

[2/74] Processing: "Another Event"
   📥 Downloading image from Unsplash...
   📤 Uploading to Supabase Storage: event-images/...
   ✅ Image stored in Supabase Storage: ...

==================================================
📊 SUMMARY:
==================================================
✅ Success: 74 events
❌ Errors: 0 events
📈 Total: 74 events
==================================================

✨ Done!
```

---

## 📋 STEP 2: Run the SQL Migration

### **What This Does:**
- Adds `image_fingerprint` column to track protected images
- Creates a database trigger that **NEVER** overwrites existing images
- Creates a unique index for UPSERT matching
- Protects all existing images

### **How to Run:**

1. **Open Supabase Dashboard:**
   - Go to your Supabase project
   - Click on "SQL Editor" in the left sidebar

2. **Open the migration file:**
   - File: `ops/migrations/bulletproof-image-preservation.sql`
   - Copy the ENTIRE contents of the file

3. **Paste into SQL Editor:**
   - Paste the entire SQL script into the SQL Editor
   - Make sure you have the complete script (should be ~70 lines)

4. **Run the migration:**
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Wait for it to complete

5. **Verify the migration:**
   - You should see a result table showing:
     - `status`: "Migration completed successfully"
     - `events_with_images`: Number of events with images
     - `protected_images`: Number of protected images (should match events_with_images)

### **Expected Output:**
```
 status                        | events_with_images | protected_images
-------------------------------+--------------------+------------------
 Migration completed successfully | 74                 | 74
```

---

## ✅ STEP 3: Verify Everything Works

### **Check Images Are Protected:**

1. **Run this query in Supabase SQL Editor:**
   ```sql
   SELECT 
     COUNT(*) as total_events,
     COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE 'linear-gradient%') as events_with_images,
     COUNT(*) FILTER (WHERE image_fingerprint IS NOT NULL) as protected_images
   FROM calendar_events;
   ```

2. **Expected Results:**
   - `total_events`: 74
   - `events_with_images`: 74 (or close to it if some failed)
   - `protected_images`: Should match `events_with_images`

### **Check Trigger Exists:**

1. **Run this query:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_preserve_event_images';
   ```

2. **Expected Results:**
   - Should return 1 row (the trigger exists)

### **Check Unique Index Exists:**

1. **Run this query:**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'calendar_events' 
   AND indexname = 'idx_calendar_events_unique_match';
   ```

2. **Expected Results:**
   - Should return 1 row (the index exists)

---

## 🎯 What Happens Next

After running both steps:

1. **All 74 events will have images** (from Step 1)
2. **All images will be protected** (from Step 2)
3. **Fetch functions will use UPSERT** (already updated in code)
4. **Database trigger will prevent image deletion** (from Step 2)

---

## ⚠️ IMPORTANT NOTES

1. **Run Step 1 FIRST** - Populate images before protecting them
2. **Run Step 2 SECOND** - Protect the images after they're populated
3. **Do NOT skip steps** - Both are required
4. **The migration is idempotent** - Safe to run multiple times (won't break if run twice)

---

## 🐛 Troubleshooting

### **Problem: Populate script fails with "RLS policy blocking update"**
- **Solution**: Make sure `SUPABASE_SERVICE_ROLE_KEY` is in your `.env` file (not `SUPABASE_ANON_KEY`)
- The service role key bypasses RLS policies

### **Problem: Migration fails with "relation already exists"**
- **Solution**: This is fine - the migration uses `IF NOT EXISTS` and `DROP IF EXISTS`, so it's safe to run again

### **Problem: Not all events got images**
- **Solution**: Check the console output - some events might fail if Unsplash API is rate-limited
- You can run the populate script again - it will skip events that already have images

---

**Last Updated**: 2025-01-XX
**Status**: ✅ READY TO RUN

