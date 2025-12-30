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
  experimental: {
    // Allow accessing the dev server from common localhost origins; add more if needed
    allowedDevOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
  },
}

export default nextConfig
