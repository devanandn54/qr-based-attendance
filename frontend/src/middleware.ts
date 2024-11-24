import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define cookie names consistent with your AUTH_COOKIES
const COOKIE_NAMES = {
    TEACHER: {
        token: 'teacher_token',
        role: 'teacher_role'
    },
    STUDENT: {
        token: 'student_token',
        role: 'student_role'
    }
};

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    
    // Determine which role-specific cookies to check based on the path
    const cookieConfig = path.startsWith('/teacher') ? COOKIE_NAMES.TEACHER : COOKIE_NAMES.STUDENT;
    
    // Get role-specific tokens
    const roleToken = request.cookies.get(cookieConfig.token);
    const roleValue = request.cookies.get(cookieConfig.role);

    console.log('Path:', path);
    console.log('Role token:', roleToken);
    console.log('Role value:', roleValue);

    // Protected routes check
    if (path.startsWith('/teacher') || path.startsWith('/student')) {
        if (!roleToken || !roleValue) {
            console.log('No auth tokens found, redirecting to login');
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Role-specific route protection
        if (path.startsWith('/teacher')) {
            if (roleValue.value !== 'teacher') {
                console.log('Invalid teacher access, redirecting to student page');
                return NextResponse.redirect(new URL('/student', request.url));
            }
        }

        if (path.startsWith('/student')) {
            if (roleValue.value !== 'student') {
                console.log('Invalid student access, redirecting to teacher page');
                return NextResponse.redirect(new URL('/teacher', request.url));
            }
        }
    }

    // Prevent authenticated users from accessing login page
    if (path === '/login') {
        const teacherToken = request.cookies.get(COOKIE_NAMES.TEACHER.token);
        const studentToken = request.cookies.get(COOKIE_NAMES.STUDENT.token);
        
        if (teacherToken) {
            return NextResponse.redirect(new URL('/teacher', request.url));
        }
        
        if (studentToken) {
            return NextResponse.redirect(new URL('/student', request.url));
        }
    }

    // Add cache control headers
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
}

export const config = {
    matcher: [
        '/teacher/:path*', 
        '/student/:path*',
        '/login'
    ],
};