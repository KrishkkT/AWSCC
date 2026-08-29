export const metadata = {
    title: 'Claim Your Official Event Badge | AWS Student Community Day 2026',
    description: 'Generate and download your official personalized delegate badge for AWS Student Community Day DDU Nadiad 2026. Share on LinkedIn and social media!',
    openGraph: {
        title: 'Claim Your Official Event Badge - AWS SCD 2026',
        description: 'Generate your official personalized attendee badge for AWS Student Community Day DDU Nadiad 2026.',
        url: 'https://aws.ddu.ac.in/badge',
        siteName: 'AWS Cloud Club - DDU',
        images: [
            {
                url: '/images/badge1.png',
                width: 591,
                height: 1004,
                alt: 'AWS SCD 2026 Badge Generator'
            }
        ],
        locale: 'en_US',
        type: 'website'
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Claim Your Official Event Badge - AWS SCD 2026',
        description: 'Generate your official personalized attendee badge for AWS Student Community Day DDU Nadiad 2026.',
        images: ['/images/badge1.png']
    }
};

export default function BadgeLayout({ children }) {
    return children;
}
