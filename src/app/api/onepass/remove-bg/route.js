import { NextResponse } from 'next/server';
import { serverUploadFile, getImageKitServerInstance } from '@/lib/storage/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * AI Background Removal & Color Replacement API
 * Uses ImageKit's remove.bg / e-bgremove engine for studio-grade portrait cutouts.
 */
export async function POST(req) {
    try {
        let body;
        try {
            body = await req.json();
        } catch (jsonErr) {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload received.' },
                { status: 400 }
            );
        }

        const { image, targetColor } = body;

        if (!image || typeof image !== 'string') {
            return NextResponse.json(
                { success: false, error: 'No image provided for background replacement.' },
                { status: 400 }
            );
        }

        const ik = getImageKitServerInstance();
        if (!ik) {
            return NextResponse.json(
                { success: false, error: 'ImageKit server not initialized.' },
                { status: 500 }
            );
        }

        const cleanColor = targetColor && targetColor !== 'transparent' && targetColor !== 'original'
            ? targetColor.replace('#', '').toUpperCase()
            : null;

        // Build ImageKit transformation string
        let transformationStr = 'e-bgremove';
        if (cleanColor) {
            transformationStr += `,bg-${cleanColor}`;
        }

        // 1. If the image is already an ImageKit URL, apply transformation directly
        if (image.includes('imagekit.io') || image.includes('ik.imagekit.io')) {
            try {
                const parsed = new URL(image);
                // Strip existing /tr:...
                let pathname = parsed.pathname.replace(/\/tr:[^/]+/g, '');
                
                // Construct transformed URL
                const endpoint = process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/awsddit';
                const cleanEndpoint = endpoint.replace(/\/$/, '');
                
                // If pathname includes the endpoint folder (e.g. /awsddit/...)
                const epFolder = new URL(cleanEndpoint).pathname.replace(/\/$/, '');
                let relativePath = pathname;
                if (epFolder && relativePath.startsWith(epFolder)) {
                    relativePath = relativePath.slice(epFolder.length);
                }
                if (!relativePath.startsWith('/')) relativePath = '/' + relativePath;

                const transformedUrl = `${cleanEndpoint}/tr:${transformationStr}${relativePath}`;
                
                return NextResponse.json({
                    success: true,
                    url: transformedUrl,
                });
            } catch (urlErr) {
                console.warn('[Transform Existing IK URL Failed]:', urlErr.message);
            }
        }

        // 2. If it's a base64 data URL, blob, or external URL, upload to ImageKit
        const uploadResult = await serverUploadFile({
            file: image,
            fileName: `badge-bg-${Date.now()}.png`,
            folder: '/onepass/processed_badges',
            isPrivateFile: false,
            tags: ['onepass', 'badge_photo', 'bg_replacement'],
        });

        if (!uploadResult.success || !uploadResult.filePath) {
            return NextResponse.json(
                { success: false, error: uploadResult.error || 'Failed to process image through ImageKit.' },
                { status: 500 }
            );
        }

        // 3. Construct the transformed remove.bg / e-bgremove URL
        const endpoint = process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/awsddit';
        const cleanEndpoint = endpoint.replace(/\/$/, '');
        let cleanFilePath = uploadResult.filePath;
        if (!cleanFilePath.startsWith('/')) cleanFilePath = '/' + cleanFilePath;

        const transformedUrl = `${cleanEndpoint}/tr:${transformationStr}${cleanFilePath}`;

        return NextResponse.json({
            success: true,
            url: transformedUrl,
            fileId: uploadResult.fileId,
        });

    } catch (err) {
        console.error('[AI Remove-BG API Error]:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Internal server error during background removal.' },
            { status: 500 }
        );
    }
}
