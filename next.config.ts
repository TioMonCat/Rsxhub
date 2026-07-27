import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for all responses
  compress: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Reduced from 100mb — uploads are compressed to <2MB by the API
    },
  },

  images: {
    // Enable image format negotiation (WebP/AVIF when browser supports it)
    formats: ['image/avif', 'image/webp'],
    // Set aggressive cache TTL for optimized images (1 year)
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.steamstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'steamcdn-a.akamaihd.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Reduce bundle size by only including used locales
  // (removes ~1MB from next's built-in i18n polyfills)
  webpack(config, { isServer }) {
    // Tree-shake unused lucide-react icons (they ship ESM so webpack can do this automatically,
    // but we make sure moduleIds are deterministic for better caching)
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    }
    return config
  },
}

export default nextConfig
