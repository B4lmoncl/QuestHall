/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/agent-dashboard',
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
