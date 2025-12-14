import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis instance (will use environment variables)
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;
let aiRatelimit: Ratelimit | null = null;

// Initialize Redis only if credentials are available
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Standard rate limit: 100 requests per 60 seconds
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '60 s'),
    analytics: true,
    prefix: '@ratelimit',
  });

  // AI endpoint rate limit: 10 requests per 60 seconds (more restrictive)
  aiRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    analytics: true,
    prefix: '@ratelimit:ai',
  });
}

// In-memory fallback for development (not recommended for production)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const data = inMemoryStore.get(identifier);

  if (!data || now > data.resetAt) {
    inMemoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (data.count >= limit) {
    return { success: false, remaining: 0 };
  }

  data.count++;
  inMemoryStore.set(identifier, data);
  return { success: true, remaining: limit - data.count };
}

export async function checkRateLimit(identifier: string) {
  if (ratelimit && redis) {
    const { success, remaining } = await ratelimit.limit(identifier);
    return { success, remaining };
  }

  // In-memory fallback (works for single-instance deployments)
  return inMemoryRateLimit(identifier, 100, 60000);
}

export async function checkAIRateLimit(identifier: string) {
  if (aiRatelimit && redis) {
    const { success, remaining } = await aiRatelimit.limit(identifier);
    return { success, remaining };
  }

  // In-memory fallback (works for single-instance deployments)
  return inMemoryRateLimit(identifier, 10, 60000);
}
