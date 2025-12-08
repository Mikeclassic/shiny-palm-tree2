/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' } // Allow ALL domains for scraping
        ]
    }
};

export default nextConfig;