import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Session refresh only -- the admin-role check happens once in
// lib/admin-guard.ts (called from the (dashboard) layout), not here, so
// every request through the matcher stays cheap.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  // Also excludes static asset requests (logo.png, the auto-generated
  // icon.png favicon route, etc.) -- without this, Next's image optimizer's
  // *internal* same-origin fetch for /logo.png was itself getting caught by
  // the auth redirect above whenever the requester was signed out (e.g. on
  // /login), so it received an HTML redirect instead of image bytes and
  // failed with "requested resource isn't a valid image".
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)'],
};
