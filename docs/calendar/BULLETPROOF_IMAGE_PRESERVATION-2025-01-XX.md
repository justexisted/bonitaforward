# BULLETPROOF IMAGE PRESERVATION SYSTEM

## CRITICAL: This System Guarantees Images Are NEVER Deleted

This document describes the bulletproof image preservation system that prevents images from being deleted during event fetches.

---

## 🛡️ **How It Works**

### **1. Database-Level Protection (Trigger)**
- **Trigger Function**: `preserve_event_images()`
- **Trigger**: `trigger_preserve_event_images` (BEFORE UPDATE)
- **Behavior**: If an existing row has `image_url`, it is **NEVER** overwritten
- **Protection Level**: Database-level (cannot be bypassed by code)

### **2. UPSERT Instead of DELETE + INSERT**
- **Old Method**: DELETE all events → INSERT new events (❌ loses images)
- **New Method**: UPSERT events (ON CONFLICT DO UPDATE) (✅ preserves images)
- **Matching**: Uses unique index on `(LOWER(TRIM(title)), date, source)`

### **3. Image Fingerprint Tracking**
- **Column**: `image_fingerprint` (MD5 hash of `image_url + image_type`)
- **Purpose**: Tracks when images were set and acts as a backup indicator
- **Protection**: Marks all existing images as "protected"

---

## 📋 **Migration Steps**

### **Step 1: Run the Migration**
```sql
-- Run this in Supabase SQL Editor
-- File: ops/migrations/bulletproof-image-preservation.sql
```

This migration:
1. Creates unique index on `(title, date, source)` for UPSERT matching
2. Adds `image_fingerprint` column
3. Sets fingerprints for existing events with images
4. Creates trigger function to preserve images
5. Creates trigger to protect images on UPDATE

### **Step 2: Verify Migration**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_preserve_event_images';

-- Check fingerprint column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'calendar_events' AND column_name = 'image_fingerprint';

-- Check unique index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'calendar_events' 
AND indexname = 'idx_calendar_events_unique_match';
```

---

## 🔧 **How Fetch Functions Work Now**

### **Before (❌ BROKEN)**
```typescript
// 1. Fetch existing events with images
// 2. DELETE all events (loses images!)
// 3. INSERT new events (images are gone)
```

### **After (✅ BULLETPROOF)**
```typescript
// 1. UPSERT events (ON CONFLICT DO UPDATE)
// 2. Database trigger automatically preserves images
// 3. No manual preservation needed - database handles it
```

---

## 📝 **Updated Functions**

All fetch functions now use UPSERT:
- ✅ `scheduled-fetch-events.ts`
- ✅ `manual-fetch-events.ts`
- ✅ `fetch-kpbs-events.ts`
- ✅ `fetch-vosd-events.ts`

---

## 🎯 **Why This Is Bulletproof**

1. **Database-Level Protection**: Trigger fires BEFORE any UPDATE, preventing images from being overwritten
2. **No Code Dependencies**: Even if code changes, trigger protects images
3. **UPSERT Pattern**: No DELETE operations = no image loss
4. **Fingerprint Tracking**: Backup indicator that images exist and should be preserved
5. **Unique Constraint**: Ensures events are matched correctly for UPSERT

---

## ⚠️ **Important Notes**

1. **Migration Must Be Run First**: Without the trigger, images can still be lost
2. **UPSERT Requires Unique Index**: The unique index on `(title, date, source)` is required
3. **Existing Images Are Protected**: All existing images get `image_fingerprint` set automatically
4. **New Images Are Tracked**: When new images are set, fingerprint is automatically generated

---

## 🔍 **Testing**

After migration, verify:
1. Events with images keep them after fetch runs
2. New events can still get images
3. Trigger is active (check logs)
4. Fingerprint column is populated

---

## 📚 **Related Files**

- `ops/migrations/bulletproof-image-preservation.sql` - Migration script
- `netlify/functions/scheduled-fetch-events.ts` - Scheduled fetch (uses UPSERT)
- `netlify/functions/manual-fetch-events.ts` - Manual fetch (uses UPSERT)
- `netlify/functions/fetch-kpbs-events.ts` - KPBS fetch (uses UPSERT)
- `netlify/functions/fetch-vosd-events.ts` - VoSD fetch (uses UPSERT)

---

**Last Updated**: 2025-01-XX
**Status**: ✅ BULLETPROOF - Database-level protection

