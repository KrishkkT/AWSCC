import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // Protected Admin Routes
    if (pathname.startsWith('/admin')) {
        // If not logged in, redirect to login
        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Bypass unauthorized page to prevent infinite loop
        if (pathname === '/admin/unauthorized') {
            return response
        }

        // Check RBAC role from profiles table
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, is_active')
            .eq('id', user.id)
            .single()

        // Debug: log to server console
        console.log('[Middleware RBAC]', { userId: user.id, profile, error: error?.message })

        // If RLS blocks the query or profile not found, check if we should allow
        if (error || !profile) {
            console.log('[Middleware] Profile query failed, redirecting to unauthorized')
            const url = request.nextUrl.clone()
            url.pathname = '/admin/unauthorized'
            return NextResponse.redirect(url)
        }

        const isAdmin = ['faculty', 'captain', 'core'].includes(profile.role)
        const isActive = profile.is_active === true

        if (!isAdmin || !isActive) {
            console.log('[Middleware] Access denied:', { role: profile.role, is_active: profile.is_active })
            const url = request.nextUrl.clone()
            url.pathname = '/admin/unauthorized'
            return NextResponse.redirect(url)
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
