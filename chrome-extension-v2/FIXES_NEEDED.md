# Extension Fixes Needed

## Issues Found:

### 1. ✅ Download Page - FIXED
- Build error with Buffer type in `/src/app/api/download-extension/route.ts`
- **Status**: Fixed and deployed

### 2. ❌ AliExpress Scraper - Incorrect Data
- **Issue**: Reviews showing as 47 instead of 900
- **Issue**: Rating showing as 0 instead of 4.7
- **Root Cause**: AliExpress changed their HTML structure
- **Fix**: Update selectors in `scrapers/aliexpress.js`

### 3. ❌ Import Button Not Responding
- **Error**: `Cannot read properties of null (reading 'addEventListener')`
- **Location**: `content.js:273`
- **Root Cause**: Button element not found when trying to add event listener
- **Fix**: Add null checks before addEventListener

### 4. ❌ No Bulk Import UI
- **Issue**: Auto-detector finds 11 products but no way to import them
- **Current**: Only shows in console logs
- **Needed**: Floating panel with list of detected products and bulk import button

### 5. ❌ Auto-Detector Running Too Frequently
- **Issue**: Scanning every few seconds (logs show repeated scans)
- **Impact**: Performance issues, unnecessary processing
- **Fix**: Better debouncing, only scan on page load and manual trigger

---

## Implementation Plan:

### Priority 1: Fix Scraping (Immediate)
Update AliExpress scraper with correct selectors for 2024 site structure

### Priority 2: Fix Import Button (Immediate)
Add proper null checks and error handling

### Priority 3: Add Bulk Import UI (High)
Create floating panel that shows:
- List of detected winning products
- Individual import buttons
- "Import All" button
- Product scores and key metrics

### Priority 4: Optimize Auto-Detector (Medium)
Reduce scan frequency, add manual refresh button

---

## Quick Fix Commands:

```bash
# Update extension
cd chrome-extension

# Test scraper on real page
# Open DevTools Console on AliExpress product page
# Look for [AliExpress Scraper] logs
# Check extracted data values

# Reload extension after fixes
# chrome://extensions/ → Click reload
```

---

## Next Steps:

1. Fix scrapers with updated selectors
2. Fix import button error handling
3. Create bulk import UI component
4. Test on real product pages
5. Commit and push updates
