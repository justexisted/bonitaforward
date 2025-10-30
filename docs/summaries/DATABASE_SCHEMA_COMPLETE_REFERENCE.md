# Complete Database Schema Reference

## CRITICAL: Read This Before ANY Database Query

This document maps the ACTUAL database schema to prevent column name mismatches.

---

## Table: `business_applications`

### Actual Database Schema
```sql
CREATE TABLE public.business_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  business_name text,
  email text,
  phone text,
  category text,              -- ⚠️ COLUMN IS "category" NOT "category_key"
  challenge text,
  created_at timestamptz DEFAULT now(),
  tier_requested text DEFAULT 'free',
  status text DEFAULT 'pending'
);
```

### TypeScript Interface (What the code should use)
```typescript
interface BusinessApplication {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  category: string | null      // ⚠️ USE "category" NOT "category_key"
  challenge: string | null
  created_at: string
  tier_requested: string | null
  status: string | null
}
```

### Common Bug Pattern
```typescript
// ❌ WRONG - Will show "-" or undefined
app.category_key

// ✅ CORRECT - Will show actual category
app.category
```

### Where This Data Comes From
1. User submits form in `/my-business` or `/business`
2. Form data has `category_key: 'restaurants-cafes'`
3. We insert into database as:
   ```typescript
   {
     category: formData.category_key  // Map category_key → category
   }
   ```
4. Database stores it in `category` column
5. When we read it back, we must access `app.category`

---

## Table: `providers`

### Actual Database Schema
```sql
CREATE TABLE public.providers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  category_key text,          -- ⚠️ COLUMN IS "category_key" NOT "category"
  phone text,
  email text,
  website text,
  address text,
  tags jsonb DEFAULT '[]',    -- ⚠️ JSONB not text[]
  images text[],              -- ⚠️ text[] not jsonb
  specialties text[],
  social_links jsonb,
  business_hours jsonb,
  service_areas text[],
  owner_user_id uuid,
  published boolean DEFAULT true,
  is_member boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  -- ... other fields
  FOREIGN KEY (category_key) REFERENCES categories(key)
);
```

### TypeScript Interface
```typescript
interface Provider {
  id: string
  name: string
  category_key: string | null  // ⚠️ USE "category_key" NOT "category"
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  tags: any[] | null           // JSONB stored as array
  images: string[] | null      // TEXT ARRAY
  specialties: string[] | null // TEXT ARRAY
  social_links: any | null     // JSONB stored as object
  business_hours: any | null   // JSONB stored as object
  service_areas: string[] | null
  owner_user_id: string | null
  published: boolean
  is_member: boolean
  is_featured: boolean
}
```

---

## Column Name Mapping Table

| Context | Column Name | Data Type | Notes |
|---------|-------------|-----------|-------|
| `business_applications` table | `category` | text | No FK constraint |
| `providers` table | `category_key` | text | Has FK to categories(key) |
| Form input | `category_key` | string | React form state |
| Database insert (applications) | `category` | string | Must map from form |
| Database insert (providers) | `category_key` | string | Direct mapping |

---

## Data Flow Diagram

```
User Form (React)
   ↓
formData.category_key = 'restaurants-cafes'
   ↓
Insert to business_applications
   ↓
{
  category: formData.category_key  // Map here!
}
   ↓
Database stores in `category` column
   ↓
Admin reads application
   ↓
app.category (NOT app.category_key!)  // Access here!
   ↓
Displays: "restaurants-cafes"
```

---

## Questions to Ask Before Database Operations

### Before INSERT:
1. What table am I inserting into?
2. What are the EXACT column names in that table?
3. Does my data object match those column names?
4. Do I need to map any field names?

### Before SELECT/READ:
1. What table am I reading from?
2. What are the EXACT column names returned?
3. Am I accessing fields with the correct names?
4. Am I expecting a field that doesn't exist?

### Before UPDATE:
1. What table am I updating?
2. What columns exist in that table?
3. Do my update fields match the schema?

---

## Information I Need From You

To prevent future errors, please provide:

### 1. Complete Table Schema Dump
```bash
# Run this in Supabase SQL Editor and paste results:
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'business_applications',
    'providers',
    'provider_change_requests',
    'profiles',
    'user_notifications'
  )
ORDER BY table_name, ordinal_position;
```

### 2. Sample Data
```sql
-- Run these and paste 1-2 sample rows:
SELECT * FROM business_applications LIMIT 2;
SELECT * FROM providers LIMIT 2;
```

### 3. Foreign Key Relationships
```sql
-- Run this to see all FK constraints:
SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';
```

### 4. Check Constraints
```sql
-- Run this to see value restrictions:
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK';
```

---

## Quick Fix Checklist

When you report a bug like "category not showing":

1. ✅ Tell me the table name
2. ✅ Show me the console log output (you did this!)
3. ✅ Tell me what you see vs. what you expect
4. ✅ Share the code snippet accessing the data

This allows me to:
- Check actual column names in schema
- Verify data flow mapping
- Fix the exact access pattern
- Add protective comments

---

## Current Known Issues

### Issue: Category shows "-" in admin panel
- **Table**: `business_applications`
- **Bug**: Code accessing `app.category_key` 
- **Fix**: Change to `app.category`
- **Location**: `src/pages/Admin.tsx` line 3063

---

## Next Steps

Please provide the SQL query results above so I can:
1. Verify exact column names across all tables
2. Create accurate TypeScript interfaces
3. Map all data flow transformations
4. Document all FK relationships
5. Create a single source of truth

This will eliminate schema-related bugs permanently.

All columns details:

[
  {
    "table_name": "business_applications",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "business_applications",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "business_applications",
    "column_name": "business_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "business_applications",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "business_applications",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "business_applications",
    "column_name": "category",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "business_applications",
    "column_name": "challenge",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "business_applications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "business_applications",
    "column_name": "tier_requested",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'free'::text"
  },
  {
    "table_name": "business_applications",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'pending'::text"
  },
  {
    "table_name": "profiles",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "profiles",
    "column_name": "is_admin",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "provider_change_requests",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "provider_change_requests",
    "column_name": "provider_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "provider_change_requests",
    "column_name": "owner_user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "provider_change_requests",
    "column_name": "type",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "provider_change_requests",
    "column_name": "changes",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "provider_change_requests",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": "'pending'::text"
  },
  {
    "table_name": "provider_change_requests",
    "column_name": "reason",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "provider_change_requests",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "provider_change_requests",
    "column_name": "decided_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "providers",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "tags",
    "data_type": "jsonb",
    "is_nullable": "NO",
    "column_default": "'[]'::jsonb"
  },
  {
    "table_name": "providers",
    "column_name": "rating",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "providers",
    "column_name": "category_key",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "published",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true"
  },
  {
    "table_name": "providers",
    "column_name": "badges",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": "'{}'::text[]"
  },
  {
    "table_name": "providers",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "website",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "address",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "images",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": "'{}'::text[]"
  },
  {
    "table_name": "providers",
    "column_name": "name_norm",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "owner_user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "is_member",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "providers",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "specialties",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "social_links",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "business_hours",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "service_areas",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "google_maps_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "providers",
    "column_name": "is_featured",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "providers",
    "column_name": "featured_since",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "subscription_type",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "bonita_resident_discount",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "booking_enabled",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "providers",
    "column_name": "booking_type",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "booking_instructions",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "providers",
    "column_name": "booking_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "user_notifications",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "user_notifications",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "user_notifications",
    "column_name": "subject",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "user_notifications",
    "column_name": "body",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "user_notifications",
    "column_name": "data",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "user_notifications",
    "column_name": "read",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "user_notifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]