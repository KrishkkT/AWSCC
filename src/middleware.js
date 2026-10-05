import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    const { pathname } = request.nextUrl

    // Fast-path: Only intercept protected admin routes
    if (!pathname.startsWith('/admin')) {
        return NextResponse.next()
    }

    // Allow unauthorized page without re-checking to avoid redirect loops
    if (pathname === '/admin/unauthorized') {
        return NextResponse.next()
    }

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
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

    // If not authenticated, redirect to login
    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Check RBAC role from profiles table
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

    if (error || !profile) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/unauthorized'
        return NextResponse.redirect(url)
    }

    const isAdmin = ['admin', 'faculty', 'Leader', 'core', 'member', 'captain'].includes(profile.role)
    const isActive = profile.is_active === true

    if (!isAdmin || !isActive) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/unauthorized'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        '/admin/:path*',
    ],
}
