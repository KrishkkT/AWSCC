import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/onepass/auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();

        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        const cleanInput = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        // 1. Fetch user directly from Supabase (sole source of truth)
        let user = null;
        if (supabase) {
            const { data, error } = await supabase
                .from('onepass_users')
                .select('*')
                .ilike('email', cleanInput)
                .limit(1);

            if (data && data.length > 0) {
                user = data[0];
            }
        }

        // Fallback to in-memory if Supabase lookup returned nothing
        if (!user) {
            user = OnePassDB.getUserByEmail(cleanInput);
        }

        if (!user) {
            // Also check by username prefix (e.g. "admin" for "admin@onepass.ddu.ac.in")
            const users = OnePassDB.getUsers();
            user = users.find(u => {
                if (!u.email) return false;
                const emailLower = u.email.toLowerCase().trim();
                const prefix = emailLower.split('@')[0];
                return prefix === cleanInput;
            });
        }

        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        if (user.status === 'DISABLED') {
            return NextResponse.json({ error: 'Your account has been deactivated. Contact an administrator.' }, { status: 403 });
        }

        // 2. Pure Database Password Verification
        const isMatch = verifyPassword(password, user.password_hash) ||
                        verifyPassword(cleanPassword, user.password_hash);

        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // Cache user in memory for subsequent route operations
        const db = OnePassDB.getSnapshot();
        if (Array.isArray(db.users)) {
            const idx = db.users.findIndex(u => u.id === user.id);
            if (idx === -1) {
                db.users.push(user);
            } else {
                db.users[idx] = user;
            }
        }

        const token = createSessionToken(user);
        const eventAssignments = OnePassDB.getUserEventAssignments(user.id);

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            },
            event_assignments: eventAssignments
        });

        // Set secure HTTP-only cookie
        response.cookies.set({
            name: COOKIE_NAME,
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 // 1 day (24 hours)
        });

        return response;
    } catch (e) {
        console.error('[OnePass Login Error]', e);
        return NextResponse.json({ error: 'Internal server error during login.' }, { status: 500 });
    }
}

