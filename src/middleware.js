import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'daily-pulse-dev-secret-key-change-in-prod'
);
const COOKIE_NAME = 'dp_session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only protect dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    // Invalid or expired token — clear it and redirect
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
