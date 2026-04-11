// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for Server Actions to handle large audio files
  experimental: {
    serverActions: {
      bodySizeLimit: '26mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default nextConfig
