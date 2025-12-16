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
    console.log('[AliExpress] Extracting images...');
    const images = [];

    // Method 1: Look for product gallery images
    const selectors = [
      '[class*="ImageView"] img',
      '[class*="Magnifier"] img',
      '.images-view-item img',
      'img[class*="magnifier"]',
      'img[class*="slider"]',
      '[class*="mainImage"] img',
      '[class*="productImage"] img'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`[AliExpress] Trying selector "${selector}": found ${elements.length} images`);

      elements.forEach(img => {
        let src = img.src || img.getAttribute('data-src') || img.getAttribute('src');
        if (src && !src.includes('avatar') && !images.includes(src)) {
          // Clean up URL and get higher quality version
          src = src.split('_')[0];
          if (!src.endsWith('.jpg') && !src.endsWith('.png')) {
            src = src + '_640x640.jpg';
          }
          if (src.startsWith('http')) {
            console.log('[AliExpress] Adding image:', src.substring(0, 80) + '...');
            images.push(src);
          }
        }
      });
      if (images.length > 0) {
        console.log(`[AliExpress] Found ${images.length} images with selector "${selector}"`);
        break;
      }
    }

    // Method 2: Look for any large product images if method 1 failed
    if (images.length === 0) {
      console.log('[AliExpress] No images found with selectors, trying all img tags...');
      const allImages = document.querySelectorAll('img');
      allImages.forEach(img => {
        const src = img.src;
        if (src && src.includes('alicdn.com') && !src.includes('avatar') &&
            (img.width > 200 || img.naturalWidth > 200)) {
          let cleanSrc = src.split('_')[0] + '_640x640.jpg';
          if (!images.includes(cleanSrc)) {
            console.log('[AliExpress] Found large image:', cleanSrc.substring(0, 80) + '...');
            images.push(cleanSrc);
          }
        }
      });
    }

    console.log('[AliExpress] Total images extracted:', images.length);
    console.log('[AliExpress] Image URLs:', images);
    return images.slice(0, 8);
  }

  extractDescription() {
    console.log('[AliExpress] Extracting description...');

    // Method 1: Build rich description from product data (most reliable)
    // This avoids promotional meta tag text like "Buy... Free Shipping"
    const title = this.extractTitle();
    const rating = this.extractRating();
    const reviews = this.extractReviewCount();
    const orders = this.extractOrderCount();

    if (title) {
      let desc = title;
      if (rating && reviews) {
        desc += `. Rated ${rating}/5 stars based on ${reviews} customer reviews`;
      }
      if (orders && orders > 0) {
        desc += `. Over ${orders} orders sold`;
      }
      desc += '. High quality product from verified AliExpress seller with reliable worldwide shipping.';

      console.log('[AliExpress] Built rich description from product data:', desc.substring(0, 100) + '...');
      return desc.substring(0, 500);
    }

    // Method 2: Look for description meta tag (only if not promotional)
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const desc = metaDesc.getAttribute('content');
      // Filter out promotional text
      if (desc && desc.length > 50 &&
          !desc.includes('Buy ') &&
          !desc.includes('Free Shipping') &&
          !desc.includes('✓Limited Time') &&
          !desc.includes('AliExpress Mobile')) {
        console.log('[AliExpress] Description from meta tag:', desc.substring(0, 100) + '...');
        return desc.substring(0, 500);
      }
    }

    // Method 3: Look for og:description (only if not promotional)
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      const desc = ogDesc.getAttribute('content');
      if (desc && desc.length > 50 &&
          !desc.includes('Buy ') &&
          !desc.includes('Free Shipping')) {
        console.log('[AliExpress] Description from og:description:', desc.substring(0, 100) + '...');
        return desc.substring(0, 500);
      }
    }

    // Method 3: Extract from product specifications/features (look for structured content)
    const specTexts = [];
    document.querySelectorAll('[class*="specification"], [class*="Specification"], [class*="spec"]').forEach(el => {
      const text = el.textContent.trim();
      if (text.length > 20 && text.length < 300 && !text.includes('Description') && !text.includes('Report')) {
        specTexts.push(text);
      }
    });

    if (specTexts.length > 0) {
      const desc = specTexts.slice(0, 3).join('. ');
      console.log('[AliExpress] Description from specifications:', desc.substring(0, 100) + '...');
      return desc.substring(0, 500);
    }

    // Method 4: Try to extract product overview text
    const overviewSelectors = [
      '[class*="overview"]',
      '[class*="Overview"]',
      '[class*="productInfo"]',
      '[class*="ProductInfo"]'
    ];

    for (const selector of overviewSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent.trim();
        // Filter out UI elements
        if (text.length > 50 && !text.includes('Description') && !text.includes('Report') &&
            !text.includes('View more') && !text.includes('seller')) {
          console.log('[AliExpress] Description from overview:', text.substring(0, 100) + '...');
          return text.substring(0, 500);
        }
      }
    }

    // Method 5: Build description from title + key features
    const title = this.extractTitle();
    const rating = this.extractRating();
    const reviews = this.extractReviewCount();
    const orders = this.extractOrderCount();

    if (title) {
      let desc = title;
      if (rating && reviews) {
        desc += `. Rated ${rating}/5 stars with ${reviews} reviews`;
      }
      if (orders) {
        desc += `. ${orders}+ orders sold`;
      }
      desc += '. High quality product from verified AliExpress seller. Fast shipping available.';

      console.log('[AliExpress] Built description from product data');
      return desc.substring(0, 500);
    }

    console.log('[AliExpress] No description found');
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
