// Temu Product Scraper
class TemuScraper {
  constructor() {
    this.platform = 'temu';
  }

  isProductPage() {
    return window.location.href.includes('temu.com') &&
           (window.location.pathname.includes('/goods') ||
            document.querySelector('[class*="product"]') !== null);
  }

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
        source: 'temu',
        shippingTime: this.extractShippingTime(),
        productType: this.extractCategory()
      };

      if (!data.title || !data.price || data.images.length === 0) {
        console.error('Missing required product data');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error scraping Temu product:', error);
      return null;
    }
  }

  extractTitle() {
    const selectors = [
      'h1[class*="title"]',
      '[class*="GoodsTitle"]',
      'h1[class*="product"]',
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
    const selectors = [
      '[class*="price"] [class*="value"]',
      '[class*="Price"]',
      'span[class*="price"]',
      '[data-testid*="price"]'
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
      '[class*="GoodsImage"] img',
      '[class*="ProductImage"] img',
      '[class*="gallery"] img',
      'img[class*="product"]'
    ];

    for (const selector of imageSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(img => {
        let src = img.src || img.getAttribute('data-src') || img.getAttribute('srcset');
        if (src && !src.includes('avatar') && !images.includes(src)) {
          // Clean up srcset
          if (src.includes(',')) {
            src = src.split(',')[0].split(' ')[0];
          }
          // Get high quality version
          src = src.replace(/w=\d+/, 'w=800');
          images.push(src);
        }
      });

      if (images.length > 0) break;
    }

    // Fallback to any product images
    if (images.length === 0) {
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && src.includes('temu') && !src.includes('avatar') && images.length < 8) {
          images.push(src);
        }
      });
    }

    return images.slice(0, 8);
  }

  extractDescription() {
    const selectors = [
      '[class*="description"]',
      '[class*="Detail"]',
      '[class*="GoodsDetail"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim().substring(0, 1000);
      }
    }

    return '';
  }

  extractRating() {
    const selectors = [
      '[class*="rating"] [class*="value"]',
      '[class*="Rating"]',
      'span[class*="star"]'
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
      '[class*="Review"]',
      'span:contains("reviews")'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();

        let multiplier = 1;
        if (text.toLowerCase().includes('k')) multiplier = 1000;
        if (text.toLowerCase().includes('m')) multiplier = 1000000;

        const count = parseInt(text.replace(/[^0-9]/g, '')) * multiplier;
        if (!isNaN(count)) {
          return count;
        }
      }
    }

    return 0;
  }

  extractOrderCount() {
    const selectors = [
      '[class*="sold"]',
      '[class*="Sales"]',
      'span:contains("sold")'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();

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
      '[class*="shipping"]',
      '[class*="delivery"]',
      '[class*="Delivery"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }

    return '7-15 days';
  }

  extractCategory() {
    const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"] a');
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1].textContent.trim();
    }
    return '';
  }
}

window.productScraper = new TemuScraper();
