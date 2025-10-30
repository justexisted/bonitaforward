# Analytics Update: Enable `save` Events and Confirm RLS

Date: 2025-10-30

## What changed
- Added `save` to allowed `event_type` values in `public.listing_analytics`.
- Confirmed/ensured RLS policies so events insert publicly and owners can read their own analytics.

## DDL applied
```sql
-- Allow 'save' events
ALTER TABLE public.listing_analytics
  DROP CONSTRAINT IF EXISTS listing_analytics_event_type_check;
ALTER TABLE public.listing_analytics
  ADD CONSTRAINT listing_analytics_event_type_check
  CHECK (event_type = ANY (ARRAY['view'::text,'phone_click'::text,'website_click'::text,'save'::text]));

-- RLS for telemetry (idempotent)
ALTER TABLE public.listing_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_analytics_insert_public ON public.listing_analytics;
CREATE POLICY listing_analytics_insert_public
  ON public.listing_analytics
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS listing_analytics_select_owner ON public.listing_analytics;
CREATE POLICY listing_analytics_select_owner
  ON public.listing_analytics
  FOR SELECT
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE owner_user_id = auth.uid())
  );
```

## Owner dashboard impact
- `My Business → Analytics` now includes non-zero counts for `Saves` once users save a business.

## Verification queries
```sql
-- Recent 'save' events
SELECT p.name, la.created_at
FROM public.listing_analytics la
JOIN public.providers p ON p.id = la.provider_id
WHERE la.event_type = 'save'
ORDER BY la.created_at DESC
LIMIT 25;

-- Counts by provider (7 days)
SELECT p.name, COUNT(*) AS saves
FROM public.listing_analytics la
JOIN public.providers p ON p.id = la.provider_id
WHERE la.event_type = 'save' AND la.created_at >= now() - interval '7 days'
GROUP BY p.name
ORDER BY saves DESC, p.name;
```

## Notes
- Frontend already calls `trackListingEvent(provider.id, 'save', ...)` after a successful save.
- No further UI changes required; analytics tables will populate automatically.


