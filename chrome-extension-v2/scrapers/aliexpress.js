// AliExpress Product Scraper - Updated December 2024
class AliExpressScraper {
  constructor() {
    this.platform = 'aliexpress';
  }

  isProductPage() {
    return window.location.href.includes('/item/') ||
           window.location.pathname.includes('/item/') ||
           document.querySelector('[class*="Product"]') !== null;
  }

  scrapeProduct() {
    try {
      console.log('[AliExpress Scraper] Starting scrape...');

      const data = {
        title: this.extractTitle(),
        price: this.extractPrice(),
        images: this.extractImages(),
        description: this.extractDescription(),
        supplierUrl: window.location.href.split('?')[0],
        supplierPrice: this.extractPrice(),
        rating: this.extractRating(),
        reviewCount: this.extractReviewCount(),
        orderCount: this.extractOrderCount(),
        source: 'aliexpress',
        shippingTime: this.extractShippingTime(),
        productType: this.extractCategory()
      };

      console.log('[AliExpress Scraper] Extracted data:', data);

      if (!data.title || !data.price || data.images.length === 0) {
        console.error('[AliExpress Scraper] Missing required data');
        return null;
      }

      return data;
    } catch (error) {
      console.error('[AliExpress Scraper] Error:', error);
      return null;
    }
  }

  extractTitle() {
    const selectors = [
      'h1[data-pl="product-title"]',
      'h1.product-title-text',
      'h1[class*="Title"]',
      'h1'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 5) {
        const title = el.textContent.trim();
        console.log('[AliExpress] Title:', title);
        return title;
      }
    }
    return '';
  }

  extractPrice() {
    const selectors = [
      '[class*="Price--current"]',
      '[class*="Product_Price"]',
      '.product-price-current',
      'span[class*="price"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        const match = text.match(/[\d,]+\.?\d*/);
        if (match) {
          const price = parseFloat(match[0].replace(/,/g, ''));
          if (!isNaN(price) && price > 0 && price < 10000) {
            console.log('[AliExpress] Price:', price);
            return price;
          }
        }
      }
    }
    return 0;
  }

  extractImages() {
    const images = [];
    const selectors = [
      '[class*="ImageView"] img',
      '[class*="Magnifier"] img',
      '.images-view-item img',
      'img[class*="magnifier"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(img => {
        let src = img.src || img.getAttribute('data-src');
        if (src && !src.includes('avatar') && !images.includes(src)) {
          src = src.split('_')[0] + '_640x640.jpg';
          if (src.startsWith('http')) images.push(src);
        }
      });
      if (images.length > 0) break;
    }

    console.log('[AliExpress] Images:', images.length);
    return images.slice(0, 8);
  }

  extractDescription() {
    const selectors = [
      '[class*="description"]',
      '.product-description'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el.textContent.trim().substring(0, 1000);
    }
    return '';
  }

  extractRating() {
    console.log('[AliExpress] Extracting rating...');
    
    // Method 1: Look for rating number patterns in all text
    const allSpans = document.querySelectorAll('span');
    for (const span of allSpans) {
      const text = span.textContent.trim();
      // Match patterns like "4.2", "4.7", etc (rating out of 5)
      if (/^\d\.\d$/.test(text)) {
        const rating = parseFloat(text);
        if (rating >= 0 && rating <= 5) {
          console.log('[AliExpress] Rating found (pattern match):', rating);
          return rating;
        }
      }
    }

    // Method 2: Specific selectors
    const selectors = [
      '[class*="reviewer-rating"]',
      '[class*="Rating"]',
      '[class*="rating-value"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent.trim();
        const match = text.match(/(\d+\.?\d*)/);
        if (match) {
          const rating = parseFloat(match[1]);
          if (rating >= 0 && rating <= 5) {
            console.log('[AliExpress] Rating found (selector):', rating);
            return rating;
          }
        }
      }
    }

    console.warn('[AliExpress] Rating not found');
    return 0;
  }

  extractReviewCount() {
    console.log('[AliExpress] Extracting reviews...');

    // Method 1: Look for "Reviews" text pattern
    const allText = document.body.innerText;
    const reviewMatch = allText.match(/(\d+[\d,]*)\s*Reviews?/i);
    if (reviewMatch) {
      const count = parseInt(reviewMatch[1].replace(/,/g, ''));
      if (!isNaN(count)) {
        console.log('[AliExpress] Reviews found (text pattern):', count);
        return count;
      }
    }

    // Method 2: Check all spans for review text
    const allSpans = document.querySelectorAll('span');
    for (const span of allSpans) {
      const text = span.textContent.trim();
      if (text.includes('Reviews') || text.includes('reviews')) {
        const match = text.match(/(\d+[\d,]*)/);
        if (match) {
          const count = parseInt(match[1].replace(/,/g, ''));
          if (!isNaN(count) && count > 0) {
            console.log('[AliExpress] Reviews found (span scan):', count);
            return count;
          }
        }
      }
    }

    // Method 3: Specific selectors
    const selectors = [
      '[class*="reviewer-rating-count"]',
      'span[class*="review-count"]',
      'a[href*="review"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent.trim();
        const match = text.match(/(\d+[\d,]*)/);
        if (match) {
          const count = parseInt(match[1].replace(/,/g, ''));
          if (!isNaN(count)) {
            console.log('[AliExpress] Reviews found (selector):', count);
            return count;
          }
        }
      }
    }

    console.warn('[AliExpress] Reviews not found');
    return 0;
  }

  extractOrderCount() {
    console.log('[AliExpress] Extracting orders...');

    // Look for "sold" text pattern
    const allText = document.body.innerText;
    const soldMatch = allText.match(/(\d+[\d,]*)\+?\s*sold/i);
    if (soldMatch) {
      let count = parseInt(soldMatch[1].replace(/,/g, ''));
      // Handle "600+" format
      if (allText.includes(soldMatch[1] + '+')) {
        count = count; // Keep as is, the + indicates "at least this many"
      }
      if (!isNaN(count)) {
        console.log('[AliExpress] Orders found:', count);
        return count;
      }
    }

    const selectors = [
      '[class*="sold"]',
      '[class*="orders"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.toLowerCase();
        if (text.includes('sold') || text.includes('order')) {
          let multiplier = 1;
          if (text.includes('k')) multiplier = 1000;
          if (text.includes('m')) multiplier = 1000000;

          const match = text.match(/(\d+[\d,]*)/);
          if (match) {
            const count = parseInt(match[1].replace(/,/g, '')) * multiplier;
            if (!isNaN(count) && count > 0) {
              console.log('[AliExpress] Orders found (selector):', count);
              return count;
            }
          }
        }
      }
    }

    return 0;
  }

  extractShippingTime() {
    return '10-20 days';
  }

  extractCategory() {
    const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"] a');
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1].textContent.trim();
    }
    return '';
  }
}

window.productScraper = new AliExpressScraper();
console.log('[AliExpress Scraper] Initialized');
