import { NextResponse } from 'next/server';
import { sendWhatsAppText, sendWhatsAppMedia, checkWhatsAppGatewayHealth } from '@/lib/whatsapp';

export async function GET() {
    const health = await checkWhatsAppGatewayHealth();
    return NextResponse.json({
        service: 'WhatsApp Gateway (OpenWA)',
        status: health.online ? 'connected' : 'offline',
        details: health
    });
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { to, message, mediaUrl, caption, filename } = body;

        if (!to) {
            return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
        }

        if (mediaUrl) {
            const result = await sendWhatsAppMedia({ to, mediaUrl, caption, filename });
            return NextResponse.json(result);
        }

        if (!message) {
            return NextResponse.json({ error: 'Message text or mediaUrl is required' }, { status: 400 });
        }

        const result = await sendWhatsAppText({ to, message });
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const res = await fetch('http://localhost:2785/logout', { method: 'POST' });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message || 'Failed to logout WhatsApp session' }, { status: 500 });
    }
}
