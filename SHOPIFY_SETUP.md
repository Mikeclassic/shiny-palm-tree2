# Shopify App Setup Guide

## The Error You're Seeing

**"The installation link for this app is invalid"** means Shopify can't find your app configuration. This happens when:
- The app isn't set to "Custom" or "Public" distribution
- The redirect URL doesn't match exactly
- The app credentials aren't configured in your environment variables

---

## Complete Step-by-Step Setup

### Step 1: Create Shopify Partner Account
1. Go to https://partners.shopify.com/
2. Click "Sign Up" and create a free Partner account
3. Verify your email address

---

### Step 2: Create a New App
1. Log into Shopify Partners
2. Click **"Apps"** in the left sidebar
3. Click **"Create app"** button
4. Select **"Create app manually"**
5. Enter app name: `ClearSeller` (or your preferred name)
6. Click **"Create"**

---

### Step 3: Configure App URLs (CRITICAL)
1. In your app dashboard, click **"Configuration"** tab
2. Scroll to **"App URL"** section:
   ```
   https://yourdomain.com/dashboard/stores
   ```
   Replace `yourdomain.com` with your actual domain

3. Scroll to **"Allowed redirection URL(s)"**:
   ```
   https://yourdomain.com/api/stores/shopify/callback
   ```
   ⚠️ **MUST match exactly** - including https:// and the exact path

4. Click **"Save and release"** at the top right

---

### Step 4: Set API Access Scopes
1. Still in **"Configuration"** tab
2. Scroll to **"Admin API integration"** section
3. Under **"Admin API access scopes"**, click **"Configure"**
4. Search and select these **4 scopes**:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_inventory`
   - ✅ `write_inventory`

5. Click **"Save"** at the bottom

---

### Step 5: Enable Distribution (FIXES THE ERROR)
This is the **MOST IMPORTANT** step that fixes your error!

1. Click **"Distribution"** tab in the left sidebar
2. Under **"Distribution method"**, you have 2 options:

   **Option A: Custom Distribution (Recommended for Testing)**
   - Select **"Custom distribution"**
   - This allows you to manually install on specific stores
   - Click **"Save"**

   **Option B: Public Distribution (For Production)**
   - Select **"Public distribution"**
   - Fill in the required app listing details
   - Submit for Shopify review (takes 3-5 business days)

3. **For now, choose "Custom distribution"** to test immediately

---

### Step 6: Get Your API Credentials
1. Go back to **"Overview"** tab
2. Find **"Client credentials"** section
3. Copy these values:
   - **Client ID** → This is your `SHOPIFY_API_KEY`
   - **Client secret** → Click "Show" and copy → This is your `SHOPIFY_API_SECRET`

---

### Step 7: Add Environment Variables to Vercel
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click **"Settings"** → **"Environment Variables"**
4. Add these two variables:

   **Variable 1:**
   ```
   Name: SHOPIFY_API_KEY
   Value: [paste Client ID from Step 6]
   Environments: ✅ Production ✅ Preview ✅ Development
   ```

   **Variable 2:**
   ```
   Name: SHOPIFY_API_SECRET
   Value: [paste Client secret from Step 6]
   Environments: ✅ Production ✅ Preview ✅ Development
   ```

5. Click **"Save"**

---

### Step 8: Redeploy Your App
1. In Vercel, go to **"Deployments"** tab
2. Click the three dots (**...**) on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (usually 1-2 minutes)

---

### Step 9: Test the Connection

**For Custom Distribution:**
1. In Shopify Partners, go to your app
2. Click **"Test your app"** or **"Select store"**
3. Choose a development store (or create one)
4. Click **"Install app"**
5. You should see the OAuth consent screen
6. Click **"Install"**

**OR from your ClearSeller app:**
1. Log into your ClearSeller app at `https://yourdomain.com`
2. Go to **Store Connections** page
3. Click **"Connect Shopify Store"**
4. Enter your Shopify store domain (e.g., `my-test-store`)
5. Click **"Connect Shopify"**
6. You'll be redirected to Shopify to approve permissions
7. After approval, you'll be redirected back to ClearSeller

---

## Common Issues & Solutions

### Issue: "Installation link is invalid"
**Solution:** Make sure you've set the app to "Custom distribution" in Step 5

### Issue: "Redirect URI mismatch"
**Solution:** Double-check that the redirect URL in Shopify exactly matches:
```
https://yourdomain.com/api/stores/shopify/callback
```

### Issue: "API credentials not found"
**Solution:**
1. Verify environment variables are set in Vercel
2. Redeploy after adding environment variables
3. Check that you're using the Client ID (not API key from other sections)

### Issue: "App is not responding"
**Solution:**
1. Make sure your app is deployed and accessible
2. Test the callback URL directly: `https://yourdomain.com/api/stores/shopify/callback`
3. Check Vercel deployment logs for errors

---

## Quick Checklist

Before testing, verify:
- [ ] Shopify Partner account created
- [ ] App created in Partners dashboard
- [ ] App URL set to: `https://yourdomain.com/dashboard/stores`
- [ ] Redirect URL set to: `https://yourdomain.com/api/stores/shopify/callback`
- [ ] API scopes configured (read/write products and inventory)
- [ ] Distribution set to "Custom distribution"
- [ ] Client ID and Client secret copied
- [ ] Environment variables added to Vercel
- [ ] App redeployed after adding environment variables

---

## Need Help?

If you're still seeing errors:
1. Check Vercel deployment logs: `vercel logs`
2. Check browser console for JavaScript errors
3. Verify the redirect URL in the browser address bar matches exactly
4. Make sure you're using HTTPS (not HTTP) in production

---

## Testing with Development Store

To create a test Shopify store:
1. In Shopify Partners dashboard
2. Click **"Stores"** in left sidebar
3. Click **"Add store"** → **"Development store"**
4. Fill in store details and create
5. Use this store to test your app installation
