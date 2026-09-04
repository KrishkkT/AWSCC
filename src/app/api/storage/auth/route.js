import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { serverGetAuthParams } from '@/lib/storage/server';

export async function GET(req) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. Authentication required.' },
                { status: 401 }
            );
        }

        const authParams = serverGetAuthParams();
        if (!authParams) {
            return NextResponse.json(
                { success: false, error: 'ImageKit server not properly configured.' },
                { status: 500 }
            );
        }

        return NextResponse.json(authParams);
    } catch (err) {
        console.error('[Storage Auth API Error]:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
