/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        unoptimized: true,
    },

    async rewrites() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const destinationUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;

        return [
            {
                source: '/api/:path*',
                destination: `${destinationUrl}/:path*`,
            },
        ];
    },
};

export default nextConfig;
