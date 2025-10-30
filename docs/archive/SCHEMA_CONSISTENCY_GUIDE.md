# Schema Consistency Guide

## Database Schema (Real)
- **providers table**: Uses `category_key` field
- **blog_posts table**: Uses `category_key` field
- **Missing columns**: `plan`, `tier`, `paid` (these don't exist in the real database)

## Type Definitions (All Consistent Now)

### 1. DbProvider (src/lib/supabaseData.ts)
```typescript
export type DbProvider = {
  id: string
  name: string
  category_key: string // ✅ Matches database
  // ... other fields
}
```

### 2. ProviderRow (src/pages/Admin.tsx)
```typescript
type ProviderRow = {
  id: string
  name: string
  category_key: string // ✅ Matches database
  // ... other fields
}
```

### 3. Provider (src/App.tsx)
```typescript
type Provider = {
  id: string
  name: string
  category_key: CategoryKey // ✅ Fixed to match database
  // ... other fields
}
```

### 4. SheetProvider (src/lib/sheets.ts)
```typescript
export type SheetProvider = {
  id: string
  name: string
  category_key: string // ✅ Fixed to match database
  // ... other fields
}
```

## Field Usage Rules

### Database Queries
- **ALWAYS use `category_key`** in all `.select()` queries
- **NEVER use `category`** in database queries

### UI Components
- **Provider data**: Use `category_key` ✅
- **Community data**: Use `category_key` ✅
- **Provider object literals**: Use `category_key` ✅

### State Management
- **appEdits state**: Uses `category` (this is correct - it's for form editing)
- **All other provider data**: Uses `category_key`

## What Was Fixed

1. **Provider type**: Changed `category` → `category_key`
2. **SheetProvider type**: Changed `category` → `category_key`
3. **All references**: Updated to use `category_key` consistently
4. **Database queries**: Already using `category_key` correctly
5. **Removed non-existent fields**: `plan`, `tier`, `paid`

## No More Errors

- ✅ All TypeScript errors resolved
- ✅ All database queries use correct field names
- ✅ All type definitions are consistent
- ✅ No more "column does not exist" errors
- ✅ No more property mismatch errors

## Key Principle

**The database uses `category_key` - everything else must match this.**
