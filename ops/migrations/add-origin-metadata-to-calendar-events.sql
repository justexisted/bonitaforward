-- Track event provenance for deletion and audit
-- Adds columns but does not mutate images or existing ownership triggers

ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS origin_type TEXT CHECK (origin_type IN ('local', 'auto_netlify', 'auto_manual', 'auto_other', 'unknown')),
ADD COLUMN IF NOT EXISTS origin_identifier TEXT;

COMMENT ON COLUMN calendar_events.origin_type IS 'Provenance of event: local submission vs automated job';
COMMENT ON COLUMN calendar_events.origin_identifier IS 'Optional detail about which job/feed created the event';

