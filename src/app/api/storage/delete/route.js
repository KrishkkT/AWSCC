import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { serverDeleteFile } from '@/lib/storage/server';

export async function POST(req) {
    try {
        // 1. Verify User Authentication
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. Authentication required.' },
                { status: 401 }
            );
        }

        // 2. Parse JSON body
        const body = await req.json();
        const { fileIdOrUrl } = body;

        if (!fileIdOrUrl) {
            return NextResponse.json(
                { success: false, error: 'Missing fileIdOrUrl parameter.' },
                { status: 400 }
            );
        }

        // 3. Delete from ImageKit
        const deleteResult = await serverDeleteFile(fileIdOrUrl);

        if (!deleteResult.success) {
            return NextResponse.json(
                { success: false, error: deleteResult.error || 'Failed to delete file from ImageKit.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Storage Delete API Error]:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Internal server error during delete.' },
            { status: 500 }
        );
    }
}
