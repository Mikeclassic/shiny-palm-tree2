# Quick Installation Guide

## 🚀 Install in 3 Steps

### 1. Load the Extension

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right corner)
3. Click **"Load unpacked"**
4. Select the `chrome-extension` folder from this project

### 2. Configure API URL

1. Click the ClearSeller extension icon in your toolbar
2. Go to the **Settings** tab
3. Update **API URL**:
   - **Development**: `http://localhost:3000`
   - **Production**: `https://your-app.vercel.app`
4. Click **Save Settings**

### 3. Log In to ClearSeller

1. Open a new tab and visit your ClearSeller app
2. Log in with your account
3. The extension will automatically use your session

---

## ✅ You're Ready!

Visit any of these sites and the extension will automatically activate:
- **AliExpress**: https://www.aliexpress.com
- **Amazon**: https://www.amazon.com
- **Temu**: https://www.temu.com

---

## 🎯 Quick Test

1. Go to AliExpress
2. Search for "phone holder" or any product
3. Open a product page
4. Wait 2 seconds
5. You should see:
   - A floating widget with the winning score
   - An "Import to ClearSeller" button

---

## 📝 Notes

### Icon Placeholders
The extension currently uses placeholder icons. To add custom icons:

1. Create/add these files in the `icons/` folder:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)

2. Recommended design:
   - ⚡ Lightning bolt symbol (matching ClearSeller branding)
   - Colors: Dark blue/slate background (#0f172a)
   - White or orange accent

### For Production

Update the manifest.json `host_permissions` to include your production domain:

```json
"host_permissions": [
  "https://your-production-domain.com/*",
  "https://*.aliexpress.com/*",
  "https://*.amazon.com/*",
  "https://*.temu.com/*"
]
```

---

## 🐛 Troubleshooting

**Extension not loading?**
- Make sure Developer mode is enabled
- Check for errors in chrome://extensions/
- Try removing and re-adding the extension

**Products not importing?**
- Verify you're logged in to ClearSeller
- Check the API URL in settings is correct
- Open DevTools (F12) and check Console for errors

**Widget not showing?**
- Wait 2-3 seconds after page loads
- Make sure you're on a product page (not search)
- Check Settings → "Show Floating Widget" is enabled

---

## 🎉 Done!

You're all set to find winning products automatically!
