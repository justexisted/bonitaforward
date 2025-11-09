/**
 * CENTRALIZED SUPABASE QUERY UTILITIES
 * 
 * Provides a wrapper around Supabase queries with:
 * - Automatic retry logic for transient errors
 * - Standardized error handling and logging
 * - Consistent response formats
 * - Better error classification
 * 
 * DEPENDENCY TRACKING:
 * 
 * WHAT THIS DEPENDS ON:
 * - @supabase/supabase-js: Supabase client library
 * - src/lib/supabase.ts: Exports supabase client instance
 * 
 * WHAT DEPENDS ON THIS:
 * - Gradually migrating files from direct supabase queries to this utility
 * - All migrated files will use query() instead of supabase.from()
 * 
 * BREAKING CHANGES:
 * - None initially - this is opt-in and backward compatible
 * - Files can be migrated one at a time
 * - Existing code continues to work unchanged
 * 
 * HOW TO SAFELY UPDATE:
 * 1. Import query utility alongside existing supabase import
 * 2. Replace supabase.from() with query() one query at a time
 * 3. Test each query thoroughly
 * 4. Verify error handling works correctly
 * 5. Check logs for standardized format
 * 
 * RELATED FILES:
 * - src/lib/supabase.ts: Supabase client instance
 * - Files being migrated: src/utils/*.ts, src/services/*.ts, etc.
 * 
 * See: docs/prevention/CASCADING_FAILURES.md
 */

import { supabase } from './supabase'

/**
 * Query error classification
 */
export interface QueryError {
  code: string // e.g., 'PGRST116', 'NETWORK_ERROR', 'RLS_ERROR', 'TIMEOUT_ERROR'
  message: string
  details?: string
  retryable: boolean
  retries?: number
  originalError?: any
}

/**
 * Standardized query result
 * CRITICAL: Includes count property when using { count: 'exact' } in select queries
 */
export interface QueryResult<T> {
  data: T | null
  error: QueryError | null
  count?: number | null // Count from Supabase when using { count: 'exact' }
}

/**
 * Supabase query builder type (simplified for compatibility)
 */
type SupabaseQuery = any

/**
 * Query options for retry and error handling
 */
export interface QueryOptions {
  /**
   * Maximum number of retry attempts for retryable errors
   * Default: 3
   */
  maxRetries?: number
  
  /**
   * Base delay in milliseconds for exponential backoff
   * Default: 500
   */
  retryDelay?: number
  
  /**
   * Whether to log errors (useful for debugging)
   * Default: true
   */
  logErrors?: boolean
  
  /**
   * Custom log prefix for this query
   * Default: '[SupabaseQuery]'
   */
  logPrefix?: string
  
  /**
   * Default return value on error (for select queries)
   * Default: [] (empty array)
   */
  defaultOnError?: any
}

/**
 * Classify error type and determine if it's retryable
 */
function classifyError(error: any): { retryable: boolean; code: string; message: string } {
  if (!error) {
    return { retryable: false, code: 'UNKNOWN_ERROR', message: 'Unknown error' }
  }

  const errorMessage = error.message || String(error)
  const errorCode = error.code || ''

  // Network errors (retryable)
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('ENOTFOUND') ||
    errorCode === 'TIMEOUT_ERROR'
  ) {
    return {
      retryable: true,
      code: 'NETWORK_ERROR',
      message: errorMessage || 'Network error occurred'
    }
  }

  // Database connection errors (retryable)
  if (
    errorMessage.includes('connection') ||
    errorMessage.includes('pool') ||
    errorMessage.includes('503') ||
    errorMessage.includes('502') ||
    errorCode === 'PGRST301' // Connection error
  ) {
    return {
      retryable: true,
      code: 'CONNECTION_ERROR',
      message: errorMessage || 'Database connection error'
    }
  }

  // RLS permission errors (not retryable)
  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('policy') ||
    errorMessage.includes('RLS') ||
    errorCode === 'PGRST301' ||
    errorCode === '42501'
  ) {
    return {
      retryable: false,
      code: 'RLS_ERROR',
      message: errorMessage || 'Row Level Security policy violation'
    }
  }

  // No rows found (not retryable, but not really an error)
  if (
    errorCode === 'PGRST116' ||
    errorMessage.includes('No rows') ||
    errorMessage.includes('not found')
  ) {
    return {
      retryable: false,
      code: 'NO_ROWS',
      message: errorMessage || 'No rows found'
    }
  }

  // Validation errors (not retryable)
  if (
    errorCode === '23505' || // Unique constraint violation
    errorCode === '23503' || // Foreign key violation
    errorCode === '22P02' || // Invalid input syntax
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid')
  ) {
    return {
      retryable: false,
      code: 'VALIDATION_ERROR',
      message: errorMessage || 'Validation error'
    }
  }

  // Default: treat as non-retryable
  return {
    retryable: false,
    code: errorCode || 'UNKNOWN_ERROR',
    message: errorMessage || 'Unknown error occurred'
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute query with retry logic
 */
async function executeWithRetry<T>(
  queryBuilder: SupabaseQuery,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const {
    maxRetries = 3,
    retryDelay = 500,
    logErrors = true,
    logPrefix = '[SupabaseQuery]'
  } = options

  let lastError: any = null
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      const result = await queryBuilder
      const { data, error, count } = result as { data: any; error: any; count?: number | null }

      if (!error) {
        // Success - return data with count if available
        if (attempt > 0 && logErrors) {
          console.log(`${logPrefix} Query succeeded after ${attempt} retry(ies)`)
        }
        return { data: data as T, error: null, count: count ?? null }
      }

      // Classify error
      const errorInfo = classifyError(error)
      lastError = error

      // If not retryable, return error immediately
      if (!errorInfo.retryable) {
        if (logErrors) {
          console.warn(`${logPrefix} Non-retryable error:`, {
            code: errorInfo.code,
            message: errorInfo.message,
            details: error.details || error.hint
          })
        }
        return {
          data: null,
          error: {
            code: errorInfo.code,
            message: errorInfo.message,
            details: error.details || error.hint,
            retryable: false,
            originalError: error
          },
          count: null
        }
      }

      // Retryable error - check if we have retries left
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt) // Exponential backoff
        if (logErrors) {
          console.warn(`${logPrefix} Retryable error (attempt ${attempt + 1}/${maxRetries + 1}):`, {
            code: errorInfo.code,
            message: errorInfo.message,
            retryingIn: `${delay}ms`
          })
        }
        await sleep(delay)
        attempt++
        continue
      }

      // Max retries exceeded
      if (logErrors) {
        console.error(`${logPrefix} Max retries (${maxRetries}) exceeded:`, {
          code: errorInfo.code,
          message: errorInfo.message,
          attempts: attempt + 1
        })
      }
      return {
        data: null,
        error: {
          code: errorInfo.code,
          message: errorInfo.message,
          details: error.details || error.hint,
          retryable: true,
          retries: attempt,
          originalError: error
        },
        count: null
      }
    } catch (err: any) {
      // Unexpected error (not from Supabase query)
      const errorInfo = classifyError(err)
      lastError = err

      if (!errorInfo.retryable || attempt >= maxRetries) {
        if (logErrors) {
          console.error(`${logPrefix} Unexpected error:`, {
            code: errorInfo.code,
            message: errorInfo.message,
            error: err
          })
        }
        return {
          data: null,
          error: {
            code: errorInfo.code,
            message: errorInfo.message,
            retryable: errorInfo.retryable,
            retries: attempt,
            originalError: err
          },
          count: null
        }
      }

      // Retry unexpected error if retryable
      const delay = retryDelay * Math.pow(2, attempt)
      if (logErrors) {
        console.warn(`${logPrefix} Unexpected retryable error (attempt ${attempt + 1}/${maxRetries + 1}):`, {
          code: errorInfo.code,
          message: errorInfo.message,
          retryingIn: `${delay}ms`
        })
      }
      await sleep(delay)
      attempt++
    }
  }

  // Should never reach here, but TypeScript requires it
  return {
    data: null,
    error: {
      code: 'MAX_RETRIES_EXCEEDED',
      message: 'Maximum retry attempts exceeded',
      retryable: true,
      retries: maxRetries,
      originalError: lastError
    },
    count: null
  }
}

/**
 * Query builder wrapper that maintains Supabase query builder API
 */
export class QueryBuilder<T = any> {
  private options: QueryOptions
  private builder: SupabaseQuery

  constructor(table: string, options: QueryOptions = {}) {
    this.options = options
    this.builder = supabase.from(table)
  }

  /**
   * Select columns (maintains Supabase API)
   * Supports count option: select('*', { count: 'exact' })
   */
  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated' }): this {
    this.builder = (this.builder as any).select(columns, options)
    return this
  }

  /**
   * Filter by equality (maintains Supabase API)
   */
  eq(column: string, value: any): this {
    this.builder = this.builder.eq(column, value)
    return this
  }

  /**
   * Filter by array membership (maintains Supabase API)
   */
  in(column: string, values: any[]): this {
    this.builder = this.builder.in(column, values)
    return this
  }

  /**
   * Case-insensitive like filter (maintains Supabase API)
   */
  ilike(column: string, value: string): this {
    this.builder = this.builder.ilike(column, value)
    return this
  }

  /**
   * OR filter (maintains Supabase API)
   */
  or(filter: string): this {
    this.builder = this.builder.or(filter)
    return this
  }

  /**
   * Order by column (maintains Supabase API)
   */
  order(column: string, options?: { ascending?: boolean }): this {
    this.builder = this.builder.order(column, options)
    return this
  }

  /**
   * Limit results (maintains Supabase API)
   */
  limit(count: number): this {
    this.builder = this.builder.limit(count)
    return this
  }

  /**
   * Single result (maintains Supabase API)
   */
  single(): this {
    this.builder = this.builder.single()
    return this
  }

  /**
   * Maybe single result (maintains Supabase API)
   */
  maybeSingle(): this {
    this.builder = this.builder.maybeSingle()
    return this
  }

  /**
   * Insert data (maintains Supabase API)
   */
  insert(data: any[] | any): this {
    this.builder = this.builder.insert(data)
    return this
  }

  /**
   * Update data (maintains Supabase API)
   */
  update(data: any): this {
    this.builder = this.builder.update(data)
    return this
  }

  /**
   * Delete rows (maintains Supabase API)
   */
  delete(): this {
    this.builder = this.builder.delete()
    return this
  }

  /**
   * Upsert data (maintains Supabase API)
   */
  upsert(data: any[] | any, options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.builder = this.builder.upsert(data, options)
    return this
  }
  
  /**
   * Filter by not equal (maintains Supabase API)
   */
  not(column: string, operator: string, value: any): this {
    this.builder = (this.builder as any).not(column, operator, value)
    return this
  }

  /**
   * IS filter (supports checking for NULL)
   */
  is(column: string, value: any): this {
    this.builder = (this.builder as any).is(column, value)
    return this
  }

  /**
   * Filter by greater than or equal (maintains Supabase API)
   */
  gte(column: string, value: any): this {
    this.builder = (this.builder as any).gte(column, value)
    return this
  }

  /**
   * Filter by less than or equal (maintains Supabase API)
   */
  lte(column: string, value: any): this {
    this.builder = (this.builder as any).lte(column, value)
    return this
  }

  /**
   * Execute query with retry logic
   */
  async execute(): Promise<QueryResult<T>> {
    return executeWithRetry(this.builder, this.options)
  }

  /**
   * Execute query and return Supabase-compatible format { data, error }
   * Makes QueryBuilder directly awaitable (Promise-like)
   * This allows: const { data, error } = await query('table').select('*')
   */
  async then<TResult1 = { data: T | null; error: any; count?: number | null }>(
    onfulfilled?: ((value: { data: T | null; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult1 | PromiseLike<TResult1>) | undefined | null
  ): Promise<TResult1> {
    try {
      const result = await this.execute()
      // Convert QueryResult to Supabase format { data, error, count }
      // CRITICAL: Preserve count property when using { count: 'exact' } in select queries
      const supabaseFormat = { 
        data: result.data, 
        error: result.error ? (result.error.originalError || { 
          message: result.error.message,
          code: result.error.code,
          details: result.error.details
        }) : null,
        count: result.count ?? null
      }
      
      if (onfulfilled) {
        return onfulfilled(supabaseFormat)
      }
      return supabaseFormat as TResult1
    } catch (error) {
      if (onrejected) {
        return onrejected(error)
      }
      throw error
    }
  }
  
  /**
   * Make QueryBuilder catchable (Promise-like)
   */
  catch<TResult = { data: T | null; error: any; count?: number | null }>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<{ data: T | null; error: any; count?: number | null } | TResult> {
    return this.then(undefined, onrejected)
  }
}

/**
 * Create a query builder for a table
 * 
 * Usage:
 * const { data, error } = await query('providers')
 *   .select('*')
 *   .eq('owner_user_id', userId)
 *   .order('created_at', { ascending: false })
 *   .execute()
 * 
 * Or for backward compatibility:
 * const { data, error } = await query('providers')
 *   .select('*')
 *   .eq('owner_user_id', userId)
 */
export function query<T = any>(table: string, options?: QueryOptions): QueryBuilder<T> {
  return new QueryBuilder<T>(table, options)
}

/**
 * Helper function for simple select queries
 * 
 * Usage:
 * const providers = await selectAll('providers', { owner_user_id: userId })
 * 
 * Returns: T[] or empty array on error
 */
export async function selectAll<T = any>(
  table: string,
  filters?: Record<string, any>,
  options?: QueryOptions & { orderBy?: string; ascending?: boolean; limit?: number }
): Promise<T[]> {
  let builder = query<T>(table, options).select('*')
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        builder = builder.in(key, value) as QueryBuilder<T>
      } else {
        builder = builder.eq(key, value) as QueryBuilder<T>
      }
    })
  }
  
  if (options?.orderBy) {
    builder = builder.order(options.orderBy, { ascending: options.ascending !== false }) as QueryBuilder<T>
  }
  
  if (options?.limit) {
    builder = builder.limit(options.limit) as QueryBuilder<T>
  }
  
  const result = await builder.execute()
  
  if (result.error) {
    return options?.defaultOnError ?? []
  }
  
  return (result.data || []) as T[]
}

/**
 * Helper function for single select queries
 * 
 * Usage:
 * const profile = await selectOne('profiles', { id: userId })
 * 
 * Returns: T | null
 */
export async function selectOne<T = any>(
  table: string,
  filters: Record<string, any>,
  options?: QueryOptions
): Promise<T | null> {
  let builder = query<T>(table, options).select('*')
  
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      builder = builder.in(key, value) as QueryBuilder<T>
    } else {
      builder = builder.eq(key, value) as QueryBuilder<T>
    }
  })
  
  const result = await builder.maybeSingle().execute()
  
  if (result.error) {
    return null
  }
  
  return result.data as T | null
}

/**
 * Helper function for insert queries
 * 
 * Usage:
 * const { data, error } = await insert('providers', providerData)
 * 
 * Returns: { data: T | null, error: QueryError | null }
 */
export async function insert<T = any>(
  table: string,
  data: any[] | any,
  options?: QueryOptions
): Promise<QueryResult<T>> {
  const builder = query<T>(table, options).insert(data)
  return builder.execute()
}

/**
 * Helper function for update queries
 * 
 * Usage:
 * const { data, error } = await update('profiles', { name: 'New Name' }, { id: userId })
 * 
 * Returns: { data: T | null, error: QueryError | null }
 */
export async function update<T = any>(
  table: string,
  data: any,
  filters: Record<string, any>,
  options?: QueryOptions
): Promise<QueryResult<T>> {
  let builder = query<T>(table, options).update(data)
  
  Object.entries(filters).forEach(([key, value]) => {
    builder = builder.eq(key, value) as QueryBuilder<T>
  })
  
  return builder.execute()
}

/**
 * Helper function for delete queries
 * 
 * Usage:
 * const { data, error } = await deleteRows('providers', { id: providerId })
 * 
 * Returns: { data: T | null, error: QueryError | null }
 */
export async function deleteRows<T = any>(
  table: string,
  filters: Record<string, any>,
  options?: QueryOptions
): Promise<QueryResult<T>> {
  let builder = query<T>(table, options).delete()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      builder = builder.in(key, value) as QueryBuilder<T>
    } else {
      builder = builder.eq(key, value) as QueryBuilder<T>
    }
  })
  
  return builder.execute()
}

