import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next");

    if (code) {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // If explicit redirect, use it
            if (next) {
                return NextResponse.redirect(`${origin}${next}`);
            }

            // Check profile role to decide redirect
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, is_active')
                    .eq('id', user.id)
                    .single();

                if (profile && ['faculty', 'captain', 'core'].includes(profile.role) && profile.is_active) {
                    return NextResponse.redirect(`${origin}/admin`);
                }
            }

            return NextResponse.redirect(`${origin}/`);
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
