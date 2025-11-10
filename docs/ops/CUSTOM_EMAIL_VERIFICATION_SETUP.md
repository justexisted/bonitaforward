# Custom Email Verification System Setup Guide

## Overview

We've implemented a **custom email verification system** using Resend that replaces Supabase's built-in email confirmation. This gives you:

✅ **Full control** over email design and content  
✅ **Professional branding** with React Email templates  
✅ **No Supabase email fees** - uses free Resend tier (3,000 emails/month)  
✅ **Customizable** verification emails that match your brand  

## What Was Implemented

### 1. Database Tables & Migrations

**File:** `ops/sql/create-email-verification-tokens.sql`
- Creates `email_verification_tokens` table
- Stores secure tokens with expiration (24 hours)
- Tracks when tokens are used

**File:** `ops/sql/add-email-confirmed-at-to-profiles.sql`
- Adds `email_confirmed_at` column to `profiles` table
- Stores verification timestamp from our custom system

### 2. Email Templates

**File:** `src/emails/templates/EmailVerification.tsx`
- Professional React Email template
- Branded with Bonita Forward styling
- Includes verification link and expiration warning

### 3. Netlify Functions

**File:** `netlify/functions/send-verification-email.ts`
- Generates secure verification token
- Stores token in database
- Sends email via Resend using custom template

**File:** `netlify/functions/verify-email.ts`
- Verifies token from email link
- Updates `profiles.email_confirmed_at`
- Marks token as used
- Expires after 24 hours or after use

**File:** `netlify/functions/send-email.ts` (updated)
- Added `email_verification` type support
- Renders EmailVerification template

### 4. Frontend Components

**File:** `src/pages/VerifyEmail.tsx`
- Verification page at `/verify-email`
- Handles token verification
- Shows success/error states
- Auto-redirects after verification

**Updated:** `src/contexts/AuthContext.tsx`
- Checks `profiles.email_confirmed_at` instead of Supabase's system
- `resendVerificationEmail()` uses custom system
- `fetchUserProfile()` includes email verification status

**Updated:** `src/pages/SignIn.tsx`
- Sends verification email after signup
- Uses custom system regardless of Supabase settings
- Handles both session and no-session cases

**Updated:** `src/App.tsx`
- Added `/verify-email` route

## Setup Instructions

### ⚠️ CRITICAL: Run Database Migrations FIRST

**You MUST run these SQL migrations before the system will work!**

The code will fail with errors like:
- `400 Bad Request` when fetching profiles (missing `email_confirmed_at` column)
- `500 Internal Server Error` when sending verification emails (missing `email_verification_tokens` table)

### Step 1: Run Database Migrations

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Run `ops/sql/create-email-verification-tokens.sql`
   - This creates the `email_verification_tokens` table
3. Run `ops/sql/add-email-confirmed-at-to-profiles.sql`
   - This adds the `email_confirmed_at` column to the `profiles` table

**Without these migrations, the system will not work!**

### Step 2: Disable Supabase Email Confirmation

1. Go to Supabase Dashboard → Authentication → Settings
2. Find **"Confirm email"** or **"Email confirmation"** setting
3. **Turn it OFF** - We're using our custom system now
4. Save changes

### Step 3: Verify Resend API Key

1. Check that `RESEND_API_KEY` is set in Netlify environment variables
2. Verify your Resend domain (bonitaforward.com) is configured
3. Test email sending (see testing section below)

### Step 4: Test the Flow

1. **Sign up** a new test account
2. **Check email** - should receive custom verification email
3. **Click verification link** - should verify email and redirect
4. **Check account page** - should show verified status

## How It Works

1. **User signs up** → Account created in Supabase auth
2. **Token generated** → Secure random token stored in `email_verification_tokens`
3. **Email sent** → Custom Resend email with verification link
4. **User clicks link** → Token verified via `/verify-email` page
5. **Profile updated** → `profiles.email_confirmed_at` set to current timestamp
6. **Token marked used** → Prevents reuse
7. **User verified** → Can access protected features

## Email Customization

To customize the verification email:

1. Edit `src/emails/templates/EmailVerification.tsx`
2. Modify the React Email template (similar to other email templates)
3. Update branding, copy, or styling as needed
4. No need to redeploy functions - template is rendered on-the-fly

## Troubleshooting

### Verification email not sent?
- Check Resend API key is set in Netlify
- Check Netlify function logs for errors
- Verify email address is valid

### Token expired?
- Tokens expire after 24 hours
- User can click "Resend verification email" from account page

### Verification link not working?
- Check token is in database: `SELECT * FROM email_verification_tokens WHERE token = '...'`
- Verify token hasn't expired: `SELECT * FROM email_verification_tokens WHERE expires_at > NOW()`
- Check token hasn't been used: `SELECT * FROM email_verification_tokens WHERE used_at IS NULL`

### Profile not showing as verified?
- Check `profiles.email_confirmed_at` is set: `SELECT email_confirmed_at FROM profiles WHERE id = '...'`
- Verify AuthContext is fetching from profiles table (not session)

## Security Notes

- Tokens are **32-byte cryptographically secure random** values
- Tokens **expire after 24 hours**
- Tokens are **single-use** (marked as used after verification)
- Old tokens are cleaned up via `cleanup_expired_verification_tokens()` function
- RLS policies prevent users from accessing other users' tokens

## Migration Notes

- Existing users: Will need to verify via new system if not already verified
- You can bulk-verify existing verified users by setting `email_confirmed_at` in profiles table
- Supabase's `email_confirmed_at` is no longer used - we use our own

## Next Steps

1. ✅ Run SQL migrations
2. ✅ Disable Supabase email confirmation
3. ✅ Test signup flow
4. ✅ Customize email template (optional)
5. ✅ Monitor Resend usage (free tier: 3,000/month)

## Free Tier Limits

- **Resend Free Tier:** 3,000 emails/month
- **Resend Test Domain:** Unlimited (for testing with `@resend.dev`)
- Consider upgrading if you exceed 3,000 signups/month

