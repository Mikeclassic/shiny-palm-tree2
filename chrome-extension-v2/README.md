# ClearSeller Chrome Extension 🔥

**Winning Product Finder for Dropshippers**

Automatically detect and import winning dropshipping products from AliExpress, Amazon, and Temu with intelligent AI-powered analysis.

---

## 🚀 Features

### 🎯 Intelligent Product Scoring (0-100)
- **Multi-factor analysis** evaluating:
  - Review count & quality (social proof)
  - Product ratings & customer satisfaction
  - Order volume (proven demand)
  - Profit potential & margins
- **Real-time scoring** on every product page
- **Visual indicators** showing winning products at a glance

### 🔍 Auto-Detection Mode
- **Automatically scans** search and category pages
- **Highlights winning products** with visual badges
- **Detects products meeting criteria:**
  - 500+ reviews
  - 4.3+ star rating
  - 1000+ orders
  - Good profit margins (30%+)

### 📦 One-Click Import
- **Scrapes all product data** automatically:
  - Title, price, images, description
  - Reviews, ratings, order count
  - Shipping times
- **Smart pricing algorithm** with 2-3x markups:
  - AliExpress: 2.5x markup
  - Amazon: 1.8x markup
  - Temu: 3.0x markup
- **Psychological pricing** ($X.99, $X.95 endings)
- **Auto-calculates profit margins**

### 📊 Floating Analytics Widget
- **Real-time winning score** displayed on product pages
- **Detailed breakdowns** of all metrics
- **Profit estimates** and recommendations
- **Draggable interface** for convenience

### 📈 Extension Dashboard
- **Track your imports** and success rate
- **View winning products** you've found
- **Import history** with timestamps
- **Statistics tracking**

---

## 📥 Installation

### Load Unpacked Extension (Development)

1. **Clone or download** this repository

2. **Open Chrome** and navigate to:
   ```
   chrome://extensions/
   ```

3. **Enable "Developer mode"** (toggle in top right)

4. **Click "Load unpacked"**

5. **Select the `chrome-extension` folder**

6. **Pin the extension** to your toolbar for easy access

### Update API URL

1. Click the extension icon
2. Go to **Settings** tab
3. Update **API URL** to your ClearSeller instance:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.vercel.app`
4. Click **Save Settings**

---

## 🎯 How to Use

### Method 1: Product Page Import

1. **Visit any product** on:
   - AliExpress (https://www.aliexpress.com)
   - Amazon (https://www.amazon.com)
   - Temu (https://www.temu.com)

2. **Wait for the extension** to analyze the product (2 seconds)

3. **Review the floating widget** showing:
   - Winning score (0-100)
   - Reviews, rating, orders
   - Winning potential (HIGH/MEDIUM/LOW)

4. **Click "View Analysis"** for detailed breakdown:
   - Score components
   - Profit estimates
   - Recommendations
   - Warnings

5. **Click "Import to ClearSeller"** to add product to your dashboard

### Method 2: Auto-Detection on Search Pages

1. **Search for products** on any supported platform

2. **The extension automatically scans** all visible products

3. **Winning products are highlighted** with 🔥 badges

4. **Click any product** to view details and import

### Method 3: Right-Click Import

1. **Right-click** on any product page
2. **Select "Import to ClearSeller"**
3. Product is automatically imported

---

## 🎨 Visual Indicators

### Winning Score Colors

- **🔥 Red (75-100)**: HIGH potential - strong winner
- **📈 Orange (50-74)**: MEDIUM potential - worth testing
- **📊 Yellow (25-49)**: LOW potential - risky
- **❓ Gray (0-24)**: Very low potential - avoid

### Score Components

Each product is scored across 4 dimensions:

1. **Reviews Score** (30% weight)
   - 10K+ reviews = 100 points
   - 5K+ reviews = 85 points
   - 1K+ reviews = 50 points

2. **Rating Score** (20% weight)
   - 4.7+ stars = 100 points
   - 4.5+ stars = 85 points
   - 4.3+ stars = 70 points

3. **Orders Score** (25% weight)
   - 50K+ orders = 100 points
   - 10K+ orders = 70 points
   - 1K+ orders = 30 points

4. **Profit Score** (25% weight)
   - <$10 supplier price = 100 points
   - $10-$20 = 80 points
   - $20-$30 = 60 points

---

## ⚙️ Configuration

### Settings (Extension Popup)

**API URL**
- Set your ClearSeller backend URL
- Required for importing products
- Must be logged in to your account

**Auto-Detect Winners**
- Enables automatic scanning of search pages
- Highlights winning products with badges
- Default: ON

**Show Floating Widget**
- Shows/hides the floating analytics widget
- Default: ON

### Advanced Configuration (config.js)

```javascript
WINNING_PRODUCT_CRITERIA: {
  minReviews: 500,           // Minimum reviews required
  minRating: 4.3,            // Minimum rating (out of 5)
  minOrders: 1000,           // Minimum total orders
  maxPrice: 50,              // Maximum supplier price
  minProfitMargin: 30,       // Minimum profit margin %

  weights: {
    reviews: 0.3,            // 30% weight
    rating: 0.2,             // 20% weight
    orders: 0.25,            // 25% weight
    profit: 0.25             // 25% weight
  }
}
```

---

## 🔧 File Structure

```
chrome-extension/
├── manifest.json              # Extension configuration
├── config.js                  # Settings & thresholds
├── background.js              # Service worker (API calls)
├── content.js                 # Main content script
├── winning-detector.js        # Scoring algorithm
├── auto-detector.js           # Auto-scan functionality
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup functionality
├── styles.css                 # Extension styles
├── scrapers/
│   ├── aliexpress.js         # AliExpress scraper
│   ├── amazon.js             # Amazon scraper
│   └── temu.js               # Temu scraper
└── icons/
    ├── icon16.png            # Extension icon (16x16)
    ├── icon48.png            # Extension icon (48x48)
    └── icon128.png           # Extension icon (128x128)
```

---

## 🎯 Supported Platforms

### ✅ AliExpress
- Product pages: ✅
- Search pages: ✅
- Category pages: ✅
- Auto-detection: ✅

### ✅ Amazon
- Product pages: ✅
- Search pages: ✅
- Category pages: ✅
- Auto-detection: ✅

### ✅ Temu
- Product pages: ✅
- Search pages: ✅
- Category pages: ✅
- Auto-detection: ✅

---

## 🔐 Authentication

The extension uses your existing ClearSeller login session:

1. **Log in** to your ClearSeller account at your API URL
2. **The extension automatically** uses your session cookies
3. **No additional login** required in the extension

**Note**: You must be logged in to ClearSeller to import products.

---

## 🐛 Troubleshooting

### Extension not detecting products
- Wait 2-3 seconds after page load
- Check if you're on a product page
- Try refreshing the page
- Check console for errors (F12 → Console)

### Import failing
- Ensure you're logged in to ClearSeller
- Check API URL in settings is correct
- Verify network connection
- Check if you've hit daily import limits (10 for free users)

### Floating widget not showing
- Check "Show Floating Widget" is enabled in settings
- Some pages may not be supported
- Try refreshing the page

### Auto-detection not working
- Check "Auto-Detect Winners" is enabled in settings
- Some search pages may have different layouts
- Try scrolling to load more products

---

## 📊 How Winning Products Are Detected

The extension uses a **multi-factor scoring algorithm**:

```
Total Score = (Reviews × 0.3) + (Rating × 0.2) + (Orders × 0.25) + (Profit × 0.25)
```

### Winning Product Criteria:
- ✅ Total score ≥ 70 (out of 100)
- ✅ OR Profit margin ≥ 40%
- ✅ Rating ≥ 4.3 stars
- ✅ Reviews ≥ 500

### Red Flags:
- ⚠️ Low reviews despite high orders
- ⚠️ Rating below 4.0
- ⚠️ Supplier price too high (>$50)
- ⚠️ Limited product images

---

## 🚀 Performance Tips

1. **Enable auto-detection** for search pages to find winners faster
2. **Use the floating widget** to quickly assess products
3. **Check detailed analysis** before importing
4. **Focus on scores ≥ 75** for best results
5. **Consider warnings** in the analysis

---

## 📝 Best Practices

### Finding Winning Products

1. **Start with high-volume categories**
   - Fashion accessories
   - Home & kitchen
   - Phone accessories
   - Beauty tools

2. **Look for proven demand**
   - 1000+ orders minimum
   - 4.5+ star ratings
   - Recent reviews (product is still trending)

3. **Prioritize profit margins**
   - Target 40%+ margins
   - Low supplier costs (<$20)
   - High perceived value

4. **Validate before importing**
   - Check competitor prices
   - Read recent reviews
   - Verify shipping times

---

## 🔄 Updates & Changelog

### Version 1.0.0 (Current)
- ✅ Initial release
- ✅ Support for AliExpress, Amazon, Temu
- ✅ Intelligent winning product detection
- ✅ Auto-detection mode
- ✅ One-click import
- ✅ Floating analytics widget
- ✅ Extension dashboard

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review your ClearSeller dashboard logs
3. Contact support through the ClearSeller app

---

## 📄 License

This extension is part of the ClearSeller platform.

---

## 🎉 Happy Dropshipping!

Find winning products faster and build your dropshipping empire with intelligent automation.

**Made with ⚡ by ClearSeller**
