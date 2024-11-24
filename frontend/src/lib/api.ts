

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';


export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError'
        this.message = typeof message === 'string' ? message : 'An error occurred';
    }
}
export const AUTH_COOKIES = {
    TEACHER: {
        token: 'teacher_token',
        role: 'teacher_role',
    },
    STUDENT: {
        token: 'student_token',
        role: 'student_role',
    }
} as const;
export function getCookieValue(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^|)' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}
export function getRoleSpecificToken(role: 'teacher' | 'student'): string | null {
    const cookieKey = role === 'teacher' ? AUTH_COOKIES.TEACHER : AUTH_COOKIES.STUDENT;
    return getCookieValue(cookieKey.token);
}
export function setAuthCookies(token: string, role: 'teacher' | 'student'): void {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    const cookieConfig = role === 'teacher' ? AUTH_COOKIES.TEACHER : AUTH_COOKIES.STUDENT;

    document.cookie = `${cookieConfig.token}=${encodeURIComponent(token)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    document.cookie = `${cookieConfig.role}=${encodeURIComponent(role)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;

}

export async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {},
    role?: 'teacher' | 'student'
): Promise<T> {
    const isLoginEndpoint = endpoint === '/auth/login';
    let token = null;

    if (!isLoginEndpoint) {
        if (role) {
            token = getRoleSpecificToken(role);
        } else {
            const currentPath = window.location.pathname;
            if (currentPath.startsWith('/teacher')) {
                token = getRoleSpecificToken('teacher');
                role = 'teacher';
            } else if (currentPath.startsWith('/student')) {
                token = getRoleSpecificToken('student');
                role = 'student';
            }
        }

        if (!token) {
            throw new ApiError(401, 'Authentication required');
        }
    }

    const headers: HeadersInit = {
        'Content-Type' : 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}`}),
        ...options.headers,

    };
    try{
        console.log(`Fetching ${endpoint} with role: ${role}`);
        console.log('Headers:', headers);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });
        const data = await response.json();
        if(!response.ok){
            console.error('API Error:', data);
            throw new ApiError(response.status, data.message || 'An error occurred')
        }
        return data;
    

    }catch(error) {
        console.error('Fetch API Error:', error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, 'Network error or server unavailable');
    }
    
    

    
    
}