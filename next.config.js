/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ik.imagekit.io',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                pathname: '/storage/v1/object/**',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'ui-avatars.com',
                pathname: '/**',
            },
        ],
    },
    async redirects() {
        return [
            {
                source: '/teams',
                destination: '/team',
                permanent: true,
            },
            {
                source: '/community-day/:year',
                destination: '/scd/:year',
                permanent: true,
            },
        ];
    },
};

module.exports = nextConfig;
