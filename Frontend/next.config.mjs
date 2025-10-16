/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Suppress development warnings and overlays
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Disable the warning overlay in development
  reactStrictMode: false,
  
  // Custom webpack configuration to suppress warnings
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Suppress specific warnings in development
      config.infrastructureLogging = {
        level: 'error',
      };
      
      // Disable hot reload overlay for warnings
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Experimental features to reduce warnings
  experimental: {
    optimizePackageImports: [],
  },
}

export default nextConfig
