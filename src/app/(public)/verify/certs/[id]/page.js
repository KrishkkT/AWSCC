import VerifyClient from "./VerifyClient";
import { createClient } from "@/utils/supabase/server";

export async function generateMetadata({ params }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: cert } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', id)
        .single();

    if (!cert) return { title: 'Certificate Not Found | AWSCC DDU' };

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://awsccddu.com';

    return {
        title: `${cert.recipient_name}'s Certificate | AWSCC DDU`,
        description: `Official ${cert.certificate_type} certificate for ${cert.recipient_name} regarding ${cert.event_name}. Verified by AWS Cloud Club DDU.`,
        openGraph: {
            title: `${cert.recipient_name} - AWS Cloud Club Certificate`,
            description: `Achievement for ${cert.event_name} issued by AWS Cloud Club DDU.`,
            images: [
                {
                    url: `${siteUrl}/templates/attendee_template.png`,
                    width: 1000,
                    height: 707,
                    alt: 'AWS Cloud Club Certificate Template',
                },
            ],
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${cert.recipient_name}'s AWSCC Achievement`,
            description: `Verified completion of ${cert.event_name}`,
            images: [`${siteUrl}/templates/attendee_template.png`],
        },
    };
}

export default async function Page({ params }) {
    return <VerifyClient params={params} />;
}
