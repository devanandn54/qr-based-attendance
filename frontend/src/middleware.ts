import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  const role = request.cookies.get('role');

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/teacher') || 
      request.nextUrl.pathname.startsWith('/student')) {
    if (!token || !role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  // Role-specific routes
  if (request.nextUrl.pathname.startsWith('/teacher') && role?.value !== 'teacher') {
    return NextResponse.redirect(new URL('/student', request.url));
  }

  if (request.nextUrl.pathname.startsWith('/student') && role?.value !== 'student') {
    return NextResponse.redirect(new URL('/teacher', request.url));
  }

  return NextResponse.next();
}

export const config = {
    matcher: ['/teacher/:path*', '/student/:path*'],
}