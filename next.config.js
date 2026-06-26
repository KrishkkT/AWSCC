/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
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
