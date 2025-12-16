// Winning Product Detection Algorithm
class WinningProductDetector {
  constructor(config = CONFIG.WINNING_PRODUCT_CRITERIA) {
    this.config = config;
  }

  /**
   * Analyze a product and determine if it's a winning product
   * Returns score (0-100) and detailed analysis
   */
  analyzeProduct(productData) {
    const scores = {
      reviewScore: this.calculateReviewScore(productData.reviewCount),
      ratingScore: this.calculateRatingScore(productData.rating),
      orderScore: this.calculateOrderScore(productData.orderCount),
      profitScore: this.calculateProfitScore(productData.supplierPrice)
    };

    // Calculate weighted total score
    const totalScore =
      (scores.reviewScore * this.config.weights.reviews) +
      (scores.ratingScore * this.config.weights.rating) +
      (scores.orderScore * this.config.weights.orders) +
      (scores.profitScore * this.config.weights.profit);

    const analysis = {
      totalScore: Math.round(totalScore),
      breakdown: scores,
      isWinner: totalScore >= 70,
      potential: this.categorizePotential(totalScore),
      reasons: this.generateReasons(productData, scores, totalScore),
      warnings: this.generateWarnings(productData, scores)
    };

    return analysis;
  }

  /**
   * Calculate score based on review count (0-100)
   */
  calculateReviewScore(reviewCount) {
    if (!reviewCount || reviewCount < 100) return 10;
    if (reviewCount < 500) return 30;
    if (reviewCount < 1000) return 50;
    if (reviewCount < 5000) return 70;
    if (reviewCount < 10000) return 85;
    return 100; // 10K+ reviews
  }

  /**
   * Calculate score based on rating (0-100)
   */
  calculateRatingScore(rating) {
    if (!rating || rating < 3.5) return 0;
    if (rating < 4.0) return 30;
    if (rating < 4.3) return 50;
    if (rating < 4.5) return 70;
    if (rating < 4.7) return 85;
    return 100; // 4.7+ rating
  }

  /**
   * Calculate score based on order count (0-100)
   */
  calculateOrderScore(orderCount) {
    if (!orderCount || orderCount < 500) return 10;
    if (orderCount < 1000) return 30;
    if (orderCount < 5000) return 50;
    if (orderCount < 10000) return 70;
    if (orderCount < 50000) return 85;
    return 100; // 50K+ orders
  }

  /**
   * Calculate profit potential score (0-100)
   */
  calculateProfitScore(supplierPrice) {
    if (!supplierPrice) return 50; // Unknown, assume medium

    // Lower supplier price = higher profit potential (better margins)
    if (supplierPrice > 50) return 20;  // Harder to markup
    if (supplierPrice > 30) return 40;
    if (supplierPrice > 20) return 60;
    if (supplierPrice > 10) return 80;
    return 100; // Very cheap, great margins
  }

  /**
   * Categorize winning potential
   */
  categorizePotential(score) {
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Generate human-readable reasons why product is/isn't a winner
   */
  generateReasons(product, scores, totalScore) {
    const reasons = [];

    // Positive signals
    if (scores.reviewScore >= 70) {
      reasons.push(`🔥 High social proof with ${this.formatNumber(product.reviewCount)} reviews`);
    }

    if (scores.ratingScore >= 70) {
      reasons.push(`⭐ Excellent ${product.rating}/5 star rating shows quality`);
    }

    if (scores.orderScore >= 70) {
      reasons.push(`📦 Proven demand with ${this.formatNumber(product.orderCount)} orders`);
    }

    if (scores.profitScore >= 70) {
      const estimatedPrice = this.estimateSellingPrice(product.supplierPrice, product.source);
      const profit = estimatedPrice - product.supplierPrice - 9; // Estimate fees
      const margin = ((profit / estimatedPrice) * 100).toFixed(0);
      reasons.push(`💰 Great profit potential: $${profit.toFixed(2)} (${margin}% margin)`);
    }

    // Negative signals
    if (scores.reviewScore < 30) {
      reasons.push(`⚠️ Low review count may indicate untested product`);
    }

    if (scores.ratingScore < 50) {
      reasons.push(`⚠️ Below-average rating could hurt conversions`);
    }

    if (product.supplierPrice > 40) {
      reasons.push(`⚠️ Higher supplier cost reduces profit margins`);
    }

    // Overall verdict
    if (totalScore >= 75) {
      reasons.unshift(`🏆 WINNER: Strong potential across all metrics!`);
    } else if (totalScore >= 50) {
      reasons.unshift(`📊 MODERATE: Has potential but requires validation`);
    }

    return reasons;
  }

  /**
   * Generate warnings for potential issues
   */
  generateWarnings(product, scores) {
    const warnings = [];

    if (product.reviewCount > 0 && product.rating < 4.0) {
      warnings.push('Low rating despite reviews - check quality issues');
    }

    if (product.supplierPrice > 50) {
      warnings.push('High supplier price - difficult to achieve good margins');
    }

    if (!product.images || product.images.length < 3) {
      warnings.push('Limited images - may need better product photography');
    }

    if (scores.reviewScore < 30 && scores.orderScore < 30) {
      warnings.push('Unproven product - no validation from market');
    }

    return warnings;
  }

  /**
   * Estimate selling price based on platform markup strategy
   */
  estimateSellingPrice(supplierPrice, source) {
    const multipliers = {
      aliexpress: 2.5,
      amazon: 1.8,
      temu: 3.0
    };

    const basePrice = supplierPrice * (multipliers[source] || 2.5);

    // Apply psychological pricing
    if (basePrice < 20) return Math.floor(basePrice) + 0.99;
    if (basePrice < 50) return Math.floor(basePrice / 5) * 5 + 4.99;
    return Math.floor(basePrice / 10) * 10 + 9.99;
  }

  /**
   * Format large numbers (e.g., 10000 -> "10K")
   */
  formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  /**
   * Quick check if product meets minimum criteria
   */
  meetsMinimumCriteria(product) {
    return (
      product.reviewCount >= this.config.minReviews &&
      product.rating >= this.config.minRating &&
      product.supplierPrice <= this.config.maxPrice
    );
  }

  /**
   * Get a color code for the score (for UI)
   */
  getScoreColor(score) {
    if (score >= 75) return '#ef4444'; // Red (hot)
    if (score >= 50) return '#f97316'; // Orange
    if (score >= 25) return '#eab308'; // Yellow
    return '#6b7280'; // Gray
  }

  /**
   * Get emoji indicator for score
   */
  getScoreEmoji(score) {
    if (score >= 75) return '🔥';
    if (score >= 50) return '📈';
    if (score >= 25) return '📊';
    return '❓';
  }
}

// Make detector available globally
window.winningDetector = new WinningProductDetector();
