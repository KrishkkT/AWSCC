import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { serverUploadFile, validateUploadFile } from '@/lib/storage/server';

export async function POST(req) {
    try {
        // 1. Verify User Authentication
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. Authentication required to upload files.' },
                { status: 401 }
            );
        }

        // 2. Parse Multipart Form Data
        const formData = await req.formData();
        const file = formData.get('file');
        const folder = formData.get('folder') || '/uploads';
        const customFileName = formData.get('fileName');
        const isPrivate = formData.get('isPrivate') === 'true';
        const rawTags = formData.get('tags');

        if (!file || typeof file === 'string') {
            return NextResponse.json(
                { success: false, error: 'No valid file provided in request.' },
                { status: 400 }
            );
        }

        const fileName = customFileName || file.name || `upload-${Date.now()}`;
        const mimeType = file.type || 'application/octet-stream';
        const size = file.size || 0;

        // 3. Server-side Validation
        const validation = validateUploadFile({ mimeType, size, fileName });
        if (!validation.valid) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            );
        }

        // 4. Convert File into Buffer for ImageKit SDK
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Parse tags if provided
        let tags = [];
        if (rawTags) {
            try {
                tags = JSON.parse(rawTags);
            } catch {
                tags = [String(rawTags)];
            }
        }
        tags.push(`uploaded_by:${user.id}`);

        // 5. Perform Server-Side Upload to ImageKit
        const uploadResult = await serverUploadFile({
            file: buffer,
            fileName,
            folder: String(folder),
            isPrivateFile: isPrivate,
            tags,
        });

        if (!uploadResult.success) {
            return NextResponse.json(
                { success: false, error: uploadResult.error || 'Failed to upload to ImageKit.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            url: uploadResult.url,
            fileId: uploadResult.fileId,
            name: uploadResult.name,
            size: uploadResult.size,
            filePath: uploadResult.filePath,
            fileType: uploadResult.fileType,
            thumbnailUrl: uploadResult.thumbnailUrl,
        });

    } catch (err) {
        console.error('[Storage Upload API Error]:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Internal server error during upload.' },
            { status: 500 }
        );
    }
}
