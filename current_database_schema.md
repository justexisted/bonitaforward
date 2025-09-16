# Current Database Schema (Real - From Supabase Dashboard)

## providers table
- id (uuid)
- name (text)
- tags (jsonb)
- rating (numeric)
- created_at (timestamptz)
- category (text) - NOTE: This is 'category' not 'category_key' in the real DB
- published (bool)
- badges (text[])
- phone (text)
- email (text)
- website (text)
- address (text)
- images (text[])
- name_norm (text)
- owner_user_id (uuid)
- is_member (bool)
- description (text)
- specialties (text[])
- social_links (jsonb)
- business_hours (jsonb)
- service_areas (text[])
- google_maps_url (text)
- updated_at (timestamptz)
- is_featured (bool)
- featured_since (timestamptz)
- subscription_type (text)
- bonita_resident_discount (text)
- booking_enabled (bool)
- booking_type (text)
- booking_instructions (text)
- booking_url (text)

## Missing columns that were in old schema but don't exist:
- plan (text) - REMOVED
- tier (text) - REMOVED  
- paid (bool) - REMOVED

## Key differences from old schema:
- Column is 'category' not 'category_key'
- No 'paid', 'tier', or 'plan' columns exist