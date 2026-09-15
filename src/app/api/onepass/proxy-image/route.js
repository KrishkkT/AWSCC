import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function extractGoogleDriveFileId(url) {
    if (!url) return null;
    try {
        if (url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('googleusercontent.com')) {
            const u = new URL(url.startsWith('http') ? url : `https://${url}`);
            const idParam = u.searchParams.get('id');
            if (idParam) return idParam;
        }
    } catch {}
    const match = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?.*id=|uc\?.*id=|thumbnail\?.*id=)|docs\.google\.com\/(?:file\/d\/|uc\?.*id=)|googleusercontent\.com\/[du]\/(?:0\/)?)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        let targetUrl = searchParams.get('url');

        if (!targetUrl) {
            return new NextResponse('Missing url parameter', { status: 400 });
        }

        // Clean and decode target URL
        targetUrl = decodeURIComponent(targetUrl).trim();

        // 1. Google Drive URL Resolution
        const gdriveId = extractGoogleDriveFileId(targetUrl);
        const fetchUrls = [];

        if (gdriveId) {
            // Priority order for Google Drive direct image streams
            fetchUrls.push(`https://drive.google.com/thumbnail?id=${gdriveId}&sz=w1600`);
            fetchUrls.push(`https://lh3.googleusercontent.com/d/${gdriveId}`);
            fetchUrls.push(`https://drive.google.com/uc?export=view&id=${gdriveId}`);
            fetchUrls.push(`https://drive.google.com/uc?id=${gdriveId}&export=download`);
            fetchUrls.push(`https://docs.google.com/uc?export=download&id=${gdriveId}`);
        } else if (targetUrl.includes('dropbox.com')) {
            // Dropbox URL direct download resolution
            let dbxUrl = targetUrl.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
            if (!dbxUrl.includes('raw=1') && !dbxUrl.includes('dl=1')) {
                dbxUrl += (dbxUrl.includes('?') ? '&' : '?') + 'raw=1';
            }
            fetchUrls.push(dbxUrl);
        } else {
            fetchUrls.push(targetUrl);
        }

        let response = null;
        let finalContentType = 'image/jpeg';
        let imageBuffer = null;

        for (const candidateUrl of fetchUrls) {
            try {
                const res = await fetch(candidateUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    },
                    redirect: 'follow',
                    // 15 seconds timeout
                    signal: AbortSignal.timeout(15000),
                });

                if (res.ok) {
                    const cType = res.headers.get('content-type') || '';
                    if (cType.startsWith('image/') || cType.includes('octet-stream')) {
                        const arrayBuffer = await res.arrayBuffer();
                        if (arrayBuffer.byteLength > 100) { // ensure not empty or error html
                            imageBuffer = Buffer.from(arrayBuffer);
                            finalContentType = cType.startsWith('image/') ? cType : 'image/jpeg';
                            response = res;
                            break;
                        }
                    }
                }
            } catch (err) {
                console.warn(`[Proxy Image] Candidate failed: ${candidateUrl}`, err.message);
            }
        }

        if (!imageBuffer) {
            // Fallback: 1x1 transparent PNG to prevent broken client-side crashes
            const fallback1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
            return new NextResponse(fallback1x1, {
                status: 200,
                headers: {
                    'Content-Type': 'image/png',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-store',
                },
            });
        }

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': finalContentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
            },
        });
    } catch (err) {
        console.error('[Proxy Image API Error]:', err);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
