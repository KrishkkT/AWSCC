'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EventRootRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params?.eventId;

    useEffect(() => {
        if (eventId) {
            router.replace(`/onepass/events/${eventId}/overview`);
        }
    }, [eventId, router]);

    return null;
}
