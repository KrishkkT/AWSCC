import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { serverDeleteFile } from '@/lib/storage/server';
import { getSessionFromRequest } from '@/lib/onepass/auth';

export async function POST(req) {
    try {
        // 1. Verify User Authentication (Supabase Auth or OnePass Admin Session)
        let userId = null;
        try {
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (user && !authError) {
                userId = user.id;
            }
        } catch {
            // Supabase auth check fallback
        }

        if (!userId) {
            const onepassUser = await getSessionFromRequest(req);
            if (onepassUser && (onepassUser.userId || onepassUser.id || onepassUser.email)) {
                userId = onepassUser.userId || onepassUser.id || onepassUser.email;
            }
        }

        if (!userId) {
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

        return NextResponse.json({ success: true, ...deleteResult });
    } catch (err) {
        console.error('[Storage Delete API Error]:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Internal server error during delete.' },
            { status: 500 }
        );
    }
}
