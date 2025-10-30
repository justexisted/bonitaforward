# Supabase Schema Reference - ALWAYS CHECK THIS BEFORE INSERTING

## ⚠️ CRITICAL: Column Names Are NOT Consistent Across Tables

### `business_applications` Table
```sql
CREATE TABLE public.business_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text,
  business_name text,
  email text,
  phone text,
  category text,                    -- ⚠️ NOTE: "category" NOT "category_key"
  challenge text,
  created_at timestamptz DEFAULT now(),
  tier_requested text DEFAULT 'free' CHECK (tier_requested IN ('free', 'featured')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);
```

**Key Points:**
- ✅ Column is `category` (NOT `category_key`)
- ✅ No constraints on category values
- ✅ `challenge` is text (can store JSON as string)
- ✅ `tier_requested` and `status` have defaults

---

### `providers` Table
```sql
CREATE TABLE public.providers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  tags jsonb DEFAULT '[]',
  rating numeric,
  created_at timestamptz DEFAULT now(),
  category_key text,                -- ⚠️ NOTE: "category_key" NOT "category"
  published boolean DEFAULT true,
  badges text[] DEFAULT '{}',
  phone text,
  email text,
  website text,
  address text,
  images text[] DEFAULT '{}',
  name_norm text DEFAULT lower(btrim(name)),
  owner_user_id uuid,
  is_member boolean DEFAULT false,
  
  -- Enhanced fields:
  description text,
  specialties text[],
  social_links jsonb,
  business_hours jsonb,
  service_areas text[],
  google_maps_url text,
  updated_at timestamptz DEFAULT now(),
  is_featured boolean DEFAULT false,
  featured_since timestamptz,
  subscription_type text CHECK (subscription_type IN ('monthly', 'yearly')),
  plan text,
  tier text,
  paid boolean DEFAULT false,
  bonita_resident_discount text,
  booking_enabled boolean DEFAULT false,
  booking_type text CHECK (booking_type IN ('appointment', 'reservation', 'consultation', 'walk-in')),
  booking_instructions text,
  booking_url text,
  
  FOREIGN KEY (category_key) REFERENCES categories(key),
  FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
```

**Key Points:**
- ✅ Column is `category_key` (NOT `category`)
- ✅ Foreign key constraint to `categories` table
- ✅ `tags`, `social_links`, `business_hours` are JSONB
- ✅ `images`, `badges`, `specialties`, `service_areas` are TEXT ARRAYS

---

### `provider_change_requests` Table
```sql
CREATE TABLE public.provider_change_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('update', 'delete', 'feature_request', 'claim')),
  changes jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason text,
  created_at timestamptz DEFAULT now(),
  decided_at timestamptz,
  
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
```

---

### `user_notifications` Table (Previously `user_activity`)
```sql
CREATE TABLE public.user_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  subject text NOT NULL,
  body text,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

**Key Points:**
- ⚠️ Table name is `user_notifications` (NOT `user_activity`)
- ✅ `data` field is JSONB for flexible storage

---

### `profiles` Table
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  role text CHECK (role IN ('business', 'community')),
  created_at timestamptz DEFAULT now(),
  is_admin boolean DEFAULT false,
  
  FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

---

## Common Mistakes to Avoid

### ❌ WRONG:
```typescript
// Inserting into business_applications
await supabase.from('business_applications').insert({
  category_key: 'restaurants-cafes'  // ❌ Column doesn't exist!
})

// Querying user_activity
await supabase.from('user_activity')  // ❌ Table doesn't exist!
```

### ✅ CORRECT:
```typescript
// Inserting into business_applications
await supabase.from('business_applications').insert({
  category: 'restaurants-cafes'  // ✅ Correct column name
})

// Querying user notifications
await supabase.from('user_notifications')  // ✅ Correct table name
```

---

## Checklist Before Any Supabase Query

- [ ] Check table name in this document
- [ ] Verify column names match schema
- [ ] Confirm data types (text vs jsonb vs arrays)
- [ ] Check for foreign key constraints
- [ ] Verify CHECK constraints on values
- [ ] Confirm defaults are applied or overridden correctly

---

## Quick Reference - Column Name Differences

| Feature | `business_applications` | `providers` | `provider_change_requests` |
|---------|------------------------|-------------|---------------------------|
| Category | `category` (text) | `category_key` (text, FK) | N/A |
| Tags | N/A | `tags` (jsonb) | N/A |
| Changes | `challenge` (text) | N/A | `changes` (jsonb) |
| Status | `status` (text) | `published` (boolean) | `status` (text) |
| Owner | N/A | `owner_user_id` (uuid, FK) | `owner_user_id` (uuid, FK) |

---

## Data Type Quick Reference

- **text**: Plain string
- **jsonb**: JSON object (use JS objects, Supabase converts)
- **text[]**: Array of strings (use JS arrays like `['tag1', 'tag2']`)
- **uuid**: Universal unique identifier
- **timestamptz**: Timestamp with timezone (use ISO strings or Date objects)
- **numeric**: Decimal number
- **boolean**: true/false

---

## Always Remember

1. **`business_applications`** uses `category`
2. **`providers`** uses `category_key`
3. **`user_notifications`** is the correct table (NOT `user_activity`)
4. **Arrays** use `text[]` not `jsonb`
5. **Objects** use `jsonb`

**ALWAYS CHECK THIS DOCUMENT BEFORE WRITING SUPABASE QUERIES!**

