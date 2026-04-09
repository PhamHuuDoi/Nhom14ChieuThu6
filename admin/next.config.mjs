// admin/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        appDir: true,
    },
    env: {
        NEXT_PUBLIC_API_URL: 'https://nhom14chieuthu6.onrender.com/api',
    },
};

module.exports = nextConfig;
