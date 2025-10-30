# Database Schema - Production Reference
## ⚠️ READ THIS BEFORE ANY DATABASE OPERATION

This document contains the VERIFIED schema from your live database.

---

## Quick Reference: Column Name Differences

| Table | Category Column | Tags Column | Notes |
|-------|----------------|-------------|-------|
| `business_applications` | `category` | N/A | Plain text, no FK |
| `providers` | `category_key` | `tags` (jsonb) | FK to categories(key) |

**CRITICAL:** Always check which table you're working with!

---

## Table: `business_applications`

### All Columns (in order)
```typescript
interface BusinessApplication {
  id: string                    // uuid, NOT NULL, default: gen_random_uuid()
  full_name: string | null      // text, nullable
  business_name: string | null  // text, nullable
  email: string | null          // text, nullable
  phone: string | null          // text, nullable
  category: string | null       // ⚠️ text, nullable (NOT "category_key")
  challenge: string | null      // text, nullable (stores JSON as string)
  created_at: string            // timestamptz, default: now()
  tier_requested: string        // text, default: 'free'
  status: string                // text, default: 'pending'
}
```

### INSERT Example
```typescript
// ✅ CORRECT
await supabase.from('business_applications').insert({
  full_name: 'John Doe',
  business_name: 'Thai Restaurant',
  email: 'owner@example.com',
  phone: '619-123-4567',
  category: 'restaurants-cafes',  // ⚠️ Use 'category'
  challenge: JSON.stringify({ website: 'https://example.com', tags: ['Thai', 'Casual'] })
})

// ❌ WRONG - Will cause 400 Bad Request
await supabase.from('business_applications').insert({
  category_key: 'restaurants-cafes'  // ❌ Column doesn't exist!
})
```

### SELECT/READ Example
```typescript
// ✅ CORRECT
const { data: apps } = await supabase.from('business_applications').select('*')
console.log(apps[0].category)  // ✅ Access with 'category'

// ❌ WRONG - Will be undefined
console.log(apps[0].category_key)  // ❌ Field doesn't exist!
```

---

## Table: `providers`

### Core Columns
```typescript
interface Provider {
  // Required fields
  id: string                    // uuid, NOT NULL, default: gen_random_uuid()
  name: string                  // text, NOT NULL
  tags: any[]                   // jsonb, NOT NULL, default: []
  published: boolean            // boolean, NOT NULL, default: true
  
  // Optional core fields
  category_key: string | null   // ⚠️ text, nullable (NOT "category")
  rating: number | null         // numeric, nullable
  phone: string | null          // text, nullable
  email: string | null          // text, nullable
  website: string | null        // text, nullable
  address: string | null        // text, nullable
  owner_user_id: string | null  // uuid, nullable, FK to auth.users
  
  // Arrays
  images: string[] | null       // ARRAY, default: {}
  badges: string[] | null       // ARRAY, default: {}
  specialties: string[] | null  // ARRAY, nullable
  service_areas: string[] | null // ARRAY, nullable
  
  // JSONB fields
  social_links: any | null      // jsonb, nullable
  business_hours: any | null    // jsonb, nullable
  
  // Feature/membership fields
  is_member: boolean            // boolean, default: false
  is_featured: boolean          // boolean, default: false
  featured_since: string | null // timestamptz, nullable
  subscription_type: string | null // text, nullable
  bonita_resident_discount: string | null // text, nullable
  
  // Booking fields
  booking_enabled: boolean      // boolean, default: false
  booking_type: string | null   // text, nullable
  booking_instructions: string | null // text, nullable
  booking_url: string | null    // text, nullable
  
  // Metadata
  description: string | null    // text, nullable
  google_maps_url: string | null // text, nullable
  name_norm: string | null      // text, nullable
  created_at: string            // timestamptz, default: now()
  updated_at: string            // timestamptz, default: now()
}
```

### INSERT Example
```typescript
// ✅ CORRECT
await supabase.from('providers').insert({
  name: 'Thai Restaurant',
  category_key: 'restaurants-cafes',  // ⚠️ Use 'category_key'
  tags: ['Thai', 'Casual'],           // ⚠️ JSONB array
  published: false,
  owner_user_id: userId
})

// ❌ WRONG
await supabase.from('providers').insert({
  category: 'restaurants-cafes'  // ❌ Column doesn't exist in providers!
})
```

---

## Table: `provider_change_requests`

### All Columns
```typescript
interface ProviderChangeRequest {
  id: string                    // uuid, NOT NULL
  provider_id: string           // uuid, NOT NULL, FK to providers
  owner_user_id: string         // uuid, NOT NULL, FK to auth.users
  type: string                  // text, NOT NULL (update|delete|feature_request|claim)
  changes: any | null           // jsonb, nullable
  status: string                // text, NOT NULL, default: 'pending'
  reason: string | null         // text, nullable
  created_at: string            // timestamptz, default: now()
  decided_at: string | null     // timestamptz, nullable
}
```

---

## Table: `profiles`

### All Columns
```typescript
interface Profile {
  id: string                    // uuid, NOT NULL, FK to auth.users
  email: string                 // text, NOT NULL, UNIQUE
  name: string | null           // text, nullable
  role: string | null           // text, nullable (business|community)
  created_at: string            // timestamptz, default: now()
  is_admin: boolean             // boolean, default: false
}
```

---

## Table: `user_notifications`

### All Columns
```typescript
interface UserNotification {
  id: string                    // uuid, NOT NULL
  user_id: string               // uuid, NOT NULL, FK to auth.users
  subject: string               // text, NOT NULL
  body: string | null           // text, nullable
  data: any | null              // jsonb, nullable
  read: boolean                 // boolean, default: false
  created_at: string            // timestamptz, default: now()
}
```

⚠️ **Note:** This table was previously called `user_activity` in old code. It's now `user_notifications`.

---

## Data Type Cheat Sheet

| Database Type | TypeScript Type | Insert Example | Notes |
|---------------|----------------|----------------|-------|
| `text` | `string \| null` | `'Hello'` | Plain string |
| `uuid` | `string` | `'a1b2c3d4-...'` | UUID string |
| `boolean` | `boolean` | `true` | true/false |
| `numeric` | `number \| null` | `4.5` | Decimal number |
| `jsonb` | `any \| null` | `{key: 'value'}` | JS object |
| `ARRAY` (text[]) | `string[] \| null` | `['a', 'b']` | JS array |
| `timestamptz` | `string` | `'2025-10-11T...'` | ISO date string |

---

## Common Mapping Patterns

### Form → `business_applications`
```typescript
// User form state
const formData = {
  category_key: 'restaurants-cafes',  // Form uses category_key
  // ... other fields
}

// Database insert
await supabase.from('business_applications').insert({
  category: formData.category_key,  // ⚠️ Map to 'category'
  business_name: formData.name,
  // ...
})
```

### `business_applications` → `providers` (Admin Approval)
```typescript
// Reading from business_applications
const app = businessApplications[0]
console.log(app.category)  // ✅ 'restaurants-cafes'

// Creating provider from application
await supabase.from('providers').insert({
  category_key: app.category,  // ⚠️ Map 'category' → 'category_key'
  name: app.business_name,
  // ...
})
```

---

## Checklist Before ANY Database Operation

### Before Writing Code:
- [ ] Check this document for table name
- [ ] Verify column names exist in target table
- [ ] Confirm data types match
- [ ] Check for required fields (NOT NULL)
- [ ] Verify array vs jsonb vs text

### After Writing Code:
- [ ] Console.log the data object before insert
- [ ] Check browser network tab for actual request
- [ ] Verify 200 OK response (not 400/404)
- [ ] Console.log the response data
- [ ] Confirm fields exist when reading

---

## Verified Schema Data

The JSON data you provided confirms:

### `business_applications` (10 columns total)
1. id (uuid)
2. full_name (text)
3. business_name (text)
4. email (text)
5. phone (text)
6. **category** (text) ⚠️
7. challenge (text)
8. created_at (timestamptz)
9. tier_requested (text)
10. status (text)

### `providers` (27+ columns total)
Includes `category_key` (NOT `category`)

### `user_notifications` (7 columns)
This is the correct table name (NOT `user_activity`)

---

## Summary

✅ **Schema data received and verified**  
✅ **All column names documented**  
✅ **Data types confirmed**  
✅ **Common mappings documented**  
✅ **Reference ready for use**

**This document will be checked before every database operation to prevent schema errors.**

