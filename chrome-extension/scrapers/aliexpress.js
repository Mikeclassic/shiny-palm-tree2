// AliExpress Product Scraper
class AliExpressScraper {
  constructor() {
    this.platform = 'aliexpress';
  }

  // Check if current page is a product page
  isProductPage() {
    return window.location.href.includes('/item/') ||
           document.querySelector('.product-main') !== null ||
           document.querySelector('[class*="Product"]') !== null;
  }

  // Extract product data from the page
  scrapeProduct() {
    try {
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

      // Validate required fields
      if (!data.title || !data.price || data.images.length === 0) {
        console.error('Missing required product data');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error scraping AliExpress product:', error);
      return null;
    }
  }

  extractTitle() {
    // Try multiple selectors for title
    const selectors = [
      'h1[class*="title"]',
      '[class*="Product_Title"]',
      '.product-title-text',
      'h1.product-name',
      'h1'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  extractPrice() {
    // Try multiple selectors for price
    const selectors = [
      '[class*="price"] [class*="value"]',
      '.product-price-value',
      '[class*="Price_current"]',
      '.price-current',
      'span[class*="price"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }

    return 0;
  }

  extractImages() {
    const images = [];

    // Main product images
    const imageSelectors = [
      '.images-view-item img',
      '[class*="ImageView"] img',
      '.image-view img',
      '.product-image img'
    ];

    for (const selector of imageSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(img => {
        let src = img.src || img.getAttribute('data-src') || img.getAttribute('src');
        if (src && !src.includes('avatar') && !images.includes(src)) {
          // Get high quality version
          src = src.replace(/_\d+x\d+\./, '_640x640.');
          images.push(src);
        }
      });

      if (images.length > 0) break;
    }

    // Fallback to any product images
    if (images.length === 0) {
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && src.includes('alicdn') && !src.includes('avatar') && images.length < 8) {
          images.push(src);
        }
      });
    }

    return images.slice(0, 8); // Limit to 8 images
  }

  extractDescription() {
    const selectors = [
      '[class*="description"]',
      '.product-description',
      '[class*="Detail_description"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim().substring(0, 1000); // Limit length
      }
    }

    return '';
  }

  extractRating() {
    const selectors = [
      '[class*="rating"] [class*="average"]',
      '.rating-value',
      '[class*="Rating_average"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const rating = parseFloat(element.textContent.trim());
        if (!isNaN(rating)) {
          return rating;
        }
      }
    }

    return 0;
  }

  extractReviewCount() {
    const selectors = [
      '[class*="review"] [class*="count"]',
      '.review-count',
      '[class*="Rating_reviews"]',
      'a[href*="review"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        const count = parseInt(text.replace(/[^0-9]/g, ''));
        if (!isNaN(count)) {
          return count;
        }
      }
    }

    return 0;
  }

  extractOrderCount() {
    const selectors = [
      '[class*="order"] [class*="count"]',
      '.order-count',
      '[class*="sold"]',
      'span:contains("sold")'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();

        // Handle formats like "10K+ sold", "5000 orders"
        let multiplier = 1;
        if (text.includes('k')) multiplier = 1000;
        if (text.includes('m')) multiplier = 1000000;

        const count = parseInt(text.replace(/[^0-9]/g, '')) * multiplier;
        if (!isNaN(count)) {
          return count;
        }
      }
    }

    return 0;
  }

  extractShippingTime() {
    const selectors = [
      '[class*="shipping"] [class*="time"]',
      '.shipping-time',
      '[class*="delivery"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }

    return '10-20 days';
  }

  extractCategory() {
    const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"] a, .breadcrumb a');
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1].textContent.trim();
    }
    return '';
  }
}

// Make scraper available globally
window.productScraper = new AliExpressScraper();
