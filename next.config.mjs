/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            // Shopify CDN - for scraped products
            { protocol: 'https', hostname: 'cdn.shopify.com' },
            // AliExpress CDN - for supplier images
            { protocol: 'https', hostname: 'ae01.alicdn.com' },
            { protocol: 'https', hostname: '*.alicdn.com' },
            // Replicate - for AI-generated images
            { protocol: 'https', hostname: 'replicate.delivery' },
            { protocol: 'https', hostname: 'replicate.com' },
            // Own domain
            { protocol: 'https', hostname: 'clearseller.com' },
            { protocol: 'https', hostname: '*.clearseller.com' },
            // Google OAuth profile pictures
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        ]
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;