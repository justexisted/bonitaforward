# Centralized Supabase Query Utility

## Overview

This document describes the centralized Supabase query utility (`src/lib/supabaseQuery.ts`) that provides:
- Automatic retry logic for transient errors (network, connection issues)
- Standardized error handling and logging
- Consistent response formats across all queries
- Better error classification (retryable vs non-retryable)

## Status

**Phase 1: Complete** ✅
- Created centralized query utility with retry logic
- Migrated 2 low-risk utility files:
  - `src/utils/planChoiceDb.ts`
  - `src/utils/eventTermsDb.ts`

**Remaining:**
- 440+ queries across 60 files still need migration
- Migration should be done incrementally, testing each file

## Usage

### Basic Query (Chainable API)

The query utility maintains the same chainable API as Supabase:

```typescript
import { query } from '../lib/supabaseQuery'

// Select query
const { data, error } = await query('providers', { logPrefix: '[MyComponent]' })
  .select('*')
  .eq('owner_user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  // Error already logged by query utility with standardized format
  console.error('Failed to fetch providers:', error.message)
  return []
}

return data || []
```

### Helper Functions

For simpler queries, use helper functions:

```typescript
import { selectAll, selectOne, update, insert, deleteRows } from '../lib/supabaseQuery'

// Select all with filters
const providers = await selectAll('providers', 
  { owner_user_id: userId },
  { 
    orderBy: 'created_at', 
    ascending: false,
    limit: 10,
    logPrefix: '[MyComponent]'
  }
)

// Select single record
const profile = await selectOne('profiles', { id: userId })

// Update
const result = await update('profiles', 
  { name: 'New Name' }, 
  { id: userId },
  { logPrefix: '[MyComponent]' }
)

// Insert
const result = await insert('providers', providerData)

// Delete
const result = await deleteRows('providers', { id: providerId })
```

## Error Handling

### Error Classification

The utility automatically classifies errors:

**Retryable Errors (automatic retry with exponential backoff):**
- Network errors (fetch failed, timeout)
- Connection errors (ECONNREFUSED, ETIMEDOUT)
- Transient database errors (5xx, connection pool exhausted)

**Non-Retryable Errors (returned immediately):**
- RLS permission errors (403, PGRST301)
- Validation errors (400, unique constraint violations)
- No rows found (PGRST116) - not really an error

### Retry Logic

- **Max retries:** 3 (configurable)
- **Backoff strategy:** Exponential (500ms, 1000ms, 2000ms)
- **Only retries:** Retryable errors (network, connection issues)

### Error Response Format

```typescript
interface QueryError {
  code: string           // e.g., 'PGRST116', 'NETWORK_ERROR', 'RLS_ERROR'
  message: string        // Human-readable error message
  details?: string       // Additional error details
  retryable: boolean     // Whether error was retryable
  retries?: number       // Number of retry attempts made
  originalError?: any    // Original Supabase error object
}
```

## Migration Guide

### Step 1: Identify Query Pattern

**Before:**
```typescript
import { supabase } from '../lib/supabase'

const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle()

if (error) {
  console.error('[MyComponent] Error:', error)
  return null
}
```

**After:**
```typescript
import { query } from '../lib/supabaseQuery'

const { data, error } = await query('profiles', { logPrefix: '[MyComponent]' })
  .select('*')
  .eq('id', userId)
  .maybeSingle()

if (error) {
  // Error already logged by query utility
  return null
}
```

### Step 2: Update Import

Replace:
```typescript
import { supabase } from '../lib/supabase'
```

With:
```typescript
import { query } from '../lib/supabaseQuery'
// Or use helper functions:
import { selectAll, selectOne, update, insert, deleteRows } from '../lib/supabaseQuery'
```

### Step 3: Replace Query Calls

Replace `supabase.from('table')` with `query('table', options)`.

### Step 4: Test Thoroughly

- Test success case (data returned correctly)
- Test error case (error handling works)
- Test retry case (if possible, simulate network error)
- Check logs for standardized format

## Migration Priority

**Low Risk (Start Here):**
1. ✅ `src/utils/planChoiceDb.ts` - DONE
2. ✅ `src/utils/eventTermsDb.ts` - DONE
3. `src/utils/savedEventsDb.ts` - Next candidate
4. `src/utils/eventImageStorage.ts` - Utility functions

**Medium Risk:**
- Service files (`src/services/*.ts`)
- Data loader files (`src/pages/account/dataLoader.ts`)

**High Risk (Migrate Last):**
- Component files (many dependencies)
- Page files (critical user-facing code)
- Hook files (used by components)

## Benefits

1. **Consistent Error Handling** - All queries handle errors the same way
2. **Automatic Retry** - Transient network errors automatically retried
3. **Better Logging** - Standardized logs make debugging easier
4. **Type Safety** - Better TypeScript support with proper error types
5. **Maintainability** - Single place to update query logic

## Configuration

Query options can be customized per query:

```typescript
const result = await query('table', {
  maxRetries: 5,        // Override default (3)
  retryDelay: 1000,     // Override default (500ms)
  logErrors: true,       // Enable/disable logging
  logPrefix: '[MyComponent]' // Custom log prefix
})
  .select('*')
  .execute()
```

## Testing

### Unit Tests

Test retry logic and error classification:
```typescript
// Test retry on network error
// Test immediate return on RLS error
// Test error classification
```

### Integration Tests

Test with real Supabase queries:
```typescript
// Test success case
// Test error case
// Test retry case (if possible)
```

### Migration Tests

Test each migrated file:
- Verify query works correctly
- Verify error handling works
- Verify logs are standardized

## Dependencies

- `@supabase/supabase-js` - Supabase client library
- `src/lib/supabase.ts` - Supabase client instance

## Related Files

- `src/lib/supabaseQuery.ts` - Main utility file
- `src/lib/supabase.ts` - Supabase client instance
- Migrated files:
  - `src/utils/planChoiceDb.ts`
  - `src/utils/eventTermsDb.ts`

## Future Enhancements

1. **Query Caching** - Cache frequently accessed queries
2. **Query Batching** - Batch multiple queries into single request
3. **Metrics** - Track query performance and error rates
4. **Rate Limiting** - Prevent query spam

## See Also

- `docs/prevention/CASCADING_FAILURES.md` - Prevention strategies
- `docs/prevention/DEPENDENCY_TRACKING_PLAN.md` - Dependency tracking

