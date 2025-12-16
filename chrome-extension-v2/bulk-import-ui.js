// Bulk Import UI - Show all detected products and allow bulk import
class BulkImportUI {
  constructor() {
    this.products = [];
    this.selectedProducts = new Set();
    this.isScrapingMultiplePages = false;
    this.currentPage = 1;
    this.maxPages = 50; // Maximum pages to scrape
    this.panel = null;
  }

  /**
   * Show the bulk import panel
   */
  show() {
    if (this.panel) {
      this.panel.style.display = 'flex';
      return;
    }

    this.createPanel();
    this.updateProductList();
  }

  /**
   * Hide the bulk import panel
   */
  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }

  /**
   * Create the floating panel UI
   */
  createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'clearseller-bulk-panel';
    this.panel.innerHTML = `
      <div class="bulk-panel-header">
        <div class="bulk-panel-title">
          <span class="bulk-icon">📦</span>
          <span>Bulk Product Import</span>
          <span class="product-count">0 products</span>
        </div>
        <button class="bulk-close-btn" id="bulk-close">✕</button>
      </div>

      <div class="bulk-panel-controls">
        <button class="bulk-btn bulk-btn-primary" id="bulk-scan-current">
          🔍 Scan This Page
        </button>
        <button class="bulk-btn bulk-btn-secondary" id="bulk-scan-all">
          🚀 Scan All Pages (${this.maxPages} max)
        </button>
        <button class="bulk-btn bulk-btn-success" id="bulk-import-selected" disabled>
          ⬆️ Import Selected (<span id="selected-count">0</span>)
        </button>
      </div>

      <div class="bulk-panel-products" id="bulk-products-list">
        <div class="bulk-empty-state">
          <div class="empty-icon">📭</div>
          <p>No products detected yet</p>
          <p class="empty-subtitle">Click "Scan This Page" to find products</p>
        </div>
      </div>

      <div class="bulk-panel-footer">
        <div class="bulk-stats">
          <span>Page <span id="current-page">1</span></span>
          <span>•</span>
          <span><span id="total-products">0</span> total products</span>
          <span>•</span>
          <span><span id="winners-count">0</span> winners</span>
        </div>
      </div>
    `;

    // Add styles
    this.addStyles();

    // Add event listeners
    this.attachEventListeners();

    document.body.appendChild(this.panel);
  }

  /**
   * Add CSS styles for the panel
   */
  addStyles() {
    if (document.getElementById('clearseller-bulk-styles')) return;

    const style = document.createElement('style');
    style.id = 'clearseller-bulk-styles';
    style.textContent = `
      #clearseller-bulk-panel {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 450px;
        max-height: calc(100vh - 100px);
        background: linear-gradient(to bottom, #ffffff, #f8f9fa);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        border: 2px solid #10b981;
      }

      .bulk-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border-radius: 14px 14px 0 0;
      }

      .bulk-panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: bold;
      }

      .bulk-icon {
        font-size: 20px;
      }

      .product-count {
        background: rgba(255, 255, 255, 0.2);
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }

      .bulk-close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .bulk-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      .bulk-panel-controls {
        padding: 16px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        background: white;
        border-bottom: 1px solid #e5e7eb;
      }

      .bulk-btn {
        flex: 1;
        min-width: 120px;
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .bulk-btn-primary {
        background: #3b82f6;
        color: white;
      }

      .bulk-btn-primary:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .bulk-btn-secondary {
        background: #8b5cf6;
        color: white;
      }

      .bulk-btn-secondary:hover {
        background: #7c3aed;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
      }

      .bulk-btn-success {
        background: #10b981;
        color: white;
      }

      .bulk-btn-success:hover:not(:disabled) {
        background: #059669;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }

      .bulk-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .bulk-panel-products {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f9fafb;
      }

      .bulk-empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #9ca3af;
      }

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .empty-subtitle {
        font-size: 12px;
        margin-top: 8px;
      }

      .bulk-product-card {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 10px;
        display: flex;
        gap: 12px;
        transition: all 0.2s;
        position: relative;
      }

      .bulk-product-card:hover {
        border-color: #10b981;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
      }

      .bulk-product-card.selected {
        border-color: #10b981;
        background: #f0fdf4;
      }

      .bulk-product-checkbox {
        width: 20px;
        height: 20px;
        cursor: pointer;
        accent-color: #10b981;
      }

      .bulk-product-image {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        object-fit: cover;
        background: #f3f4f6;
      }

      .bulk-product-info {
        flex: 1;
        min-width: 0;
      }

      .bulk-product-title {
        font-size: 13px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 6px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .bulk-product-meta {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #6b7280;
      }

      .bulk-product-meta span {
        display: flex;
        align-items: center;
        gap: 3px;
      }

      .bulk-winner-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 3px;
      }

      .bulk-panel-footer {
        padding: 12px 16px;
        background: white;
        border-top: 1px solid #e5e7eb;
        border-radius: 0 0 14px 14px;
      }

      .bulk-stats {
        display: flex;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        color: #6b7280;
      }

      .bulk-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #6b7280;
      }

      .bulk-loading-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #e5e7eb;
        border-top-color: #10b981;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Scrollbar styling */
      .bulk-panel-products::-webkit-scrollbar {
        width: 8px;
      }

      .bulk-panel-products::-webkit-scrollbar-track {
        background: #f3f4f6;
      }

      .bulk-panel-products::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
      }

      .bulk-panel-products::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Attach event listeners to buttons
   */
  attachEventListeners() {
    // Close button
    this.panel.querySelector('#bulk-close').addEventListener('click', () => {
      this.hide();
    });

    // Scan current page
    this.panel.querySelector('#bulk-scan-current').addEventListener('click', () => {
      this.scanCurrentPage();
    });

    // Scan all pages
    this.panel.querySelector('#bulk-scan-all').addEventListener('click', () => {
      this.startMultiPageScan();
    });

    // Import selected
    this.panel.querySelector('#bulk-import-selected').addEventListener('click', () => {
      this.importSelected();
    });
  }

  /**
   * Scan the current page for products
   */
  async scanCurrentPage() {
    console.log('[Bulk Import] Scanning current page...');

    // Show loading state
    const productsList = this.panel.querySelector('#bulk-products-list');
    productsList.innerHTML = `
      <div class="bulk-loading">
        <div class="bulk-loading-spinner"></div>
        <span style="margin-left: 12px;">Scanning page...</span>
      </div>
    `;

    // Wait a bit for the page to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trigger auto-detector scan
    if (window.autoDetector) {
      window.autoDetector.scanPage();
    }

    // Extract products from the page
    await this.extractProductsFromPage();

    this.updateProductList();
    this.updateStats();
  }

  /**
   * Extract products from current page
   */
  async extractProductsFromPage() {
    const platform = this.detectPlatform();
    if (!platform) return;

    console.log('[Bulk Import] Extracting products from', platform);

    if (platform === 'aliexpress') {
      await this.extractAliExpressProducts();
    } else if (platform === 'amazon') {
      await this.extractAmazonProducts();
    } else if (platform === 'temu') {
      await this.extractTemuProducts();
    }
  }

  /**
   * Extract products from AliExpress listing page
   */
  async extractAliExpressProducts() {
    const selectors = [
      '[class*="search-card-item"]',
      '[class*="product-item"]',
      'a[href*="/item/"]'
    ];

    for (const selector of selectors) {
      const productElements = document.querySelectorAll(selector);
      console.log(`[Bulk Import] Found ${productElements.length} elements with selector: ${selector}`);

      if (productElements.length > 0) {
        productElements.forEach((el, index) => {
          try {
            const product = this.extractAliExpressProductData(el);
            if (product && product.url) {
              // Check for duplicates
              const exists = this.products.some(p => p.url === product.url);
              if (!exists) {
                this.products.push(product);
                console.log(`[Bulk Import] Added product ${index + 1}:`, product.title);
              }
            }
          } catch (error) {
            console.error('[Bulk Import] Error extracting product:', error);
          }
        });
        break;
      }
    }
  }

  /**
   * Extract product data from AliExpress card
   */
  extractAliExpressProductData(element) {
    // Find product link
    const linkEl = element.tagName === 'A' ? element : element.querySelector('a[href*="/item/"]');
    if (!linkEl) return null;

    const url = linkEl.href;
    const urlMatch = url.match(/\/item\/(\d+)\.html/);
    if (!urlMatch) return null;

    const productId = urlMatch[1];

    // Extract title
    const title = element.querySelector('[class*="title"], h1, h3, a')?.textContent?.trim() || 'Unknown Product';

    // Extract price
    const priceEl = element.querySelector('[class*="price"]');
    const priceText = priceEl?.textContent || '';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

    // Extract image
    const imageEl = element.querySelector('img');
    let imageUrl = imageEl?.src || imageEl?.getAttribute('data-src') || '';
    // Clean up image URL
    if (imageUrl) {
      imageUrl = imageUrl.split('_')[0] + '_640x640.jpg';
    }

    // Extract rating and reviews
    const ratingEl = element.querySelector('[class*="rating"], [class*="star"]');
    const rating = parseFloat(ratingEl?.textContent?.match(/\d\.\d/)?.[0]) || 0;

    const reviewEl = element.querySelector('[class*="review"], [class*="evaluation"]');
    const reviews = parseInt(reviewEl?.textContent?.replace(/\D/g, '')) || 0;

    // Extract orders
    const ordersEl = element.querySelector('[class*="sold"], [class*="order"]');
    const ordersText = ordersEl?.textContent || '';
    let orders = 0;
    if (ordersText.includes('K')) {
      orders = parseFloat(ordersText.replace(/[^0-9.]/g, '')) * 1000;
    } else {
      orders = parseInt(ordersText.replace(/\D/g, '')) || 0;
    }

    return {
      id: productId,
      title,
      url,
      imageUrl,
      price,
      rating,
      reviews,
      orders,
      source: 'aliexpress',
      isWinner: rating >= 4.3 && reviews >= 500 && orders >= 1000
    };
  }

  /**
   * Extract products from Amazon listing page
   */
  async extractAmazonProducts() {
    // Similar logic for Amazon
    console.log('[Bulk Import] Amazon extraction not yet implemented');
  }

  /**
   * Extract products from Temu listing page
   */
  async extractTemuProducts() {
    // Similar logic for Temu
    console.log('[Bulk Import] Temu extraction not yet implemented');
  }

  /**
   * Detect which platform we're on
   */
  detectPlatform() {
    const url = window.location.href;
    if (url.includes('aliexpress')) return 'aliexpress';
    if (url.includes('amazon')) return 'amazon';
    if (url.includes('temu')) return 'temu';
    return null;
  }

  /**
   * Start scanning multiple pages
   */
  async startMultiPageScan() {
    if (this.isScrapingMultiplePages) {
      alert('Multi-page scan already in progress!');
      return;
    }

    const confirmScan = confirm(`This will automatically scan up to ${this.maxPages} pages. This may take several minutes. Continue?`);
    if (!confirmScan) return;

    this.isScrapingMultiplePages = true;
    this.currentPage = 1;

    // Disable buttons
    this.panel.querySelector('#bulk-scan-all').disabled = true;
    this.panel.querySelector('#bulk-scan-all').textContent = '⏳ Scanning...';

    // Scan current page first
    await this.scanCurrentPage();

    // Find and navigate to next pages
    for (let i = 2; i <= this.maxPages; i++) {
      const nextPageUrl = this.findNextPageUrl();
      if (!nextPageUrl) {
        console.log('[Bulk Import] No more pages found');
        break;
      }

      console.log(`[Bulk Import] Navigating to page ${i}...`);
      this.currentPage = i;
      this.updateStats();

      // Navigate to next page
      window.location.href = nextPageUrl;

      // Wait for page load (this will reload the extension, so we need to persist data)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Scan the new page
      await this.scanCurrentPage();
    }

    this.isScrapingMultiplePages = false;
    this.panel.querySelector('#bulk-scan-all').disabled = false;
    this.panel.querySelector('#bulk-scan-all').textContent = '🚀 Scan All Pages';

    alert(`Multi-page scan complete! Found ${this.products.length} products across ${this.currentPage} pages.`);
  }

  /**
   * Find the URL for the next page
   */
  findNextPageUrl() {
    // Look for "Next" button or pagination
    const selectors = [
      'a[class*="next"]',
      'a[aria-label*="Next"]',
      '.pagination a:last-child',
      '[class*="pagination"] a[rel="next"]'
    ];

    for (const selector of selectors) {
      const nextBtn = document.querySelector(selector);
      if (nextBtn && nextBtn.href) {
        return nextBtn.href;
      }
    }

    // Try incrementing page parameter in URL
    const url = new URL(window.location.href);
    const pageParam = url.searchParams.get('page') || url.searchParams.get('p');
    if (pageParam) {
      const nextPage = parseInt(pageParam) + 1;
      url.searchParams.set('page', nextPage.toString());
      return url.toString();
    }

    return null;
  }

  /**
   * Update the product list UI
   */
  updateProductList() {
    const productsList = this.panel.querySelector('#bulk-products-list');

    if (this.products.length === 0) {
      productsList.innerHTML = `
        <div class="bulk-empty-state">
          <div class="empty-icon">📭</div>
          <p>No products found</p>
          <p class="empty-subtitle">Try scanning the page again</p>
        </div>
      `;
      return;
    }

    productsList.innerHTML = this.products.map((product, index) => `
      <div class="bulk-product-card ${this.selectedProducts.has(product.id) ? 'selected' : ''}" data-id="${product.id}">
        <input type="checkbox" class="bulk-product-checkbox" data-id="${product.id}" ${this.selectedProducts.has(product.id) ? 'checked' : ''}>
        ${product.imageUrl ? `<img src="${product.imageUrl}" class="bulk-product-image" alt="">` : '<div class="bulk-product-image"></div>'}
        <div class="bulk-product-info">
          <div class="bulk-product-title">${product.title}</div>
          <div class="bulk-product-meta">
            <span>💰 $${product.price.toFixed(2)}</span>
            ${product.rating ? `<span>⭐ ${product.rating}</span>` : ''}
            ${product.reviews ? `<span>💬 ${product.reviews}</span>` : ''}
            ${product.orders ? `<span>📦 ${product.orders}</span>` : ''}
          </div>
        </div>
        ${product.isWinner ? '<div class="bulk-winner-badge">🔥 WINNER</div>' : ''}
      </div>
    `).join('');

    // Add checkbox listeners
    productsList.querySelectorAll('.bulk-product-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          this.selectedProducts.add(id);
        } else {
          this.selectedProducts.delete(id);
        }
        this.updateSelectedCount();

        // Update card styling
        const card = e.target.closest('.bulk-product-card');
        if (e.target.checked) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      });
    });

    this.updateSelectedCount();
  }

  /**
   * Update selected count display
   */
  updateSelectedCount() {
    const count = this.selectedProducts.size;
    this.panel.querySelector('#selected-count').textContent = count;
    this.panel.querySelector('#bulk-import-selected').disabled = count === 0;
  }

  /**
   * Update statistics display
   */
  updateStats() {
    this.panel.querySelector('#current-page').textContent = this.currentPage;
    this.panel.querySelector('#total-products').textContent = this.products.length;
    this.panel.querySelector('#winners-count').textContent = this.products.filter(p => p.isWinner).length;
    this.panel.querySelector('.product-count').textContent = `${this.products.length} products`;
  }

  /**
   * Import selected products
   */
  async importSelected() {
    const selectedIds = Array.from(this.selectedProducts);
    const productsToImport = this.products.filter(p => selectedIds.includes(p.id));

    if (productsToImport.length === 0) {
      alert('No products selected!');
      return;
    }

    const confirmImport = confirm(`Import ${productsToImport.length} product(s) to your dashboard?`);
    if (!confirmImport) return;

    console.log('[Bulk Import] Importing', productsToImport.length, 'products');

    // TODO: Implement actual import logic
    // For now, just show success message
    alert(`Bulk import feature coming soon! Would import ${productsToImport.length} products.`);
  }
}

// Initialize bulk import UI
window.bulkImportUI = new BulkImportUI();

// Add a floating button to open bulk import panel
function addBulkImportButton() {
  if (document.getElementById('clearseller-bulk-trigger')) return;

  const button = document.createElement('button');
  button.id = 'clearseller-bulk-trigger';
  button.innerHTML = '📦 Bulk Import';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    padding: 14px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
    z-index: 2147483646;
    transition: all 0.3s;
  `;

  button.addEventListener('mouseover', () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.5)';
  });

  button.addEventListener('mouseout', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
  });

  button.addEventListener('click', () => {
    window.bulkImportUI.show();
  });

  document.body.appendChild(button);
}

// Add button when on listing pages
if (window.location.href.includes('search') || window.location.href.includes('category') || window.location.href.includes('wholesale')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addBulkImportButton);
  } else {
    setTimeout(addBulkImportButton, 2000);
  }
}
