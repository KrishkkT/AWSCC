import VerifyClient from "./VerifyClient";
import { createClient } from "@/utils/supabase/server";
import { parseCertificateEvent } from "@/utils/pdfGenerator";

export async function generateMetadata({ params }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: cert } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', id)
        .single();

    if (!cert) return { title: 'Certificate Not Found | AWSCC DDU' };

    const { introText, eventName } = parseCertificateEvent(cert.event_name);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://awsccddu.com';
    const templateUrl = 'attendee_template_blue.jpg';

    return {
        title: `${cert.recipient_name}'s Certificate | AWSCC DDU`,
        description: `Official ${cert.certificate_type} certificate for ${cert.recipient_name} ${introText} ${eventName}. Verified by AWS Student Builder Group DDU.`,
        openGraph: {
            title: `${cert.recipient_name} - AWS Student Builder Group Certificate`,
            description: `Achievement for ${eventName} issued by AWS Student Builder Group DDU.`,
            images: [
                {
                    url: `${siteUrl}/templates/${templateUrl}`,
                    width: 1000,
                    height: 773,
                    alt: 'AWS Student Builder Group Certificate Template',
                },
            ],
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${cert.recipient_name}'s AWSCC Achievement`,
            description: `Verified completion of ${cert.event_name}`,
            images: [`${siteUrl}/templates/${templateUrl}`],
        },
    };
}

export default async function Page({ params }) {
    return <VerifyClient params={params} />;
}
