# Event Flags Database Schema

## Overview
This document describes the database table and setup required for the event flagging/reporting feature in Bonita Forward.

## Table: `event_flags`

### Purpose
Stores community reports of calendar events that may violate guidelines or contain inappropriate content.

### Schema

```sql
CREATE TABLE event_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_event_flags_event_id ON event_flags(event_id);
CREATE INDEX idx_event_flags_user_id ON event_flags(user_id);
CREATE INDEX idx_event_flags_created_at ON event_flags(created_at DESC);

-- Unique constraint to prevent duplicate flags from same user
CREATE UNIQUE INDEX idx_event_flags_unique_user_event ON event_flags(event_id, user_id);

-- Foreign key constraint name (for proper joins in queries)
ALTER TABLE event_flags 
  ADD CONSTRAINT event_flags_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
```

### Column Descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key, auto-generated |
| `event_id` | UUID | No | Foreign key to `calendar_events.id` |
| `user_id` | UUID | No | Foreign key to `auth.users.id` (the reporter) |
| `reason` | TEXT | No | Reason code for the flag (see Reason Codes below) |
| `details` | TEXT | Yes | Optional additional context from reporter |
| `created_at` | TIMESTAMPTZ | No | Timestamp when flag was created |
| `updated_at` | TIMESTAMPTZ | Yes | Timestamp of last update |

### Reason Codes

The `reason` field should contain one of these values:

- `spam` - Spam or Commercial Advertisement
- `inappropriate` - Inappropriate or Offensive Content
- `misleading` - Misleading or False Information
- `duplicate` - Duplicate Event
- `wrong-location` - Event Not in Bonita Area
- `cancelled` - Event Has Been Cancelled
- `other` - Other Violation

## Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE event_flags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own flags
CREATE POLICY "Users can create event flags"
  ON event_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own flags
CREATE POLICY "Users can view own flags"
  ON event_flags
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all flags
CREATE POLICY "Admins can view all flags"
  ON event_flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can delete flags (dismiss or when deleting events)
CREATE POLICY "Admins can delete flags"
  ON event_flags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

## Setup Instructions

### 1. Create the Table

Run the CREATE TABLE statement above in your Supabase SQL Editor.

### 2. Set Up Indexes

Run the CREATE INDEX statements to ensure query performance.

### 3. Configure RLS Policies

Run all the RLS policy statements to secure the table.

### 4. Verify Setup

Test the setup with these queries:

```sql
-- Check table exists
SELECT * FROM event_flags LIMIT 1;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'event_flags';

-- Check RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_flags';
```

## Query Examples

### Get all flagged events with details

```sql
SELECT 
  ef.id,
  ef.event_id,
  ef.user_id,
  ef.reason,
  ef.details,
  ef.created_at,
  ce.title as event_title,
  ce.date as event_date,
  p.email as reporter_email
FROM event_flags ef
LEFT JOIN calendar_events ce ON ce.id = ef.event_id
LEFT JOIN profiles p ON p.id = ef.user_id
ORDER BY ef.created_at DESC;
```

### Count flags per event

```sql
SELECT 
  event_id,
  COUNT(*) as flag_count,
  ce.title as event_title
FROM event_flags ef
LEFT JOIN calendar_events ce ON ce.id = ef.event_id
GROUP BY event_id, ce.title
ORDER BY flag_count DESC;
```

### Get recent flags

```sql
SELECT * FROM event_flags
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Integration with Application

### Frontend (Calendar.tsx)
- Users click "Report" button on event
- Modal shows with reason selection and details field
- Checks for duplicate flags before inserting
- Shows confirmation message after submission

### Admin Panel (Admin.tsx)
- "Flagged Events" section shows all reported events
- Displays event details, flag reason, and reporter info
- Two actions available:
  - **Dismiss Flag** - Removes flag but keeps event
  - **Delete Event** - Removes event and all its flags

### Data Flow

```
User Reports Event
       ↓
event_flags table insert
       ↓
Admin views in "Flagged Events" section
       ↓
Admin takes action:
  - Dismiss → DELETE from event_flags WHERE id = flag_id
  - Delete Event → DELETE from calendar_events WHERE id = event_id
                   (CASCADE deletes all related flags)
```

## Maintenance

### Clean up old dismissed flags

```sql
-- Delete flags older than 90 days (if you want to archive)
DELETE FROM event_flags
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Monitor flag frequency

```sql
-- Users who report most frequently
SELECT 
  user_id,
  p.email,
  COUNT(*) as total_flags
FROM event_flags ef
LEFT JOIN profiles p ON p.id = ef.user_id
GROUP BY user_id, p.email
ORDER BY total_flags DESC
LIMIT 10;
```

## Notes

- The CASCADE on DELETE ensures that when an event is deleted, all its flags are automatically removed
- The CASCADE on user deletion ensures flags are removed if a user account is deleted
- The unique constraint prevents spam reporting (one user can only flag an event once)
- Admin queries use JOIN with profiles table to get reporter email addresses

## Troubleshooting

### If flags aren't showing in admin panel:

1. Check RLS policies are correctly set
2. Verify admin user has `role = 'admin'` in profiles table
3. Check that the foreign key constraint name matches the query (`event_flags_user_id_fkey`)

### If users can't create flags:

1. Verify user is authenticated
2. Check INSERT policy allows authenticated users
3. Verify event_id and user_id are valid UUIDs

### If duplicate flag check isn't working:

1. Verify unique index exists: `idx_event_flags_unique_user_event`
2. Check that both event_id and user_id are being passed correctly

