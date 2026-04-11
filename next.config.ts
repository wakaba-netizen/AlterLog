// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for Server Actions to handle large audio files (up to 25 MB for Whisper)
  experimental: {
    serverActions: {
      bodySizeLimit: '26mb',
    },
  },
}

export default nextConfig
