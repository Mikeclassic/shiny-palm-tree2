import { z } from 'zod';

// AI Generate endpoint validation
export const generateDescriptionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  originalDesc: z.string().max(10000, 'Description too long'),
  tone: z.enum(['Persuasive', 'Luxury', 'Professional', 'Casual']).optional(),
});

// Background change endpoint validation
export const backgroundChangeSchema = z.object({
  productImageUrl: z.string().url('Invalid image URL').refine(
    (url) => {
      // Whitelist allowed domains for image URLs
      const allowedDomains = [
        'cdn.shopify.com',
        'aliexpress.com',
        'ae01.alicdn.com',
        'replicate.delivery',
        'replicate.com',
        'clearseller.com',
      ];
      try {
        const hostname = new URL(url).hostname;
        return allowedDomains.some(domain => hostname.includes(domain));
      } catch {
        return false;
      }
    },
    { message: 'Image URL must be from an allowed domain' }
  ),
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
});

// Background removal endpoint validation
export const removeBgSchema = z.object({
  imageUrl: z.string().url('Invalid image URL').refine(
    (url) => {
      // Whitelist allowed domains for image URLs
      const allowedDomains = [
        'cdn.shopify.com',
        'aliexpress.com',
        'ae01.alicdn.com',
        'replicate.delivery',
        'replicate.com',
        'clearseller.com',
      ];
      try {
        const hostname = new URL(url).hostname;
        return allowedDomains.some(domain => hostname.includes(domain));
      } catch {
        return false;
      }
    },
    { message: 'Image URL must be from an allowed domain' }
  ),
});

// Product save endpoint validation
export const saveProductSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  generatedDesc: z.string().max(10000, 'Description too long').optional(),
  generatedImage: z.string().url('Invalid image URL').optional(),
  preferences: z.object({
    condition: z.string().max(100).optional(),
    era: z.string().max(100).optional(),
    style: z.string().max(100).optional(),
  }).optional(),
});
