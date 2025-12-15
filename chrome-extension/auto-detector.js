// Auto-Detection Mode - Automatically scan pages for winning products
class AutoDetector {
  constructor() {
    this.isEnabled = true;
    this.scannedProducts = new Set();
    this.winningProducts = [];

    // Load settings
    this.loadSettings();
  }

  async loadSettings() {
    const settings = await chrome.storage.sync.get(['autoDetect']);
    this.isEnabled = settings.autoDetect !== false;
  }

  /**
   * Scan current page for products
   */
  scanPage() {
    if (!this.isEnabled) return;

    const platform = this.detectPlatform();
    if (!platform) return;

    console.log('[ClearSeller Auto-Detector] Scanning page for winning products...');

    if (platform === 'aliexpress') {
      this.scanAliExpress();
    } else if (platform === 'amazon') {
      this.scanAmazon();
    } else if (platform === 'temu') {
      this.scanTemu();
    }
  }

  detectPlatform() {
    const url = window.location.href;
    if (url.includes('aliexpress')) return 'aliexpress';
    if (url.includes('amazon')) return 'amazon';
    if (url.includes('temu')) return 'temu';
    return null;
  }

  /**
   * Scan AliExpress search/category pages
   */
  scanAliExpress() {
    // Find all product cards on search/category pages
    const selectors = [
      '[class*="search-card-item"]',
      '[class*="product-item"]',
      '.list-item',
      'a[href*="/item/"]'
    ];

    for (const selector of selectors) {
      const products = document.querySelectorAll(selector);

      if (products.length > 0) {
        console.log(`[Auto-Detector] Found ${products.length} products`);

        products.forEach(product => {
          this.analyzeProductCard(product, 'aliexpress');
        });

        break;
      }
    }
  }

  /**
   * Scan Amazon search/category pages
   */
  scanAmazon() {
    const selectors = [
      '[data-component-type="s-search-result"]',
      '.s-result-item',
      '[data-asin]'
    ];

    for (const selector of selectors) {
      const products = document.querySelectorAll(selector);

      if (products.length > 0) {
        console.log(`[Auto-Detector] Found ${products.length} products`);

        products.forEach(product => {
          const asin = product.getAttribute('data-asin');
          if (asin && !this.scannedProducts.has(asin)) {
            this.analyzeProductCard(product, 'amazon');
            this.scannedProducts.add(asin);
          }
        });

        break;
      }
    }
  }

  /**
   * Scan Temu search/category pages
   */
  scanTemu() {
    const selectors = [
      '[class*="goods-item"]',
      '[class*="product-card"]',
      'a[href*="/goods"]'
    ];

    for (const selector of selectors) {
      const products = document.querySelectorAll(selector);

      if (products.length > 0) {
        console.log(`[Auto-Detector] Found ${products.length} products`);

        products.forEach(product => {
          this.analyzeProductCard(product, 'temu');
        });

        break;
      }
    }
  }

  /**
   * Analyze a product card on listing pages
   */
  analyzeProductCard(element, platform) {
    try {
      // Extract basic data from card
      const data = this.extractCardData(element, platform);

      if (!data) return;

      // Quick winning product check
      const analysis = window.winningDetector?.analyzeProduct(data);

      if (analysis && analysis.isWinner) {
        console.log('[Auto-Detector] 🔥 WINNING PRODUCT FOUND:', data.title);

        // Add visual indicator
        this.addWinnerBadge(element, analysis.totalScore);

        // Save to winning products list
        this.winningProducts.push({
          ...data,
          analysis,
          foundAt: new Date().toISOString()
        });

        // Notify background script
        chrome.runtime.sendMessage({
          action: 'winnerDetected',
          product: data,
          analysis
        });
      }
    } catch (error) {
      console.error('[Auto-Detector] Error analyzing product:', error);
    }
  }

  /**
   * Extract data from product card
   */
  extractCardData(element, platform) {
    try {
      let data = {
        title: '',
        price: 0,
        supplierPrice: 0,
        rating: 0,
        reviewCount: 0,
        orderCount: 0,
        source: platform
      };

      if (platform === 'aliexpress') {
        data.title = element.querySelector('[class*="title"], h1, h3')?.textContent.trim() || '';
        data.price = this.parsePrice(element.querySelector('[class*="price"]')?.textContent);
        data.supplierPrice = data.price;
        data.rating = parseFloat(element.querySelector('[class*="rating"]')?.textContent) || 0;
        data.reviewCount = this.parseNumber(element.querySelector('[class*="review"]')?.textContent);
        data.orderCount = this.parseNumber(element.querySelector('[class*="sold"]')?.textContent);
      } else if (platform === 'amazon') {
        data.title = element.querySelector('h2, .s-title-instructions-style')?.textContent.trim() || '';
        data.price = this.parsePrice(element.querySelector('.a-price .a-offscreen')?.textContent);
        data.supplierPrice = data.price;
        data.rating = parseFloat(element.querySelector('.a-icon-star-small .a-icon-alt')?.textContent) || 0;
        data.reviewCount = this.parseNumber(element.querySelector('[aria-label*="stars"]')?.getAttribute('aria-label'));
      } else if (platform === 'temu') {
        data.title = element.querySelector('[class*="title"]')?.textContent.trim() || '';
        data.price = this.parsePrice(element.querySelector('[class*="price"]')?.textContent);
        data.supplierPrice = data.price;
        data.rating = parseFloat(element.querySelector('[class*="rating"]')?.textContent) || 0;
        data.reviewCount = this.parseNumber(element.querySelector('[class*="review"]')?.textContent);
      }

      // Validate required fields
      if (!data.title || !data.price) return null;

      return data;
    } catch (error) {
      console.error('[Auto-Detector] Error extracting card data:', error);
      return null;
    }
  }

  /**
   * Add visual winner badge to product card
   */
  addWinnerBadge(element, score) {
    // Don't add duplicate badges
    if (element.querySelector('.clearseller-winner-badge')) return;

    const badge = document.createElement('div');
    badge.className = 'clearseller-winner-badge';
    badge.innerHTML = `
      <span class="badge-icon">🔥</span>
      <span class="badge-text">WINNER</span>
      <span class="badge-score">${score}</span>
    `;

    // Add styles
    badge.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      z-index: 10;
      animation: pulse 2s infinite;
    `;

    // Make parent relative if needed
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(badge);

    // Add pulse animation
    if (!document.getElementById('clearseller-animations')) {
      const style = document.createElement('style');
      style.id = 'clearseller-animations';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Parse price from text
   */
  parsePrice(text) {
    if (!text) return 0;
    const price = parseFloat(text.replace(/[^0-9.]/g, ''));
    return isNaN(price) ? 0 : price;
  }

  /**
   * Parse number from text (handles K, M suffixes)
   */
  parseNumber(text) {
    if (!text) return 0;

    const cleaned = text.replace(/[^0-9KkMm.]/g, '');
    let multiplier = 1;

    if (cleaned.toLowerCase().includes('k')) multiplier = 1000;
    if (cleaned.toLowerCase().includes('m')) multiplier = 1000000;

    const num = parseFloat(cleaned.replace(/[KkMm]/g, ''));
    return isNaN(num) ? 0 : num * multiplier;
  }

  /**
   * Get winning products found
   */
  getWinningProducts() {
    return this.winningProducts;
  }

  /**
   * Clear scanned products
   */
  reset() {
    this.scannedProducts.clear();
    this.winningProducts = [];
  }
}

// Initialize auto-detector
window.autoDetector = new AutoDetector();

// Run scan when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.autoDetector.scanPage(), 2000);
  });
} else {
  setTimeout(() => window.autoDetector.scanPage(), 2000);
}

// Re-scan when page changes (for infinite scroll, etc.)
let lastScanTime = Date.now();
const observer = new MutationObserver(() => {
  // Debounce - only scan every 3 seconds
  if (Date.now() - lastScanTime > 3000) {
    lastScanTime = Date.now();
    window.autoDetector.scanPage();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
