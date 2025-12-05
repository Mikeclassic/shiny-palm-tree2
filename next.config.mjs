/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'replicate.delivery' },
            { protocol: 'https', hostname: 'ae01.alicdn.com' }
        ]
    }
};

export default nextConfig;
