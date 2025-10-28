-- ============================================================================
-- AUDIT CURRENT RLS STATE
-- Run this first to understand what we have
-- ============================================================================

SELECT '============================================' as divider;
SELECT 'RLS AUDIT - CURRENT STATE' as title;
SELECT '============================================' as divider;

-- ============================================================================
-- PART 1: WHICH TABLES HAVE RLS ENABLED?
-- ============================================================================

SELECT '1. TABLES WITH RLS ENABLED:' as section;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- ============================================================================
-- PART 2: WHICH TABLES DON'T HAVE RLS? (SECURITY RISK!)
-- ============================================================================

SELECT '2. TABLES WITHOUT RLS (POTENTIAL SECURITY RISK):' as section;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- ============================================================================
-- PART 3: ALL EXISTING POLICIES (THE MESS WE NEED TO CLEAN UP)
-- ============================================================================

SELECT '3. ALL EXISTING RLS POLICIES:' as section;
SELECT 
  tablename,
  policyname,
  cmd as operation,
  permissive,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN substring(qual, 1, 50) || '...'
    ELSE 'No USING clause'
  END as policy_logic_preview
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- PART 4: POLICY COUNT PER TABLE
-- ============================================================================

SELECT '4. POLICY COUNT PER TABLE:' as section;
SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- PART 5: TABLES WITH MISSING DELETE POLICIES (COMMON ISSUE!)
-- ============================================================================

SELECT '5. TABLES WITH MISSING DELETE POLICIES:' as section;
SELECT 
  t.tablename,
  'Missing DELETE policy' as issue
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = t.tablename
      AND p.cmd = 'DELETE'
  )
ORDER BY t.tablename;

-- ============================================================================
-- PART 6: AUTH HELPER FUNCTIONS
-- ============================================================================

SELECT '6. AUTH HELPER FUNCTIONS:' as section;
SELECT 
  routine_name as function_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%admin%'
    OR routine_name LIKE '%auth%'
    OR routine_name LIKE '%user%'
  )
ORDER BY routine_name;

-- ============================================================================
-- PART 7: CURRENT USER CONTEXT (VERIFY AUTH WORKS)
-- ============================================================================

SELECT '7. CURRENT USER CONTEXT:' as section;
SELECT 
  auth.uid() as my_user_id,
  auth.role() as my_role,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'Authenticated'
    ELSE 'Anonymous'
  END as auth_status;

-- ============================================================================
-- PART 8: KEY TABLES SUMMARY
-- ============================================================================

SELECT '8. KEY TABLES SECURITY SUMMARY:' as section;

WITH table_security AS (
  SELECT 
    t.tablename,
    t.rowsecurity as has_rls,
    COUNT(DISTINCT p.policyname) as policy_count,
    COUNT(DISTINCT CASE WHEN p.cmd = 'SELECT' THEN 1 END) > 0 as has_select,
    COUNT(DISTINCT CASE WHEN p.cmd = 'INSERT' THEN 1 END) > 0 as has_insert,
    COUNT(DISTINCT CASE WHEN p.cmd = 'UPDATE' THEN 1 END) > 0 as has_update,
    COUNT(DISTINCT CASE WHEN p.cmd = 'DELETE' THEN 1 END) > 0 as has_delete
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'providers',
      'provider_job_posts',
      'provider_change_requests',
      'business_applications',
      'calendar_events',
      'booking_events',
      'bookings',
      'user_notifications',
      'funnel_responses',
      'contact_leads'
    )
  GROUP BY t.tablename, t.rowsecurity
)
SELECT 
  tablename,
  CASE WHEN has_rls THEN '✓' ELSE '✗' END as rls_enabled,
  policy_count,
  CASE WHEN has_select THEN '✓' ELSE '✗' END as "SELECT",
  CASE WHEN has_insert THEN '✓' ELSE '✗' END as "INSERT",
  CASE WHEN has_update THEN '✓' ELSE '✗' END as "UPDATE",
  CASE WHEN has_delete THEN '✓' ELSE '✗' END as "DELETE",
  CASE 
    WHEN NOT has_rls THEN '🚨 NO RLS!'
    WHEN policy_count = 0 THEN '🚨 NO POLICIES!'
    WHEN NOT has_delete THEN '⚠️ MISSING DELETE'
    WHEN NOT (has_select AND has_insert AND has_update AND has_delete) THEN '⚠️ INCOMPLETE'
    ELSE '✅ COMPLETE'
  END as status
FROM table_security
ORDER BY tablename;

-- ============================================================================
-- PART 9: DUPLICATE/CONFLICTING POLICIES
-- ============================================================================

SELECT '9. DUPLICATE OR CONFLICTING POLICIES:' as section;
SELECT 
  tablename,
  cmd as operation,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 3 THEN '🚨 TOO MANY'
    WHEN COUNT(*) > 2 THEN '⚠️ REVIEW NEEDED'
    ELSE '✓ OK'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, tablename, cmd;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '============================================' as divider;
SELECT 'AUDIT COMPLETE!' as result;
SELECT 'Review the output above to understand current RLS state' as next_step;
SELECT '============================================' as divider;

-- ============================================================================
-- EXPORT FULL POLICY DETAILS (for documentation)
-- ============================================================================

SELECT '10. FULL POLICY DETAILS (for documentation):' as section;
SELECT 
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

