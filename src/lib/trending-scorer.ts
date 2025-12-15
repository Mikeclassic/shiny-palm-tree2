interface ProductScore {
  totalScore: number; // 0-100
  scores: {
    demandScore: number;        // Based on reviews/orders
    profitScore: number;        // Margin potential
    competitionScore: number;   // Uniqueness
    popularityScore: number;    // Reviews/rating
  };
  viralPotential: 'high' | 'medium' | 'low';
  reasoning: string[];
}

export async function scoreProduct(
  product: {
    title: string;
    price: number;
    supplierPrice?: number;
    supplierReviews?: number;
    supplierRating?: number;
    productType?: string;
  }
): Promise<ProductScore> {

  // 1. Demand Score (30 points) - Based on reviews/orders
  const demandScore = calculateDemandScore(product.supplierReviews || 0);

  // 2. Profit Score (30 points)
  const profitScore = calculateProfitScore(
    product.price - (product.supplierPrice || 0)
  );

  // 3. Competition Score (20 points) - Simple heuristic
  const competitionScore = calculateCompetitionScore(product.title);

  // 4. Popularity Score (20 points) - Rating quality
  const popularityScore = calculatePopularityScore(
    product.supplierRating || 0,
    product.supplierReviews || 0
  );

  const totalScore =
    demandScore +
    profitScore +
    competitionScore +
    popularityScore;

  const viralPotential =
    totalScore >= 75 ? 'high' :
    totalScore >= 50 ? 'medium' : 'low';

  const reasoning = generateReasoning({
    demandScore,
    profitScore,
    competitionScore,
    popularityScore,
    product
  });

  return {
    totalScore: Math.round(totalScore),
    scores: {
      demandScore,
      profitScore,
      competitionScore,
      popularityScore
    },
    viralPotential,
    reasoning
  };
}

function calculateDemandScore(reviews: number): number {
  // More reviews/orders = more demand
  if (reviews > 10000) return 30;
  if (reviews > 5000) return 25;
  if (reviews > 1000) return 20;
  if (reviews > 500) return 15;
  if (reviews > 100) return 10;
  return 5;
}

function calculateProfitScore(margin: number): number {
  // Higher profit margin = higher score
  if (margin > 40) return 30;
  if (margin > 25) return 25;
  if (margin > 15) return 20;
  if (margin > 10) return 15;
  if (margin > 5) return 10;
  return 5;
}

function calculateCompetitionScore(title: string): number {
  // Simple heuristic: generic terms = high competition = low score
  const titleLower = title.toLowerCase();
  const genericTerms = ['new', 'hot', 'best', 'sale', 'cheap', 'fashion', 'style'];

  const hasGenericTerms = genericTerms.some(term => titleLower.includes(term));

  // Unique/specific products score higher
  if (!hasGenericTerms && title.length > 50) return 20; // Detailed, specific
  if (!hasGenericTerms) return 15;
  if (title.length > 40) return 10;
  return 5;
}

function calculatePopularityScore(rating: number, reviews: number): number {
  // High rating + many reviews = popular and trusted
  if (rating >= 4.5 && reviews > 1000) return 20;
  if (rating >= 4.3 && reviews > 500) return 17;
  if (rating >= 4.0 && reviews > 100) return 14;
  if (rating >= 3.8) return 10;
  return 5;
}

function generateReasoning(data: {
  demandScore: number;
  profitScore: number;
  competitionScore: number;
  popularityScore: number;
  product: any;
}): string[] {
  const reasons: string[] = [];

  if (data.demandScore >= 25) {
    reasons.push('🔥 High demand - 5k+ orders on supplier');
  } else if (data.demandScore >= 15) {
    reasons.push('📈 Good demand - Proven seller');
  }

  if (data.profitScore >= 25) {
    reasons.push('💰 Excellent profit margins ($25+)');
  } else if (data.profitScore >= 15) {
    reasons.push('💵 Good profit potential ($15+)');
  }

  if (data.competitionScore >= 15) {
    reasons.push('🎯 Low competition - Unique product');
  }

  if (data.popularityScore >= 17) {
    reasons.push('⭐ Highly rated (4.5+) with many reviews');
  } else if (data.popularityScore >= 14) {
    reasons.push('✅ Good ratings and social proof');
  }

  if (data.product.supplierPrice && data.product.supplierPrice < 10) {
    reasons.push('📦 Low cost item - High markup potential');
  }

  // If no strong reasons, add a general one
  if (reasons.length === 0) {
    reasons.push('💡 Solid dropshipping candidate');
  }

  return reasons.slice(0, 4); // Max 4 reasons
}

// Helper function to calculate trending score for existing products
export async function updateProductTrendingScore(productId: string) {
  // This would be called by a cron job to update scores periodically
  // For now, it's a placeholder for future implementation
  return null;
}
