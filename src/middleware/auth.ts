import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Middleware for route protection that requires authentication
 * Used in: /app/api/* or /app/dashboard/*
 */
export async function authMiddleware(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session exists, redirect to login
  if (!session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Optional: Validate role/user here
  // const user = session.user;
  // if (user.email !== 'admin@boston.com') {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  // }

  return NextResponse.next();
}
