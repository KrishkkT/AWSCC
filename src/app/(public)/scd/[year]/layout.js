export async function generateMetadata({ params }) {
    const { year } = await params;
    const yearText = year || '2026';
    return {
        title: `AWS Students Community Day Nadiad ${yearText} | DDU Gujarat | 26 September`,
        description: `AWS Students Community Day DDU Nadiad ${yearText} — a student-led cloud technology conference at Dharmsinh Desai University on 26 September ${yearText}. Tracks: Agentic AI, Cloud/DevOps, Security/SecOps. 200–250 students, industry speakers, workshops.`,
        keywords: [
            `AWS Community Day Nadiad ${yearText}`,
            `AWS SCD DDU ${yearText}`,
            'AWS Students Community Day DDU',
            `cloud conference Nadiad Gujarat ${yearText}`,
            'AWS event DDU Nadiad',
            `Dharmsinh Desai University tech event ${yearText}`,
            `SCD DDU ${yearText}`,
            'AWS SCD Nadiad',
            'cloud computing conference Gujarat',
            'AWS student event Nadiad',
            `DDIT tech event ${yearText}`,
        ],
        alternates: {
            canonical: `https://aws.ddu.ac.in/scd/${yearText}`,
        },
        openGraph: {
            title: `AWS Students Community Day Nadiad ${yearText} | 26 September | DDU Gujarat`,
            description: `Student-led cloud technology conference at Dharmsinh Desai University, Nadiad. Agentic AI, Cloud/DevOps, Security/SecOps tracks. 26 September ${yearText}.`,
            url: `https://aws.ddu.ac.in/scd/${yearText}`,
            images: [
                {
                    url: '/images/scd-2026-og.jpg',
                    width: 1200,
                    height: 630,
                    alt: `AWS Students Community Day DDU Nadiad ${yearText} — 26 September at Dharmsinh Desai University`,
                },
            ],
        },
    };
}

export default function SCDYearLayout({ children }) {
    return <>{children}</>;
}
