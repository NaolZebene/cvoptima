# STRIPE PAYMENT SETUP GUIDE

## 🚀 **Complete Stripe Integration for CVOptima**

### **Prerequisites:**
1. Stripe account: https://dashboard.stripe.com/register
2. Test mode enabled (for development)
3. Backend running on `http://localhost:3000`

---

## 📋 **STEP-BY-STEP SETUP**

### **Step 1: Get Stripe API Keys**

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### **Step 2: Create Products & Prices**

#### **Create Basic Plan:**
1. Go to: https://dashboard.stripe.com/test/products/create
2. **Product name**: `CVOptima Basic`
3. **Description**: `Essential CV optimization tools`
4. Click **Add price**:
   - **Price type**: Recurring
   - **Billing period**: Monthly
   - **Price**: $9.99 USD
   - Click **Save**
5. Copy the **Price ID** (starts with `price_`)

#### **Create Premium Plan:**
1. Go to: https://dashboard.stripe.com/test/products/create
2. **Product name**: `CVOptima Premium`
3. **Description**: `Complete CV optimization suite`
4. Click **Add price**:
   - **Price type**: Recurring
   - **Billing period**: Monthly
   - **Price**: $19.99 USD
   - Click **Save**
5. Copy the **Price ID** (starts with `price_`)

### **Step 3: Configure Environment Variables**

Update `backend/.env` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Stripe Price IDs (from Step 2)
STRIPE_BASIC_PRICE_ID=price_your_basic_price_id_here
STRIPE_PREMIUM_PRICE_ID=price_your_premium_price_id_here

# Webhook Secret (from Step 4)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### **Step 4: Set Up Webhooks (Development)**

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Linux
   curl -s https://packages.stripe.dev/api/archive.key | sudo gpg --dearmor -o /usr/share/keyrings/stripe-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/stripe-archive-keyring.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
   sudo apt update && sudo apt install stripe
   
   # Windows (via scoop)
   scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
   scoop install stripe
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Start webhook forwarding:**
   ```bash
   stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
   ```

4. **Copy the webhook secret** (starts with `whsec_`) and add it to your `.env` file.

### **Step 5: Restart Backend**

```bash
cd backend
npm start
```

---

## 🧪 **TESTING THE INTEGRATION**

### **Test 1: Check Stripe Configuration**
```bash
curl http://localhost:3000/api/v1/stripe/config
```
Should return: `{"isConfigured": true, ...}`

### **Test 2: Get Available Plans**
```bash
curl http://localhost:3000/api/v1/stripe/plans
```
Should return all three plans with price IDs.

### **Test 3: Create Test Customer**
1. Register a user on the frontend
2. Check Stripe dashboard: https://dashboard.stripe.com/test/customers
3. You should see the customer created

### **Test 4: Test Checkout Flow**
1. Login with a test user
2. Go to Subscription page
3. Click "Subscribe to Basic"
4. You should be redirected to Stripe checkout
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. Check user subscription is updated

---

## 💳 **TEST CREDIT CARDS**

Use these test cards in Stripe checkout:

| Card Number | Expiry | CVC | Result |
|-------------|--------|-----|--------|
| `4242 4242 4242 4242` | Any future date | Any 3 digits | **Success** |
| `4000 0000 0000 3220` | Any future date | Any 3 digits | **3D Secure required** |
| `4000 0000 0000 9995` | Any future date | Any 3 digits | **Insufficient funds** |
| `4000 0000 0000 0341` | Any future date | Any 3 digits | **Attach payment method** |

---

## 🔧 **TROUBLESHOOTING**

### **Issue: "Payment system is not configured"**
**Solution:**
1. Check `.env` file has correct Stripe keys
2. Verify keys are not placeholder values
3. Restart backend after updating `.env`

### **Issue: "Invalid price ID"**
**Solution:**
1. Verify price IDs in `.env` match Stripe dashboard
2. Check products are created in test mode
3. Ensure prices are active

### **Issue: Webhook errors**
**Solution:**
1. Make sure Stripe CLI is running: `stripe listen`
2. Verify webhook secret in `.env` matches CLI output
3. Check backend is running on port 3000

### **Issue: Customer not created**
**Solution:**
1. Check user registration is working
2. Verify Stripe API key has correct permissions
3. Check backend logs for Stripe errors

---

## 🚀 **GOING TO PRODUCTION**

### **1. Switch to Live Mode**
1. In Stripe dashboard, toggle from **Test** to **Live**
2. Get live API keys from: https://dashboard.stripe.com/apikeys
3. Update `.env` with live keys

### **2. Create Live Products**
1. Create same products in live mode
2. Update price IDs in `.env`

### **3. Configure Webhooks (Production)**
1. In Stripe dashboard: Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/v1/stripe/webhook`
3. Select events to listen for
4. Copy webhook secret and update `.env`

### **4. Update Frontend URLs**
Update success/cancel URLs in frontend to use your production domain.

---

## 📞 **SUPPORT**

### **Stripe Documentation:**
- API Reference: https://stripe.com/docs/api
- Checkout: https://stripe.com/docs/payments/checkout
- Webhooks: https://stripe.com/docs/webhooks

### **CVOptima Issues:**
Check backend logs for detailed error messages:
```bash
cd backend
npm start  # View logs in terminal
```

### **Common Error Messages:**
- `Invalid API Key` → Check STRIPE_SECRET_KEY in `.env`
- `No such price` → Verify price IDs exist in Stripe
- `Webhook signature verification failed` → Check STRIPE_WEBHOOK_SECRET

---

## ✅ **VERIFICATION CHECKLIST**

- [ ] Stripe test API keys configured
- [ ] Products and prices created in Stripe
- [ ] Price IDs added to `.env`
- [ ] Webhook forwarding running
- [ ] Backend restarted with new config
- [ ] Test checkout works with test card
- [ ] Subscription updates user in database
- [ ] Customer portal accessible

---

**🎉 Your Stripe payment integration is now complete!**