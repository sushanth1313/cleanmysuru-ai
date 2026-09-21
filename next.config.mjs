/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const defaultBackend = (process.env.NODE_ENV === 'production' || process.env.VERCEL)
      ? 'https://cleanmysuru-ai.onrender.com'
      : 'http://127.0.0.1:5000';
    const rawBackend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || defaultBackend;
    let backendBase = rawBackend.replace(/mongodb(\+srv)?:\/\/[^\s]+/i, '').replace(/\/api\/?$/, '').trim();
    if (!backendBase || !backendBase.startsWith('http')) {
      backendBase = defaultBackend;
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
