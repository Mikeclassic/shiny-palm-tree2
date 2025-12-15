// Amazon Product Scraper
class AmazonScraper {
  constructor() {
    this.platform = 'amazon';
  }

  isProductPage() {
    return window.location.href.includes('/dp/') ||
           window.location.href.includes('/gp/product/') ||
           document.querySelector('#dp') !== null;
  }

  scrapeProduct() {
    try {
      const data = {
        title: this.extractTitle(),
        price: this.extractPrice(),
        images: this.extractImages(),
        description: this.extractDescription(),
        supplierUrl: this.getCleanUrl(),
        supplierPrice: this.extractPrice(),
        rating: this.extractRating(),
        reviewCount: this.extractReviewCount(),
        orderCount: this.extractReviewCount(), // Amazon doesn't show orders, use reviews as proxy
        source: 'amazon',
        shippingTime: this.extractShippingTime(),
        productType: this.extractCategory()
      };

      if (!data.title || !data.price || data.images.length === 0) {
        console.error('Missing required product data');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error scraping Amazon product:', error);
      return null;
    }
  }

  getCleanUrl() {
    // Extract ASIN and create clean URL
    const asinMatch = window.location.href.match(/\/dp\/([A-Z0-9]{10})/);
    if (asinMatch) {
      return `https://www.amazon.com/dp/${asinMatch[1]}`;
    }
    return window.location.href.split('?')[0];
  }

  extractTitle() {
    const selectors = [
      '#productTitle',
      '#title',
      'h1#title',
      'h1.product-title'
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
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price-whole',
      'span.a-price'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.trim();
        const price = parseFloat(priceText.replace(/[$,]/g, ''));
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }

    return 0;
  }

  extractImages() {
    const images = [];

    // Main product image
    const mainImage = document.querySelector('#landingImage, #imgBlkFront');
    if (mainImage) {
      let src = mainImage.src || mainImage.getAttribute('data-old-hires');
      if (src) {
        // Get high res version
        src = src.replace(/\._.*_\./, '.');
        images.push(src);
      }
    }

    // Thumbnail images
    const thumbnails = document.querySelectorAll('#altImages img, .imageThumbnail img');
    thumbnails.forEach(img => {
      let src = img.src || img.getAttribute('data-old-hires');
      if (src && !images.includes(src)) {
        src = src.replace(/\._.*_\./, '.');
        images.push(src);
      }
    });

    // Fallback
    if (images.length === 0) {
      const fallback = document.querySelector('img[data-a-dynamic-image]');
      if (fallback) {
        const dynamicImages = fallback.getAttribute('data-a-dynamic-image');
        try {
          const parsed = JSON.parse(dynamicImages);
          Object.keys(parsed).forEach(url => {
            if (!images.includes(url)) {
              images.push(url);
            }
          });
        } catch (e) {
          console.error('Error parsing dynamic images:', e);
        }
      }
    }

    return images.slice(0, 8);
  }

  extractDescription() {
    const selectors = [
      '#feature-bullets ul li',
      '#productDescription p',
      '.a-unordered-list.a-vertical li'
    ];

    let description = '';

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach((el, i) => {
          if (i < 5) { // Limit to first 5 bullet points
            description += el.textContent.trim() + ' ';
          }
        });
        break;
      }
    }

    return description.substring(0, 1000);
  }

  extractRating() {
    const selectors = [
      'span.a-icon-alt',
      '#acrPopover',
      '.a-star-medium .a-icon-alt'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        const match = text.match(/(\d+\.?\d*)/);
        if (match) {
          const rating = parseFloat(match[1]);
          if (!isNaN(rating) && rating <= 5) {
            return rating;
          }
        }
      }
    }

    return 0;
  }

  extractReviewCount() {
    const selectors = [
      '#acrCustomerReviewText',
      'span[data-hook="total-review-count"]',
      '#averageCustomerReviews_feature_div span'
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

  extractShippingTime() {
    const selectors = [
      '#deliveryBlockMessage',
      '#mir-layout-DELIVERY_BLOCK'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text.toLowerCase().includes('tomorrow')) {
          return '1-2 days';
        } else if (text.toLowerCase().includes('2 days')) {
          return '2-3 days';
        }
      }
    }

    return '3-5 days';
  }

  extractCategory() {
    const breadcrumb = document.querySelector('#wayfinding-breadcrumbs_feature_div li:last-child');
    if (breadcrumb) {
      return breadcrumb.textContent.trim();
    }
    return '';
  }
}

window.productScraper = new AmazonScraper();
