# Email Notification Testing Guide
**Date:** 2025-10-28  
**System:** Resend Email Integration

## 📋 Current Email Integration Status

### ✅ **FULLY INTEGRATED** (Currently Sending Emails)
1. **Change Request Approved** - When admin approves a business update
2. **Change Request Rejected** - When admin rejects a business update

### ⚠️ **NOT YET INTEGRATED** (Functions exist but not connected)
1. **Booking Confirmation** - When a customer books a service
2. **Application Approved (Email)** - When admin approves a business application
   - ⚠️ Currently sends **in-app notification** only, not email

---

## 🧪 Testing Guide

### Prerequisites
Before testing, ensure:
1. ✅ Resend API key is set in `.env.local` as `RESEND_API_KEY`
2. ✅ Local dev server is running (`npm run dev`)
3. ✅ Netlify functions are running (`netlify dev`)
4. ✅ You have admin access to `/admin` page
5. ✅ You have a business listing to test change requests

---

## Test 1: Change Request Approved Email ✅

### Setup
1. Sign in as a **regular user** (not admin)
2. Go to `/my-business` page
3. Click on one of your business listings
4. Click "Edit Business" button
5. Make a change (e.g., update phone number, description, etc.)
6. Click "Submit for Review"

### Expected Result
- You should see: "Change request submitted! An admin will review your changes."
- A change request is created with `status: 'pending'`

### Testing the Email
1. **Sign out** and sign in as **admin** (`justexisted@gmail.com`)
2. Go to `/admin` page
3. Click **"Change Requests"** section in the sidebar
4. Find the pending change request you created
5. Click **"✅ Approve"** button
6. Click **"Confirm"** in the popup

### Expected Email
**To:** The user's email who submitted the change request  
**From:** `Bonita Forward <onboarding@resend.dev>` (test) or `notifications@bonitaforward.com` (production)  
**Subject:** "Your Business Update Has Been Approved!"  
**Content:**
- Business name
- Request type (e.g., "Information Update")
- List of fields changed
- View button linking to `/my-business`

### Verification
1. **Check console logs** in browser DevTools:
   ```
   [EmailService] Sending change request approved email...
   Email sent successfully: {...}
   ```
2. **Check Resend Dashboard**: https://resend.com/emails
   - Should show email with status "Delivered"
3. **Check recipient's inbox** for the email

### Troubleshooting
- **"React is not defined"**: Clear Netlify cache and restart server
- **403 Forbidden**: Check `FROM_EMAIL_FALLBACK` in `send-email.ts` (should be `onboarding@resend.dev` for testing)
- **500 Internal Server Error**: Check server console for detailed error

---

## Test 2: Change Request Rejected Email ✅

### Setup
Follow same setup as Test 1 to create a pending change request.

### Testing the Email
1. Sign in as **admin**
2. Go to `/admin` → **"Change Requests"**
3. Find the pending request
4. Click **"❌ Reject"** button
5. Enter a reason (e.g., "Please provide more details about your services")
6. Click **"OK"** to confirm

### Expected Email
**To:** The user's email who submitted the change request  
**Subject:** "Business Update Request Needs Attention"  
**Content:**
- Business name
- Request type
- Rejection reason
- Encouragement to resubmit
- Button linking to `/my-business`

### Verification
Same as Test 1.

---

## Test 3: Booking Confirmation Email ⚠️ NOT YET INTEGRATED

### Current Status
- ✅ Email template exists (`BookingConfirmation.tsx`)
- ✅ Service function exists (`notifyBookingConfirmation`)
- ❌ **NOT called anywhere in the app**

### Integration Required
To enable this email, we need to integrate it where bookings are created. Likely locations:
1. `src/pages/BusinessPage.tsx` or `src/pages/ProviderPage.tsx` - when "Book Now" is clicked
2. `src/components/booking/*` - booking form submission

### How to Integrate (Future)
```typescript
import { notifyBookingConfirmation } from '@/services/emailNotificationService'

// After booking is created:
const booking = { /* ... */ }
await notifyBookingConfirmation(
  businessOwnerEmail,
  businessName,
  customerName,
  customerEmail,
  customerPhone,
  bookingDate,
  bookingType,
  notes
)
```

### Manual Testing (Console Only)
You can test the email manually in browser console:
```javascript
const response = await fetch('http://localhost:8888/.netlify/functions/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'booking-confirmation',
    data: {
      businessName: 'Test Business',
      businessOwnerEmail: 'your-email@gmail.com',
      customerName: 'John Doe',
      customerEmail: 'customer@example.com',
      customerPhone: '(555) 123-4567',
      bookingDate: '2025-11-15 at 2:00 PM',
      bookingType: 'appointment',
      notes: 'First time customer'
    }
  })
})
const result = await response.json()
console.log(result)
```

---

## Test 4: Application Approved Email ⚠️ PARTIALLY INTEGRATED

### Current Status
- ✅ Sends **in-app notification** (visible in notification bell)
- ❌ Does **NOT send email**
- ✅ Email template exists (`ApplicationApproved.tsx`)
- ✅ Service function exists (`notifyApplicationApproved`)

### How to Enable Email
Edit `src/utils/adminBusinessApplicationUtils.ts` around line 233:

**Replace this section:**
```typescript
// Send notification to the applicant if they have a user account
if (ownerUserId) {
  try {
    const notificationTitle = '✅ Business Application Approved!'
    const notificationMessage = `Great news! Your application for "${businessName}" has been approved and your business listing has been created. You can now manage it from your account.`
    
    // ... in-app notification code ...
  }
}
```

**With:**
```typescript
// Send notification to the applicant if they have a user account
if (ownerUserId) {
  try {
    const notificationTitle = '✅ Business Application Approved!'
    const notificationMessage = `Great news! Your application for "${businessName}" has been approved and your business listing has been created. You can now manage it from your account.`
    
    // Send in-app notification
    const { error: notifError } = await supabase.from('user_notifications').insert({
      user_id: ownerUserId,
      subject: notificationTitle,
      title: notificationTitle,
      message: notificationMessage,
      type: 'application_approved',
      metadata: {}
    })
    
    if (notifError) {
      console.error('[Admin] ❌ Failed to insert approval notification:', notifError)
    }
    
    // 🆕 SEND EMAIL NOTIFICATION
    if (app.email) {
      console.log('[Admin] Sending application approved email to:', app.email)
      
      const { notifyApplicationApproved } = await import('../services/emailNotificationService')
      await notifyApplicationApproved(app.email, businessName)
      
      console.log('[Admin] ✅ Application approved email sent')
    }
  } catch (err) {
    console.error('[Admin] Failed to send approval notification:', err)
  }
}
```

### Testing After Integration
1. Submit a business application from `/create-business`
2. Sign in as admin
3. Go to `/admin` → **"Business Applications"**
4. Click **"✅ Approve"** on an application
5. Check email inbox for approval email

---

## 🔍 Debugging & Verification

### Check Netlify Function Logs
```bash
# In terminal where netlify dev is running:
# Look for logs like:
[send-email] Received request: {...}
[send-email] Rendering email template...
[send-email] Sending email via Resend...
[send-email] Email sent successfully
```

### Check Resend Dashboard
1. Go to: https://resend.com/emails
2. Sign in with your Resend account
3. View recent emails and their delivery status:
   - ✅ **Delivered** - Email was successfully sent
   - ⏳ **Queued** - Email is being processed
   - ❌ **Failed** - Check error message

### Check Browser Console
Look for logs from `emailNotificationService.ts`:
```
[EmailService] Sending change request approved email to: user@example.com
[EmailService] Email sent successfully: {id: "...", from: "..."}
```

### Common Issues

#### 1. Email Not Received
- **Check spam folder** - Resend test domain may be flagged
- **Check Resend dashboard** - Verify email was sent
- **Verify recipient email** - Ensure it's correct in database

#### 2. 500 Internal Server Error
- **Check Netlify function logs** for detailed error
- **Verify RESEND_API_KEY** is set correctly
- **Restart Netlify dev server** after .env changes

#### 3. 403 Forbidden (Domain Not Verified)
- **For local testing**: Use `onboarding@resend.dev` as sender
- **For production**: Set up custom domain in Resend dashboard

#### 4. React is not defined
- **Solution**: Clear Netlify cache and rebuild
  ```bash
  rm -rf .netlify
  netlify dev
  ```

---

## 📊 Email Trigger Summary

| Email Type | Trigger Location | Trigger Action | Currently Working? |
|------------|------------------|----------------|-------------------|
| **Change Request Approved** | `/admin` → Change Requests Section | Admin clicks "✅ Approve" | ✅ Yes |
| **Change Request Rejected** | `/admin` → Change Requests Section | Admin clicks "❌ Reject" | ✅ Yes |
| **Booking Confirmation** | Not integrated yet | When booking is created | ❌ No |
| **Application Approved** | `/admin` → Business Applications | Admin clicks "✅ Approve" | ⚠️ In-app only |

---

## 🚀 Quick Test Command (Browser Console)

Test any email type directly from browser console:

```javascript
// Test Change Request Approved
await fetch('http://localhost:8888/.netlify/functions/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'change-request-approved',
    data: {
      userEmail: 'test@example.com',
      businessName: 'Test Business',
      requestType: 'update',
      changes: ['Name', 'Phone', 'Address']
    }
  })
}).then(r => r.json()).then(console.log)

// Test Change Request Rejected
await fetch('http://localhost:8888/.netlify/functions/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'change-request-rejected',
    data: {
      userEmail: 'test@example.com',
      businessName: 'Test Business',
      requestType: 'update',
      reason: 'Please provide more details'
    }
  })
}).then(r => r.json()).then(console.log)
```

---

## ✅ Success Criteria

An email test is successful when:
1. ✅ No console errors appear
2. ✅ Function returns `{success: true, id: "..."}`
3. ✅ Email appears in Resend dashboard as "Delivered"
4. ✅ Email arrives in recipient's inbox within 1-2 minutes
5. ✅ Email displays correctly (no broken images, proper formatting)

---

## 📝 Next Steps

To complete the email integration:

1. **Integrate Booking Confirmation Email**
   - Find where bookings are created in the codebase
   - Add `notifyBookingConfirmation()` call after booking creation
   - Test with real booking flow

2. **Add Email to Application Approval**
   - Edit `adminBusinessApplicationUtils.ts`
   - Add `notifyApplicationApproved()` call after in-app notification
   - Test with real application approval

3. **Set Up Production Domain** (See `RESEND-QUICK-START.md`)
   - Add custom domain in Resend dashboard
   - Update `FROM_EMAIL` in `send-email.ts`
   - Verify domain with DNS records

4. **Add More Email Types** (Future)
   - Application Rejected (email)
   - Job Post Approved
   - Account Verification
   - Password Reset

