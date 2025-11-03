# Supabase CAPTCHA Error Fix

## Problem
**Error:** `captcha verification process failed`  
**Status:** 500 error from Supabase  
**Cause:** Supabase has CAPTCHA protection enabled for signups, but the frontend isn't sending a CAPTCHA token.

## Solution Options

### Option 1: Disable CAPTCHA in Supabase (Recommended)

Since we're using a custom email verification system, we can disable Supabase's CAPTCHA:

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll down to **"CAPTCHA protection"** or **"Bot Protection"** section
3. Find **"Enable CAPTCHA"** or **"Protect signups"** setting
4. **Turn it OFF**
5. Save changes

This will allow signups without CAPTCHA verification.

**Why this is safe:**
- We have custom email verification system
- Users must verify their email before accessing protected features
- Email verification acts as a form of protection against spam

### Option 2: Implement CAPTCHA (If you want to keep it)

If you want to keep CAPTCHA protection, you need to implement it in the frontend:

1. **Choose a CAPTCHA provider:**
   - hCaptcha (free tier available)
   - Cloudflare Turnstile (free)
   - Google reCAPTCHA v3 (free)

2. **Install and configure:**
   ```bash
   npm install @hcaptcha/react-hcaptcha
   # or
   npm install @marsidev/react-turnstile
   ```

3. **Add CAPTCHA to SignIn.tsx:**
   ```typescript
   import HCaptcha from '@hcaptcha/react-hcaptcha'
   
   const [captchaToken, setCaptchaToken] = useState<string | null>(null)
   
   // In JSX:
   <HCaptcha
     sitekey="YOUR_SITE_KEY"
     onVerify={setCaptchaToken}
   />
   
   // In signup:
   const { data, error } = await supabase.auth.signUp({ 
     email, 
     password, 
     options: { 
       data: { name, role },
       captchaToken // Add this
     } 
   })
   ```

4. **Update Supabase settings:**
   - Configure CAPTCHA provider in Supabase dashboard
   - Add your site key and secret key

**This is more complex but provides additional spam protection.**

## Recommendation

**Disable CAPTCHA** (Option 1) because:
- ✅ Simpler (no code changes needed)
- ✅ We have custom email verification (good protection)
- ✅ Better user experience (no CAPTCHA to solve)
- ✅ Less complexity in codebase

After disabling CAPTCHA in Supabase dashboard, signups should work immediately without any code changes.

## Testing

After disabling CAPTCHA:
1. Try signing up again
2. Should not see "captcha verification process failed" error
3. Signup should complete successfully
4. Verification email should be sent (via our custom system)

