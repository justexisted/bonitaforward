# Analytics Schema Baseline - October 30, 2025

**Purpose:** This document contains the VERIFIED database schema as of October 30, 2025. All analytics code MUST reference only columns listed here.

**Rule:** If a column is not in this document, it DOES NOT EXIST. Do not assume, do not guess.

---

## `bookings` Table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_email` | text | YES | null | |
| `category` | text | NO | null | |
| `name` | text | NO | null | |
| `notes` | text | YES | null | |
| `answers` | jsonb | YES | null | |
| `status` | text | YES | 'new' | |
| `created_at` | timestamptz | YES | now() | |
| `provider_id` | uuid | YES | null | FK to providers.id |
| `user_id` | uuid | YES | null | |

**Key Observations:**
- ✅ Has `provider_id` - can link bookings to providers
- ✅ Has `user_id` - can link to authenticated users
- ✅ Has `user_email` - can track anonymous bookings
- ❌ NO `booking_date` column - use `created_at` instead
- ❌ NO `phone` column at booking level

---

## `funnel_responses` Table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_email` | text | YES | null | |
| `category` | text | NO | null | |
| `answers` | jsonb | NO | null | |
| `created_at` | timestamptz | YES | now() | |

**Key Observations:**
- ✅ Has `category` - can filter by business category
- ✅ Has `user_email` - can identify respondent
- ❌ NO `provider_id` - we need to add attribution via new table
- ❌ NO `referrer` or `source` columns

---

## `profiles` Table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | null | Primary key |
| `email` | text | NO | null | |
| `name` | text | YES | null | |
| `role` | text | YES | null | |
| `created_at` | timestamptz | YES | now() | |
| `is_admin` | boolean | YES | false | |
| `event_terms_accepted_at` | timestamptz | YES | null | |
| `user_plan_choice` | text | YES | null | |
| `email_notifications_enabled` | boolean | YES | true | |
| `marketing_emails_enabled` | boolean | YES | false | |
| `email_consent_date` | timestamptz | YES | null | |
| `email_unsubscribe_date` | timestamptz | YES | null | |

**Key Observations:**
- ✅ Has `is_admin` - can use for RLS policies
- ✅ Has email preference columns - respect user choices
- ❌ NO `updated_at` column (we learned this the hard way)

---

## `providers` Table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `name` | text | NO | null | |
| `tags` | jsonb | NO | '[]' | |
| `rating` | numeric | YES | null | |
| `created_at` | timestamptz | YES | now() | |
| `category_key` | text | YES | null | FK to categories.key |
| `published` | boolean | NO | true | |
| `badges` | text[] | YES | '{}' | Array type |
| `phone` | text | YES | null | |
| `email` | text | YES | null | |
| `website` | text | YES | null | |
| `address` | text | YES | null | |
| `images` | text[] | YES | '{}' | Array type |
| `name_norm` | text | YES | null | |
| `owner_user_id` | uuid | YES | null | Links to profiles.id |
| `is_member` | boolean | YES | false | Featured status |
| `description` | text | YES | null | |
| `specialties` | text[] | YES | null | Array type |
| `social_links` | jsonb | YES | null | |
| `business_hours` | jsonb | YES | null | |
| `service_areas` | text[] | YES | null | Array type |
| `google_maps_url` | text | YES | null | |
| `updated_at` | timestamptz | YES | now() | |
| `is_featured` | boolean | YES | false | |
| `featured_since` | timestamptz | YES | null | |
| `subscription_type` | text | YES | null | |
| `bonita_resident_discount` | text | YES | null | |
| `booking_enabled` | boolean | YES | false | |
| `booking_type` | text | YES | null | |
| `booking_instructions` | text | YES | null | |
| `booking_url` | text | YES | null | |
| `coupon_code` | text | YES | null | |
| `coupon_discount` | text | YES | null | |
| `coupon_description` | text | YES | null | |
| `coupon_expires_at` | timestamptz | YES | null | |
| `google_calendar_connected` | boolean | YES | false | |
| `google_calendar_id` | varchar(255) | YES | null | |
| `google_access_token` | text | YES | null | |
| `google_refresh_token` | text | YES | null | |
| `google_token_expires_at` | timestamptz | YES | null | |
| `google_calendar_sync_enabled` | boolean | YES | false | |
| `enable_calendar_booking` | boolean | YES | false | |
| `enable_call_contact` | boolean | YES | true | |
| `enable_email_contact` | boolean | YES | true | |

**Key Observations:**
- ✅ Has `owner_user_id` - can link to profiles for RLS
- ✅ Has `is_member` - can filter featured listings
- ✅ Has `phone`, `email`, `website` - can track contact clicks
- ✅ Has contact method toggles - respect business preferences
- ❌ NO `category` column - use `category_key` instead

---

## `user_saved_events` Table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `user_id` | uuid | NO | null | |
| `event_id` | text | NO | null | |
| `created_at` | timestamptz | YES | now() | |

**Key Observations:**
- ✅ Has `user_id` and `event_id` - can track event saves
- ❌ This is for calendar events, NOT provider saves

---

## Foreign Key Relationships (Verified)

```
bookings.provider_id → providers.id
providers.category_key → categories.key
```

---

## What This Means for Analytics

### ✅ We CAN Track:

1. **Listing Views:**
   - Track by `provider_id`
   - Link to owner via `providers.owner_user_id`

2. **Contact Clicks:**
   - Phone clicks (when `providers.phone` exists AND `providers.enable_call_contact = true`)
   - Website clicks (when `providers.website` exists)
   - Email clicks (when `providers.email` exists AND `providers.enable_email_contact = true`)

3. **Booking Attribution:**
   - `bookings.provider_id` already exists
   - Can link bookings to providers

4. **Funnel Attribution:**
   - Need NEW table (no existing link between funnel_responses and providers)

### ❌ Columns That DON'T EXIST (Do Not Reference):

- ~~`bookings.booking_date`~~ (use `created_at` instead)
- ~~`bookings.phone`~~ (use `user_email` only)
- ~~`funnel_responses.provider_id`~~ (doesn't exist, need attribution table)
- ~~`providers.category`~~ (use `category_key` instead)
- ~~`profiles.updated_at`~~ (doesn't exist)

---

## Timestamp Fields Summary

All tables use consistent timestamp naming:
- `created_at` (timestamptz, default now())
- `updated_at` (only in providers table)

**Never reference:** `date`, `timestamp`, `updated`, or any other variant.

---

## Next Step

With this verified schema, I can now design analytics tables that:
1. Only reference columns that ACTUALLY exist
2. Use correct data types
3. Follow existing naming conventions
4. Work with current RLS patterns

**Ready to proceed to table design?**

