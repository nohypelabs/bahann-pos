import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Bundle analyzer tidak kompatibel dengan Turbopack
// import withBundleAnalyzer from '@next/bundle-analyzer'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Enable strict mode for better error detection
  reactStrictMode: true,

  // Transpile recharts for compatibility with Turbopack
  transpilePackages: ['recharts'],

  // Performance optimizations
  experimental: {
    // Enable optimizeCss for production builds
    optimizeCss: true,
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },

  // Production build optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry build options
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source maps
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
