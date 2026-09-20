/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const rawBackend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    let backendBase = rawBackend.replace(/mongodb(\+srv)?:\/\/[^\s]+/i, '').replace(/\/api\/?$/, '').trim();
    if (!backendBase || !backendBase.startsWith('http')) {
      backendBase = 'http://127.0.0.1:5000';
    }
    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendBase}/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/incidents/:id',
        destination: '/complaints/:id',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
