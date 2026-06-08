import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isPublicApi = req.nextUrl.pathname.startsWith('/api/invite') || 
                      req.nextUrl.pathname.includes('/leaderboard');

  if (req.nextUrl.pathname.startsWith('/api') && !isPublicApi) {
    if (!isLoggedIn) {
      return Response.json({ success: false, error: 'Unauthorised' }, { status: 401 });
    }
  }

  if (!isLoggedIn && !isAuthPage && !req.nextUrl.pathname.startsWith('/api') && !req.nextUrl.pathname.startsWith('/join')) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL('/', req.nextUrl.origin));
  }
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
