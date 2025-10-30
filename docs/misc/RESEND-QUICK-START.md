# Resend Email - Quick Start Guide
## 3-Minute Setup for Bonita Forward

---

## 🚀 **GET STARTED IN 3 STEPS**

### **1. Sign Up (2 min)**
1. Go to https://resend.com
2. Sign up with `bonitaforward@gmail.com`
3. Verify email

### **2. Get API Key (1 min)**
1. Dashboard → "API Keys"
2. Create key: `Bonita Forward Production`
3. Copy key (starts with `re_`)

### **3. Add to Netlify (2 min)**
1. Netlify Dashboard → Your site
2. "Site configuration" → "Environment variables"
3. Add variable:
   - Key: `RESEND_API_KEY`
   - Value: [Your API key]
4. **Redeploy site**

### **4. Test (1 min)**
```javascript
// Browser console on your site:
fetch('/.netlify/functions/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'application_approved',
    to: 'bonitaforward@gmail.com',
    data: {
      businessName: 'Test',
      category: 'Services',
      tier: 'free'
    }
  })
}).then(r => r.json()).then(console.log)
```

**Check your email!** 📧

---

## 📝 **NOTE: About Sender Verification**

**Good news:** Since you signed up with `bonitaforward@gmail.com`, Resend automatically allows you to send from that address!

The Netlify function is already configured to:
1. Try sending from a custom domain first (if you set one up)
2. **Automatically fall back to `bonitaforward@gmail.com`** (works immediately)

**Want a custom domain?** (Optional)
- Go to Resend Dashboard → "Domains" → "+ Add domain"
- Follow the DNS instructions to verify your domain
- Update `FROM_EMAIL` in `netlify/functions/send-email.ts`

---

## 📧 **AVAILABLE EMAILS**

### Already Integrated ✅
- Change Request Approved
- Change Request Rejected

### Ready to Use 🎯
- Booking Confirmation
- Application Approved

---

## 💻 **QUICK CODE EXAMPLES**

```typescript
import {
  notifyChangeRequestApproved,
  notifyBookingReceived,
} from '@/services/emailNotificationService'

// Approve request
await notifyChangeRequestApproved(
  'user@example.com',
  'Business Name',
  'update',
  ['name', 'phone']
)

// New booking
await notifyBookingReceived(
  'owner@example.com',
  {
    businessName: 'Joe\'s Plumbing',
    customerName: 'Jane',
    customerEmail: 'jane@example.com',
    bookingDate: '2025-11-01'
  }
)
```

---

## 💰 **PRICING**

- **Free:** 3,000 emails/month
- **Paid:** $20/month for 50,000 emails

---

## 📚 **FULL DOCS**

See `RESEND-EMAIL-SETUP-GUIDE-2025-10-28.md` for complete documentation.

---

**That's it!** You're ready to send professional emails. 🎉

