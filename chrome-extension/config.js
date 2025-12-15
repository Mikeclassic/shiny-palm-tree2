// Configuration for the extension
const CONFIG = {
  // API endpoint - update this to your production URL
  API_BASE_URL: 'http://localhost:3000',

  // Winning product criteria thresholds
  WINNING_PRODUCT_CRITERIA: {
    minReviews: 500,           // Minimum number of reviews/orders
    minRating: 4.3,            // Minimum product rating (out of 5)
    minOrders: 1000,           // Minimum total orders (for platforms that show this)
    maxPrice: 50,              // Maximum supplier price for good margins
    minProfitMargin: 30,       // Minimum profit margin percentage

    // Score weights for winning product detection
    weights: {
      reviews: 0.3,            // 30% weight on review count
      rating: 0.2,             // 20% weight on rating quality
      orders: 0.25,            // 25% weight on order volume
      profit: 0.25             // 25% weight on profit potential
    }
  },

  // Platform-specific settings
  PLATFORMS: {
    aliexpress: {
      name: 'AliExpress',
      markupMultiplier: 2.5
    },
    amazon: {
      name: 'Amazon',
      markupMultiplier: 1.8
    },
    temu: {
      name: 'Temu',
      markupMultiplier: 3.0
    }
  }
};

// Make config available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
