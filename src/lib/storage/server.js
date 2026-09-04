import ImageKit from 'imagekit';

// Cache the ImageKit instance
let imageKitInstance = null;

/**
 * Get or initialize the ImageKit server SDK instance.
 * Credentials are read exclusively from server-side environment variables.
 */
export function getImageKitServerInstance() {
    if (imageKitInstance) {
        return imageKitInstance;
    }

    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey || !urlEndpoint) {
        console.warn(
            '[ImageKit Server] Missing ImageKit credentials in environment variables. ' +
            'Required: IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT'
        );
        return null;
    }

    imageKitInstance = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint: urlEndpoint.endsWith('/') ? urlEndpoint.slice(0, -1) : urlEndpoint,
    });

    return imageKitInstance;
}

// Whitelist of allowed MIME types
export const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/avif',
    // Documents
    'application/pdf',
    // Spreadsheets / Data (if needed)
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
];

// Maximum allowed file sizes by category in bytes
export const MAX_FILE_SIZE = {
    IMAGE: 10 * 1024 * 1024,      // 10 MB
    DOCUMENT: 25 * 1024 * 1024,   // 25 MB
    DEFAULT: 10 * 1024 * 1024     // 10 MB
};

/**
 * Validates a file before server-side upload.
 * @param {Object} params
 * @param {string} params.mimeType
 * @param {number} params.size - Size in bytes
 * @param {string} params.fileName
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUploadFile({ mimeType, size, fileName }) {
    if (!fileName || typeof fileName !== 'string') {
        return { valid: false, error: 'Invalid or missing file name.' };
    }

    // Sanitize and check extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    const disallowedExtensions = ['exe', 'bat', 'cmd', 'sh', 'js', 'mjs', 'ts', 'php', 'py', 'vbs', 'scr', 'dll'];
    if (disallowedExtensions.includes(extension)) {
        return { valid: false, error: `Executable or script file type (.${extension}) is not permitted.` };
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
        return { valid: false, error: `Unsupported file type: ${mimeType}. Allowed types: Images, PDFs, CSVs.` };
    }

    const isDocument = mimeType === 'application/pdf' || extension === 'pdf';
    const limit = isDocument ? MAX_FILE_SIZE.DOCUMENT : MAX_FILE_SIZE.IMAGE;

    if (size && size > limit) {
        const limitMb = Math.round(limit / (1024 * 1024));
        return { valid: false, error: `File size exceeds the allowed limit of ${limitMb}MB.` };
    }

    return { valid: true };
}

/**
 * Upload a file to ImageKit from the server.
 * @param {Object} options
 * @param {Buffer|string} options.file - Buffer or base64 string or file URL
 * @param {string} options.fileName - Destination filename
 * @param {string} [options.folder] - Folder in ImageKit (e.g., '/events', '/team')
 * @param {boolean} [options.isPrivateFile=false] - Whether to mark file as private
 * @param {string[]} [options.tags] - Optional tags
 * @param {string} [options.customCoordinates] - Optional custom coordinates
 * @returns {Promise<{ success: boolean, url?: string, fileId?: string, name?: string, size?: number, filePath?: string, error?: string }>}
 */
export async function serverUploadFile({
    file,
    fileName,
    folder = '/uploads',
    isPrivateFile = false,
    tags = [],
    customCoordinates = null,
}) {
    const ik = getImageKitServerInstance();
    if (!ik) {
        return {
            success: false,
            error: 'ImageKit server is not configured. Please check environment variables (IMAGEKIT_PRIVATE_KEY, etc.).'
        };
    }

    try {
        // Sanitize folder path (must start with / and have no double slashes or traversal)
        let cleanFolder = folder ? folder.replace(/\\/g, '/').replace(/\/+/g, '/') : '/uploads';
        if (!cleanFolder.startsWith('/')) cleanFolder = '/' + cleanFolder;
        cleanFolder = cleanFolder.replace(/\.\./g, ''); // strip directory traversal

        const uploadParams = {
            file,
            fileName,
            folder: cleanFolder,
            isPrivateFile,
            useUniqueFileName: true,
            tags: Array.isArray(tags) ? tags : [],
        };

        if (customCoordinates) {
            uploadParams.customCoordinates = customCoordinates;
        }

        const response = await ik.upload(uploadParams);

        return {
            success: true,
            url: response.url,
            fileId: response.fileId,
            name: response.name,
            size: response.size,
            filePath: response.filePath,
            fileType: response.fileType,
            thumbnailUrl: response.thumbnailUrl,
            height: response.height,
            width: response.width,
        };
    } catch (err) {
        console.error('[ImageKit Server Upload Error]:', err);
        return {
            success: false,
            error: err.message || 'ImageKit upload failed.'
        };
    }
}

/**
 * Delete a file from ImageKit by fileId or URL.
 * @param {string} fileIdOrUrl
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function serverDeleteFile(fileIdOrUrl) {
    const ik = getImageKitServerInstance();
    if (!ik) {
        return { success: false, error: 'ImageKit server is not configured.' };
    }

    try {
        if (!fileIdOrUrl) {
            return { success: false, error: 'No file identifier provided for deletion.' };
        }

        let fileId = fileIdOrUrl;

        // If a full URL was provided, attempt to lookup the file ID via listFiles
        if (fileIdOrUrl.startsWith('http://') || fileIdOrUrl.startsWith('https://')) {
            try {
                const parsedUrl = new URL(fileIdOrUrl);
                const searchPath = parsedUrl.pathname;
                const searchName = searchPath.split('/').pop();
                if (searchName) {
                    const listResult = await ik.listFiles({
                        searchQuery: `name="${searchName}"`,
                        limit: 5,
                    });
                    if (listResult && listResult.length > 0) {
                        fileId = listResult[0].fileId;
                    } else {
                        // File not found in ImageKit, nothing to delete
                        return { success: true, message: 'File not found in ImageKit or already deleted.' };
                    }
                }
            } catch (lookupErr) {
                console.warn('[ImageKit Delete Lookup Warning]:', lookupErr.message);
            }
        }

        await ik.deleteFile(fileId);
        return { success: true };
    } catch (err) {
        console.error('[ImageKit Server Delete Error]:', err);
        return { success: false, error: err.message || 'ImageKit deletion failed.' };
    }
}

/**
 * Generate client-side upload authentication parameters.
 * Useful if client components need to upload directly to ImageKit.
 */
export function serverGetAuthParams() {
    const ik = getImageKitServerInstance();
    if (!ik) {
        return null;
    }
    return ik.getAuthenticationParameters();
}

/**
 * Retrieve metadata for a file stored in ImageKit.
 * @param {string} fileId
 */
export async function serverGetFileDetails(fileId) {
    const ik = getImageKitServerInstance();
    if (!ik) return null;
    try {
        return await ik.getFileDetails(fileId);
    } catch (err) {
        console.error('[ImageKit File Details Error]:', err);
        return null;
    }
}
