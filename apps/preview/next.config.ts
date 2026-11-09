import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  transpilePackages: ['@kemo/ui'],
  output: 'standalone',
  // Next compiles this file to CommonJS, so __dirname is defined. Tracing from the monorepo root
  // puts the server at .next/standalone/apps/preview/server.js.
  outputFileTracingRoot: path.join(__dirname, '../..'),
}

export default nextConfig
