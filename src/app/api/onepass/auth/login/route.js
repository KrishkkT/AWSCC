import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/onepass/auth';
import { seedOnePassDatabase } from '@/lib/onepass/seed';

export async function POST(req) {
    try {
        // Ensure initial seed if db is empty
        seedOnePassDatabase(false);

        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        const user = OnePassDB.getUserByEmail(email);
        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        if (user.status === 'DISABLED') {
            return NextResponse.json({ error: 'Your account has been deactivated. Contact an administrator.' }, { status: 403 });
        }

        const isMatch = verifyPassword(password, user.password_hash);
        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
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
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return response;
    } catch (e) {
        console.error('[OnePass Login Error]', e);
        return NextResponse.json({ error: 'Internal server error during login.' }, { status: 500 });
    }
}
