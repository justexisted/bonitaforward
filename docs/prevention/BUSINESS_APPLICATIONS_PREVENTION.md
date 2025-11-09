# Business Applications Prevention Guide

**Last Updated:** 2025-11-09  
**Primary Incident Window:** Jan 2025 – Nov 2025  
**Scope:** Database policies, admin workflows, applicant visibility, notification delivery.

---

## 1. Executive Summary

Business application failures manifested as missing entries in the `/my-business` dashboard, rejected applications silently disappearing, RLS (Row Level Security) blocks, and duplicate in-app notifications. These issues stemmed from fragmented documentation, inconsistent database policies, and UI flows that diverged from backend expectations. This guide now serves as the **single source of truth** for business-application logic and prevention steps.

---

## 2. Timeline of Key Incidents

| Date | Event | Outcome |
| --- | --- | --- |
| 2025-01-05 | Rejected applications deleted after admin rejection | Users lost audit trail. |
| 2025-01-06 | `decided_at` column referenced but absent | Filtering logic crashed. |
| 2025-01-07 | RLS policies blocked legitimate SELECT queries | `/my-business` tabs showed empty states. |
| 2025-02-10 | INSERT RLS required JWT email | Authenticated submissions intermittently failed. |
| 2025-11-09 | Notifications reappeared after users viewed them | Persistent bell badge caused confusion. |

---

## 3. Root Causes & Resolutions

### 3.1 Application Deletion on Rejection
- **Root Cause:** `deleteApplication()` removed rows after setting `status='rejected'`.  
- **Resolution:** Stop deleting; retain rejected rows for audit & UI.  
- **Files Touched:** `src/utils/adminBusinessApplicationUtils.ts`.

### 3.2 Missing `decided_at` Column
- **Root Cause:** UI components filtered by a non-existent `decided_at`.  
- **Resolution:** Use `created_at` as decision timestamp (optional migration for `decided_at`).  
- **Files Touched:** `HistoricalRequestsTab.tsx`, type definitions.

### 3.3 RLS Policies Blocking Selects
- **Root Cause:** Policies relied on `auth.users` subqueries and case-sensitive comparisons.  
- **Resolution:** Normalize emails using `LOWER(TRIM(auth.jwt()->>'email'))`; add admin `WITH CHECK` policies.  
- **SQL:** `ops/rls/fix-business-applications-select-rls.sql`, see Section 6.2.

### 3.4 INSERT Policy Too Restrictive
- **Root Cause:** Insert policy required authenticated JWT email.  
- **Resolution:** Public `WITH CHECK (true)` insert policy, matching contact form behavior.  
- **SQL:** `ops/rls/fix-business-applications-insert-rls.sql`, see Section 6.1.

### 3.5 Persistent Notifications
- **Root Cause:** Notification bell only stored local state; realtime refresh recreated entries.  
- **Resolution:** LocalStorage persistence (`bf_notification_acknowledged_ids`) + schema-agnostic `.select('*')` queries + metadata normalization.  
- **Files Touched:** `NotificationBell.tsx`, `adminBusinessApplicationUtils.ts`.

---

## 4. Current Architecture & Data Flow

```text
Applicant → business_applications (INSERT policy public)
    ↓
Admin Review (approve/reject) → adminBusinessApplicationUtils.ts
    ↓
Status Update + Notifications (user_notifications table)
    ↓
My Business Dashboard (useBusinessOperations hooks)
    ↓
HistoricalRequestsTab (applications + change requests)
```

**Key Tables**
- `business_applications`: Application source of truth. Columns verified Jan 2025 (no `decided_at`).
- `user_notifications`: Admin → applicant notifications; schema may evolve.
- `dismissed_notifications`: Tracks UI-dismissed system alerts (distinct from bell acknowledgements).

---

## 5. Prevention Checklist

### 5.1 Code Changes
- [ ] Use `query()` utility or `.select('*')` when schema may evolve.  
- [ ] Always persist notification acknowledgements (localStorage/server).  
- [ ] Avoid deleting application rows—mark state via `status`.  
- [ ] Update `HistoricalRequestsTab` when adding new data types/props.  
- [ ] Keep dependency comments current (`NotificationBell`, `adminBusinessApplicationUtils`, `MyBusiness.tsx`).

### 5.2 Database Policies
- [ ] `applications_insert_public` with `WITH CHECK (true)` is present.  
- [ ] `applications_select_owner` uses JWT-based, case-insensitive matching.  
- [ ] Admin SELECT/UPDATE/DELETE policies reference `is_admin_user(auth.uid())`.  
- [ ] Run diagnostic SQL after every RLS change (`ops/rls/DIAGNOSE-BUSINESS-APPLICATIONS-RLS.sql`).

### 5.3 Testing
- [ ] User submits application → appears under Pending Apps in `/account` and `/my-business`.  
- [ ] Admin rejection → row remains, shows in "Recently Rejected".  
- [ ] Admin approval → provider created & notification links to `/my-business`.  
- [ ] Notification bell badge clears permanently after viewing.  
- [ ] RLS check: non-admin cannot read others’ applications; admin can read all.

---

## 6. Policy Reference

### 6.1 INSERT Policy (Public)
```sql
CREATE POLICY "applications_insert_public"
ON public.business_applications FOR INSERT
WITH CHECK (true);
```
- Allows public submissions.
- SELECT/DELETE policies enforce ownership; UPDATE restricted to admins.

### 6.2 SELECT Policy (Owner)
```sql
CREATE POLICY "applications_select_owner"
ON public.business_applications FOR SELECT
USING (
  LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt() ->> 'email')) OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
```
- Primary match via JWT email; fallback retains legacy behavior.

### 6.3 SELECT Policy (Admin)
```sql
CREATE POLICY "applications_select_admin"
ON public.business_applications FOR SELECT
USING (is_admin_user(auth.uid()));
```
- Ensure `is_admin_user()` matches master implementation (user_id parameter).

---

## 7. Notification Handling

### Approved / Rejected Notifications
- Uses `adminBusinessApplicationUtils.ts` to insert rows into `user_notifications`.
- Metadata includes `type`, `link`, optional `link_section`, `reason`.
- **Guideline:** Always populate both `subject/body` and `title/message` to survive schema transitions.

### Bell Component (`NotificationBell.tsx`)
- Uses `.select('*')` and normalizes fields; logs Supabase errors.  
- Acknowledgement set persisted with LocalStorage key `bf_notification_acknowledged_ids`.  
- Auto-acknowledges non-admin notifications when dropdown opens.  
- Admin notifications still marked read via Supabase update.

---

## 8. Related Preventive Docs

- `CASCADING_FAILURES.md` – Section #30 references notification regression.  
- `DEPENDENCY_TRACKING_COMPLETE.md` – Entry #15 (Notification Bell).  
- `BUSINESS_APPLICATIONS_INSERT_RLS_FIX.sql` & `fix-business-applications-select-rls.sql` – Operational scripts.  
- `AUTOMATED_CHECKS.md` – Add future rules to catch direct Supabase queries and missing notification persistence.

---

## 9. Open Follow-ups

| Item | Status | Owner/Notes |
| --- | --- | --- |
| Optional `decided_at` migration | Pending decision | Use `created_at` until schema change desired. |
| Supabase automation for acknowledgements | Backlog | Would sync bell state across devices; low priority. |
| Automated lint rule for `.select('*')` fallback | Not started | Track in `AUTOMATED_CHECKS.md` backlog. |
| Supabase policy audit scripts in CI | Not started | Consider nightly diffusion using existing diagnostic SQL. |

---

## 10. Quick Validation Script (psql)

```sql
-- Verify policies
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'business_applications'
ORDER BY policyname;

-- Count applications per status for a user
SELECT status, COUNT(*)
FROM business_applications
WHERE LOWER(email) = LOWER('owner@example.com')
GROUP BY status;
```

---

## 11. Change Log

- **2025-11-09:** Created consolidated guide; added notification prevention, updated RLS notes.
- **2025-01-10:** Completed code fixes (no longer deleting applications, fallback to `created_at`).

---

This document supersedes:
- `BUSINESS_APPLICATIONS_ROOT_CAUSE_ANALYSIS.md`
- `BUSINESS_APPLICATIONS_COMPLETE_FIX.md`
- `BUSINESS_APPLICATIONS_FIX_APPLIED.md`
- `BUSINESS_APPLICATIONS_INSERT_RLS_FIX.md`

Refer back here for future updates and append new sections as incidents occur.

