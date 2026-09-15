/**
 * Image Processing & AI Studio Background Replacement Utility
 * High-performance, studio-grade background removal and color replacement (remove.bg quality).
 * Powered by ImageKit AI background removal pipeline with client-side optimization.
 */

// ─── Curated Light-to-Dark Background Color Presets ──────────────────────────
export const BACKGROUND_COLOR_PRESETS = [
    // Original / Transparent
    { id: 'original', label: 'Original', color: 'transparent', category: 'special' },

    // Light Colors
    { id: 'white', label: 'Pure White', color: '#FFFFFF', category: 'light', border: '#E2E8F0' },
    { id: 'off_white', label: 'Studio Off-White', color: '#F8FAFC', category: 'light', border: '#E2E8F0' },
    { id: 'light_gray', label: 'Light Slate Gray', color: '#F1F5F9', category: 'light', border: '#CBD5E1' },
    { id: 'sky_blue', label: 'Soft Sky Blue', color: '#E0F2FE', category: 'light', border: '#BAE6FD' },
    { id: 'cream', label: 'Warm Cream', color: '#FEF3C7', category: 'light', border: '#FDE68A' },
    { id: 'mint', label: 'Soft Mint', color: '#DCFCE7', category: 'light', border: '#BBF7D0' },
    { id: 'lavender', label: 'Pastel Lilac', color: '#EDE9FE', category: 'light', border: '#DDD6FE' },

    // Medium & Professional Colors
    { id: 'aws_blue', label: 'AWSCC Blue', color: '#0073BB', category: 'medium' },
    { id: 'royal_blue', label: 'Royal Blue', color: '#2563EB', category: 'medium' },
    { id: 'indigo', label: 'Royal Indigo', color: '#4F46E5', category: 'medium' },
    { id: 'emerald', label: 'Studio Emerald', color: '#059669', category: 'medium' },
    { id: 'amber', label: 'Studio Gold', color: '#D97706', category: 'medium' },
    { id: 'crimson', label: 'Studio Crimson', color: '#DC2626', category: 'medium' },

    // Dark Colors
    { id: 'navy', label: 'Deep Navy', color: '#0F172A', category: 'dark' },
    { id: 'slate_charcoal', label: 'Slate Charcoal', color: '#1E293B', category: 'dark' },
    { id: 'dark_zinc', label: 'Dark Zinc', color: '#18181B', category: 'dark' },
    { id: 'burgundy', label: 'Deep Burgundy', color: '#4C0519', category: 'dark' },
    { id: 'forest_green', label: 'Forest Green', color: '#064E3B', category: 'dark' },
    { id: 'pure_black', label: 'Pure Black', color: '#000000', category: 'dark' },
];

/**
 * Normalizes photo URLs from CSV/Excel imports (Google Drive, Dropbox, etc.)
 */
export function normalizePhotoUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';

    // If it's a base64 or blob URL, return as is
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

    // Google Drive URL cleanup
    try {
        if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com') || trimmed.includes('googleusercontent.com')) {
            const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
            const idParam = u.searchParams.get('id');
            if (idParam) {
                return `https://drive.google.com/thumbnail?id=${idParam}&sz=w1600`;
            }
        }
    } catch {}

    const gdriveMatch = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?.*id=|uc\?.*id=|thumbnail\?.*id=)|docs\.google\.com\/(?:file\/d\/|uc\?.*id=)|googleusercontent\.com\/[du]\/(?:0\/)?)([a-zA-Z0-9_-]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${gdriveMatch[1]}&sz=w1600`;
    }

    // Dropbox cleanup
    if (trimmed.includes('dropbox.com')) {
        return trimmed.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
    }

    return trimmed;
}

/**
 * Wraps external image URLs with our CORS proxy for seamless HTML5 Canvas rendering.
 */
export function getProxiedImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    // Data URLs, Blobs, relative paths, or local URLs do not require proxying
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/') || trimmed.startsWith('./')) {
        return trimmed;
    }

    // Direct ImageKit, Cloudflare R2, Unsplash, Supabase URLs already support CORS (Access-Control-Allow-Origin: *)
    if (
        trimmed.includes('imagekit.io') ||
        trimmed.includes('ik.imagekit.io') ||
        trimmed.includes('unsplash.com') ||
        trimmed.includes('images.unsplash.com') ||
        trimmed.includes('supabase.co') ||
        trimmed.includes('r2.cloudflarestorage.com')
    ) {
        return trimmed;
    }

    // Pass foreign external URLs (Google Drive, external CDN) through our dedicated CORS proxy
    const normalized = normalizePhotoUrl(trimmed);
    return `/api/onepass/proxy-image?url=${encodeURIComponent(normalized)}`;
}

// Memory cache for processed background replacement results
const bgCache = new Map();

/**
 * Optimizes high-res images before sending over the wire to prevent 413 Entity Too Large.
 */
async function optimizeImageForUpload(src) {
    if (!src || typeof src !== 'string') return src;
    // If it's a remote URL, no need to downscale
    if (!src.startsWith('data:')) return src;

    return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const maxDim = 1200;
            let w = img.naturalWidth || img.width;
            let h = img.naturalHeight || img.height;

            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = () => resolve(src);
        img.src = src;
    });
}

// ─── Curated Background Image & Texture Presets ─────────────────────────────
export const BACKGROUND_IMAGE_PRESETS = [
    { id: 'aws_blue_grad', label: 'AWS Cyan Glow', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80' },
    { id: 'studio_dark', label: 'Dark Studio Mesh', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80' },
    { id: 'cyber_neon', label: 'Cyber Tech Glow', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80' },
    { id: 'royal_indigo', label: 'Royal Gradient', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80' },
    { id: 'warm_bokeh', label: 'Warm Bokeh', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80' },
    { id: 'studio_light', label: 'Clean Minimal Light', url: 'https://images.unsplash.com/photo-1518655048521-f130df041f66?w=800&auto=format&fit=crop&q=80' },
];

/**
 * Composites a transparent headshot cutout on top of a custom background image.
 * Uses high-resolution canvas with cover aspect-ratio fitting.
 */
export async function compositeImageWithBackground(imageSource, bgImageSource) {
    if (!bgImageSource) return imageSource;

    // 1. Get transparent cutout of foreground image
    const transparentCutout = await replaceImageBackground(imageSource, 'transparent');

    return new Promise((resolve) => {
        const bgImg = new window.Image();
        bgImg.crossOrigin = 'anonymous';

        const fgImg = new window.Image();
        fgImg.crossOrigin = 'anonymous';

        let loadedCount = 0;
        let hasResolved = false;

        const onBothLoaded = () => {
            loadedCount++;
            if (loadedCount === 2 && !hasResolved) {
                hasResolved = true;
                try {
                    const canvas = document.createElement('canvas');
                    const w = fgImg.naturalWidth || fgImg.width || 800;
                    const h = fgImg.naturalHeight || fgImg.height || 1000;
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');

                    // 1. Draw Background Image with cover fitting (BEHIND THE PERSON)
                    const bgW = bgImg.naturalWidth || bgImg.width || w;
                    const bgH = bgImg.naturalHeight || bgImg.height || h;
                    const scale = Math.max(w / bgW, h / bgH);
                    const drawW = bgW * scale;
                    const drawH = bgH * scale;
                    const drawX = (w - drawW) / 2;
                    const drawY = (h - drawH) / 2;
                    ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);

                    // 2. Draw foreground transparent cutout on top (Person in foreground)
                    ctx.drawImage(fgImg, 0, 0, w, h);

                    resolve(canvas.toDataURL('image/png'));
                } catch (err) {
                    console.warn('[Composite Image Error]:', err);
                    resolve(transparentCutout);
                }
            }
        };

        bgImg.onload = onBothLoaded;
        bgImg.onerror = () => {
            console.warn('[BG Image Load Direct Failed]: trying direct src fallback');
            if (bgImg.src !== bgImageSource) {
                bgImg.src = bgImageSource;
            } else if (!hasResolved) {
                hasResolved = true;
                resolve(transparentCutout);
            }
        };

        fgImg.onload = onBothLoaded;
        fgImg.onerror = () => {
            console.warn('[Cutout Load Direct Failed]: trying direct src fallback');
            if (fgImg.src !== transparentCutout) {
                fgImg.src = transparentCutout;
            } else if (!hasResolved) {
                hasResolved = true;
                resolve(imageSource);
            }
        };

        bgImg.src = getProxiedImageUrl(bgImageSource);
        fgImg.src = getProxiedImageUrl(transparentCutout);
    });
}

/**
 * Replaces the background of a headshot image with a target plain color or custom background image.
 * Uses remove.bg / e-bgremove AI engine via backend ImageKit pipeline for 100% studio-grade cutout.
 *
 * @param {HTMLImageElement|string} imageSource - Image element or source URL
 * @param {string} targetColor - Hex color (e.g. '#FFFFFF', '#0F172A'), 'image', or 'transparent'
 * @param {object} options - Additional options e.g. { bgImageUrl }
 * @returns {Promise<string>} - Image URL or base64 data URL
 */
export async function replaceImageBackground(imageSource, targetColor, options = {}) {
    if (targetColor === 'image' && (options?.bgImageUrl || options?.customBgImage)) {
        const bgImg = options.bgImageUrl || options.customBgImage;
        return await compositeImageWithBackground(imageSource, bgImg);
    }

    if (!targetColor || targetColor === 'transparent' || targetColor === 'original') {
        if (typeof imageSource === 'string' && targetColor !== 'transparent') return imageSource;
    }

    let srcString = '';
    if (typeof imageSource === 'string') {
        srcString = imageSource;
    } else if (imageSource instanceof HTMLImageElement || imageSource instanceof HTMLCanvasElement) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageSource.naturalWidth || imageSource.width;
        tempCanvas.height = imageSource.naturalHeight || imageSource.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(imageSource, 0, 0);
        srcString = tempCanvas.toDataURL('image/jpeg', 0.88);
    }

    if (!srcString) return '';

    // Cache key based on source signature + target color
    const cacheKey = `${srcString.slice(0, 100)}_${srcString.length}_${targetColor}`;
    if (bgCache.has(cacheKey)) {
        return bgCache.get(cacheKey);
    }

    try {
        // Optimize base64 image size before upload to prevent HTTP 413 (Entity Too Large)
        const optimizedSrc = await optimizeImageForUpload(srcString);

        // 1. Call AI Remove-BG API Endpoint
        const res = await fetch('/api/onepass/remove-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: optimizedSrc,
                targetColor,
            }),
        });

        if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.url) {
                // Pre-load the transformed image to verify accessibility and prime browser cache
                await new Promise((resolve) => {
                    const img = new window.Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(null);
                    img.src = data.url;
                });

                bgCache.set(cacheKey, data.url);
                return data.url;
            }
        } else {
            console.warn(`[AI Background Removal Warning]: Server responded with status ${res.status}`);
        }
    } catch (apiErr) {
        console.warn('[AI Background Removal API Warning]:', apiErr);
    }

    // Return original image if background processing encounters an issue
    return srcString;
}
