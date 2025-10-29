# Resend Email Notification System - Setup Guide
## Bonita Forward - October 28, 2025

---

## 🎉 **IMPLEMENTATION COMPLETE!**

A complete email notification system has been integrated into Bonita Forward using **Resend** and **React Email**.

---

## 📋 **WHAT WAS BUILT**

### ✅ Email Templates (React Email)
1. **ChangeRequestApproved** - Beautiful approval notifications
2. **ChangeRequestRejected** - Professional rejection emails
3. **BookingConfirmation** - New booking alerts for businesses
4. **ApplicationApproved** - Welcome emails for new businesses

### ✅ Email Components
- **EmailLayout** - Consistent branding across all emails
- **EmailButton** - Styled call-to-action buttons
- Professional header/footer with links

### ✅ Backend Infrastructure
- **Netlify Function:** `send-email.ts` - Handles all email sending
- **Notification Service:** `emailNotificationService.ts` - Easy-to-use API
- **Integrated:** Change request approvals/rejections now send emails

---

## 🚀 **SETUP INSTRUCTIONS**

Follow these steps to activate the email system:

### **Step 1: Create Resend Account**

1. Go to https://resend.com
2. Click "Sign Up" and use **bonitaforward@gmail.com**
3. Verify your email address
4. You'll be taken to the dashboard

**Time:** 2 minutes ⏱️

---

### **Step 2: Get Your API Key**

1. In the Resend dashboard, click "API Keys" in the left sidebar
2. Click "Create API Key"
3. Name it: `Bonita Forward Production`
4. Copy the API key (starts with `re_`)
5. **IMPORTANT:** Save it securely - you can't see it again!

**Time:** 1 minute ⏱️

---

### **Step 3: Add Verified Sender**

1. In Resend dashboard, click "Domains" in the left sidebar
2. For now, click "Add Email Address" (free option)
3. Enter: `bonitaforward@gmail.com`
4. Check your Gmail for verification email
5. Click the verification link

**Note:** You can add a custom domain later (e.g., `notifications@bonitaforward.com`)

**Time:** 2 minutes ⏱️

---

### **Step 4: Configure Netlify Environment Variables**

1. Go to https://app.netlify.com
2. Select your Bonita Forward site
3. Go to "Site configuration" → "Environment variables"
4. Click "Add a variable"
5. Add:
   - **Key:** `RESEND_API_KEY`
   - **Value:** Your API key from Step 2 (starts with `re_`)
6. Click "Create variable"
7. **Important:** Redeploy your site for the variable to take effect

**Time:** 2 minutes ⏱️

---

### **Step 5: Test the Email System**

You can test the integration directly from your browser console:

```javascript
// Go to your site
// Open browser console (F12)

// Test email
fetch('/.netlify/functions/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'application_approved',
    to: 'bonitaforward@gmail.com',
    data: {
      businessName: 'Test Business',
      category: 'Professional Services',
      tier: 'free'
    }
  })
})
.then(r => r.json())
.then(console.log)
```

**Expected Result:** You should receive a welcome email within seconds! 🎉

**Time:** 1 minute ⏱️

---

## 📧 **EMAILS THAT ARE NOW AUTOMATED**

### **1. Change Request Approved**
**When:** Admin approves a business change request  
**Sent To:** Business owner  
**Includes:**
- What was approved (update, delete, featured upgrade, claim)
- Which fields changed (for updates)
- Call-to-action button to view business
- Congratulations message for featured upgrades

---

### **2. Change Request Rejected**
**When:** Admin rejects a business change request  
**Sent To:** Business owner  
**Includes:**
- What was rejected
- Admin's rejection reason (if provided)
- Helpful next steps
- Contact support information

---

### **3. Booking Confirmation** (Ready to use)
**When:** Customer submits booking request  
**Sent To:** Business owner  
**Includes:**
- Customer contact information
- Booking date, time, service
- Customer message
- Quick action buttons

**To activate:** Integrate into booking submission form

---

### **4. Application Approved** (Ready to use)
**When:** Admin approves a business application  
**Sent To:** New business owner  
**Includes:**
- Congratulations message
- Next steps checklist
- Call-to-action to manage business

**To activate:** Integrate into admin application approval flow

---

## 🔧 **HOW TO USE IN YOUR CODE**

### **Method 1: Direct Fetch (Simple)**

```typescript
fetch('/.netlify/functions/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'booking_confirmation',
    to: 'businessowner@example.com',
    data: {
      businessName: 'Joe\'s Plumbing',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      customerPhone: '555-1234',
      bookingDate: '2025-11-01',
      bookingTime: '2:00 PM',
      message: 'Need help with leaky faucet'
    }
  })
})
```

---

### **Method 2: Notification Service (Recommended)**

```typescript
import { 
  notifyChangeRequestApproved,
  notifyChangeRequestRejected,
  notifyBookingReceived,
  notifyApplicationApproved
} from '@/services/emailNotificationService'

// Send change request approval
await notifyChangeRequestApproved(
  userEmail,
  'Business Name',
  'update',
  ['name', 'phone', 'hours']
)

// Send booking confirmation
await notifyBookingReceived(
  businessOwnerEmail,
  {
    businessName: 'Joe\'s Plumbing',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    bookingDate: '2025-11-01',
  }
)
```

---

## 📁 **FILE STRUCTURE**

```
bonita-forward/
├── src/
│   ├── emails/
│   │   ├── components/
│   │   │   ├── EmailLayout.tsx       # Base layout for all emails
│   │   │   └── EmailButton.tsx       # Reusable button component
│   │   ├── templates/
│   │   │   ├── ChangeRequestApproved.tsx
│   │   │   ├── ChangeRequestRejected.tsx
│   │   │   ├── BookingConfirmation.tsx
│   │   │   └── ApplicationApproved.tsx
│   │   └── index.ts                  # Central export
│   └── services/
│       └── emailNotificationService.ts  # Easy-to-use API
├── netlify/
│   └── functions/
│       └── send-email.ts             # Email sending function
└── RESEND-EMAIL-SETUP-GUIDE-2025-10-28.md  # This file
```

---

## 🎨 **ADDING NEW EMAIL TEMPLATES**

Want to add a new email type? Here's how:

### **1. Create the Template**

Create `src/emails/templates/YourNewEmail.tsx`:

```typescript
import { Heading, Text } from '@react-email/components'
import { EmailLayout } from '../components/EmailLayout'
import { EmailButton } from '../components/EmailButton'

interface YourNewEmailProps {
  userName: string
  // ... your props
}

export function YourNewEmail({ userName }: YourNewEmailProps) {
  return (
    <EmailLayout preview="Subject line preview">
      <Heading style={{ fontSize: '28px' }}>
        Hello {userName}!
      </Heading>
      
      <Text style={{ fontSize: '16px' }}>
        Your email content here...
      </Text>

      <EmailButton href="https://bonitaforward.com" variant="primary">
        Take Action
      </EmailButton>
    </EmailLayout>
  )
}
```

---

### **2. Export It**

Add to `src/emails/index.ts`:

```typescript
export { YourNewEmail } from './templates/YourNewEmail'
```

---

### **3. Add to Netlify Function**

Update `netlify/functions/send-email.ts`:

```typescript
import { YourNewEmail } from '../../src/emails'

// In the switch statement:
case 'your_new_email':
  html = render(YourNewEmail({
    userName: data.userName,
  }))
  subject = 'Your Email Subject'
  break
```

---

### **4. Add Helper Function**

Add to `src/services/emailNotificationService.ts`:

```typescript
export async function sendYourNewEmail(
  to: string,
  userName: string
) {
  return sendEmail('your_new_email', to, { userName })
}
```

---

### **5. Use It!**

```typescript
import { sendYourNewEmail } from '@/services/emailNotificationService'

await sendYourNewEmail('user@example.com', 'John')
```

**Done!** 🎉

---

## 💰 **PRICING**

### **Current Usage (Free Tier)**
- **3,000 emails/month** - FREE
- Perfect for starting out
- No credit card required

### **When You Need More**
- **$20/month** - 50,000 emails
- **$80/month** - 100,000 emails

**Estimate:** With 1,000 active businesses receiving ~5 emails/month each = 5,000 emails/month = **$20/month**

---

## 🚨 **TROUBLESHOOTING**

### **Problem: "Domain not verified" error**

**Solution:**
1. The Netlify function automatically falls back to `bonitaforward@gmail.com`
2. To fix permanently:
   - In Resend dashboard, go to "Domains"
   - Add your custom domain (e.g., `bonitaforward.com`)
   - Follow DNS instructions
   - Update `FROM_EMAIL` in `netlify/functions/send-email.ts`

---

### **Problem: Emails not sending**

**Check:**
1. ✅ `RESEND_API_KEY` is set in Netlify environment variables
2. ✅ Site has been redeployed after adding the variable
3. ✅ Sender email is verified in Resend dashboard
4. ✅ Check browser console for errors
5. ✅ Check Netlify function logs

---

### **Problem: Emails going to spam**

**Solutions:**
1. **Use custom domain** instead of Gmail
2. **Add SPF/DKIM records** (Resend provides these)
3. **Warm up** your sending - start slow, gradually increase
4. **Avoid spam words** in subject lines
5. **Include unsubscribe link** (already in footer)

---

## 📊 **ANALYTICS & MONITORING**

### **Resend Dashboard**
- **Delivery rates** - See how many emails are delivered
- **Open rates** - Track email opens
- **Click rates** - See link clicks
- **Bounce tracking** - Identify invalid emails
- **Spam reports** - Monitor spam complaints

**Access:** https://resend.com/emails

---

## 🎯 **NEXT STEPS**

### **High Priority:**
1. ✅ **DONE:** Change request notifications
2. ⏳ **TODO:** Integrate booking confirmations
3. ⏳ **TODO:** Add application approval emails
4. ⏳ **TODO:** Set up custom domain (optional)

### **Medium Priority:**
5. ⏳ **TODO:** Weekly activity digest emails
6. ⏳ **TODO:** Job post approval notifications
7. ⏳ **TODO:** Welcome emails for new users
8. ⏳ **TODO:** Password reset emails

### **Low Priority:**
9. ⏳ **TODO:** Marketing newsletters
10. ⏳ **TODO:** Promotional campaigns

---

## 🔐 **SECURITY BEST PRACTICES**

1. ✅ **Never expose API key** - It's in environment variables (secure)
2. ✅ **Validate email addresses** - Done in Netlify function
3. ✅ **Rate limiting** - Resend has built-in protection
4. ✅ **Error handling** - Emails fail gracefully without breaking app
5. ✅ **User privacy** - Only send to opted-in users

---

## 📞 **SUPPORT**

### **Resend Support:**
- **Docs:** https://resend.com/docs
- **Discord:** https://resend.com/discord
- **Email:** support@resend.com

### **Implementation Support:**
- Check this guide
- Review `src/services/emailNotificationService.ts`
- Review `netlify/functions/send-email.ts`
- Check browser console for errors

---

## ✨ **BENEFITS**

### **For Business Owners:**
- ✅ Never miss important updates
- ✅ Get notified immediately about bookings
- ✅ Know when change requests are approved/rejected
- ✅ Professional communication experience

### **For You (Admin):**
- ✅ Automated notifications = less manual work
- ✅ Better user experience
- ✅ Professional brand image
- ✅ Easy to add new email types
- ✅ Analytics to track engagement

---

## 🎉 **YOU'RE ALL SET!**

Follow the 5 setup steps above (takes ~10 minutes total), and you'll have a professional email notification system running!

**Questions?** Check the troubleshooting section or review the code examples above.

**Ready to go live?** Just complete Step 1-4 and test with Step 5!

---

**Last Updated:** October 28, 2025  
**Status:** ✅ Production Ready  
**Maintenance:** No ongoing maintenance required (serverless)

---

**Happy Emailing! 📧**

