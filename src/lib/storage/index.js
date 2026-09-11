/**
 * Centralized Storage Service
 * Provides a provider-agnostic storage abstraction for client and server components.
 * Default provider: ImageKit
 */

/**
 * Check if a given URL is an ImageKit URL.
 * @param {string} url
 * @returns {boolean}
 */
export function isImageKitUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.includes('ik.imagekit.io') || (
        typeof process !== 'undefined' &&
        process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT &&
        url.startsWith(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT)
    );
}

/**
 * Check if a given URL is a legacy Supabase Storage URL.
 * @param {string} url
 * @returns {boolean}
 */
export function isSupabaseStorageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.includes('.supabase.co/storage/v1/object');
}

/**
 * Generates an optimized ImageKit delivery URL with real-time transformations.
 * If the URL is not from ImageKit, it is returned unmodified.
 *
 * @param {string} url - Original Image URL
 * @param {Object} [options]
 * @param {number} [options.width] - Desired width in pixels
 * @param {number} [options.height] - Desired height in pixels
 * @param {number} [options.quality] - Quality (1-100), default 80
 * @param {string} [options.format] - Format: 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
 * @param {string} [options.crop] - Crop mode: 'maintain_ratio' | 'force' | 'at_max'
 * @param {number} [options.blur] - Blur radius (1-100)
 * @param {number} [options.dpr] - Device pixel ratio (e.g. 2 for Retina)
 * @returns {string} - Optimized URL
 */
export function getOptimizedUrl(url, options = {}) {
    if (!url || typeof url !== 'string') return url || '';

    // If it's not an ImageKit URL, return it as-is (graceful fallback for legacy URLs or external avatars)
    if (!isImageKitUrl(url)) {
        return url;
    }

    const {
        width,
        height,
        quality = 80,
        format = 'auto',
        crop,
        blur,
        dpr
    } = options;

    const trParams = [];

    if (width) trParams.push(`w-${Math.round(width)}`);
    if (height) trParams.push(`h-${Math.round(height)}`);
    if (quality) trParams.push(`q-${quality}`);
    if (format && format !== 'original') trParams.push(`f-${format}`);
    if (crop) trParams.push(`c-${crop}`);
    if (blur) trParams.push(`bl-${blur}`);
    if (dpr) trParams.push(`dpr-${dpr}`);

    if (trParams.length === 0) {
        return url;
    }

    const trString = `tr=${trParams.join(',')}`;

    // ImageKit URL can take transformation query parameter `?tr=...` or path prefix `/tr:.../`
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('tr', trParams.join(','));
        return urlObj.toString();
    } catch {
        // Fallback for relative paths
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}${trString}`;
    }
}

/**
 * Client-side file upload helper that securely posts to the server API endpoint.
 *
 * @param {File|Blob} file - The file object from <input type="file">
 * @param {Object} [options]
 * @param {string} [options.folder='/uploads'] - Target folder path (e.g. '/events', '/team', '/gallery')
 * @param {string} [options.fileName] - Custom filename override
 * @param {boolean} [options.isPrivate=false] - Whether the file is private
/**
 * Compresses/downscales high-res image files in browser before upload to prevent HTTP 413 errors.
 */
async function compressImageForUpload(file) {
    if (!file || typeof window === 'undefined') return file;
    const type = file.type || '';
    if (!type.startsWith('image/') || type === 'image/svg+xml' || type === 'image/gif') {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                const maxDim = 1920;
                let w = img.naturalWidth || img.width;
                let h = img.naturalHeight || img.height;

                // If already small and within limits, upload directly
                if (w <= maxDim && h <= maxDim && file.size < 1.5 * 1024 * 1024) {
                    resolve(file);
                    return;
                }

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

                const outputType = type === 'image/png' && file.size < 3 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
                const quality = outputType === 'image/jpeg' ? 0.90 : undefined;

                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const compressedFile = new File([blob], file.name, {
                        type: blob.type || outputType,
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                }, outputType, quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

/**
 * Client-side file upload helper that securely posts to the server API endpoint.
 *
 * @param {File|Blob} file - The file object from <input type="file">
 * @param {Object} [options]
 * @param {string} [options.folder='/uploads'] - Target folder path (e.g. '/events', '/team', '/gallery')
 * @param {string} [options.fileName] - Custom filename override
 * @param {boolean} [options.isPrivate=false] - Whether the file is private
 * @param {string[]} [options.tags=[]] - Categorization tags
 * @returns {Promise<{ success: boolean, url?: string, fileId?: string, name?: string, size?: number, filePath?: string, error?: string }>}
 */
export async function uploadFile(file, options = {}) {
    if (!file) {
        return { success: false, error: 'No file selected for upload.' };
    }

    try {
        const fileToUpload = await compressImageForUpload(file);
        const formData = new FormData();
        formData.append('file', fileToUpload);

        if (options.folder) {
            formData.append('folder', options.folder);
        }
        if (options.fileName) {
            formData.append('fileName', options.fileName);
        }
        if (options.isPrivate) {
            formData.append('isPrivate', 'true');
        }
        if (options.tags && Array.isArray(options.tags)) {
            formData.append('tags', JSON.stringify(options.tags));
        }
        if (options.oldFileUrl || options.replaceUrl) {
            formData.append('oldFileUrl', options.oldFileUrl || options.replaceUrl);
        }

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        const rawText = await response.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch {
            if (response.status === 413 || rawText.toLowerCase().includes('request entity too large')) {
                return {
                    success: false,
                    error: 'Photo is too large (HTTP 413). Please choose a smaller image file.',
                };
            }
            return {
                success: false,
                error: `Server responded with ${response.status}: ${rawText.slice(0, 120)}`,
            };
        }

        if (!response.ok || !data.success) {
            return {
                success: false,
                error: data.error || `Upload failed with status: ${response.status}`,
            };
        }

        return {
            success: true,
            url: data.url,
            fileId: data.fileId,
            name: data.name,
            size: data.size,
            filePath: data.filePath,
            fileType: data.fileType,
        };
    } catch (err) {
        console.error('[Storage Service Upload Error]:', err);
        return {
            success: false,
            error: err.message || 'Network error during file upload.',
        };
    }
}

/**
 * Client-side file deletion helper that calls the server delete API.
 *
 * @param {string} fileIdOrUrl - The ImageKit file ID or URL to delete
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteFile(fileIdOrUrl) {
    if (!fileIdOrUrl) {
        return { success: false, error: 'No file identifier provided.' };
    }

    try {
        const response = await fetch('/api/storage/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileIdOrUrl }),
        });

        const rawText = await response.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch {
            return {
                success: false,
                error: `Server responded with status ${response.status}`,
            };
        }

        if (!response.ok || !data.success) {
            return {
                success: false,
                error: data.error || `Delete failed with status: ${response.status}`,
            };
        }

        return { success: true };
    } catch (err) {
        console.error('[Storage Service Delete Error]:', err);
        return {
            success: false,
            error: err.message || 'Network error during file deletion.',
        };
    }
}

/**
 * Format bytes into a human-readable string (e.g. 1.2 MB).
 * @param {number} bytes
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
