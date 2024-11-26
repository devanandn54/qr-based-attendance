

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';


const pendingRequests: Map<string, Promise<any>> = new Map();
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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {},
    role?: 'teacher' | 'student'
): Promise<T> {
    const requestKey = `${endpoint}-${options.method || 'GET'}`;
    if (options.method === 'GET' && pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey);
    }
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
    const fetchPromise = new Promise<T>(async (resolve, reject) => {
        let attempts = 0;
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        while (attempts < MAX_RETRIES) {
            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    ...options,
                    headers,
                });

                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const textData = await response.text();
                    
                    try {
                        data = JSON.parse(textData);
                    } catch(parseError) {
                        
                        // If it's not JSON, keep it as text
                        if (!response.ok) {
                            throw new ApiError(
                                response.status,
                                'Invalid response format from server'
                            );
                        }
                        data = {
                            message: textData,
                            rawResponse: true
                        };
                        console.warn('Non-JSON response received:', {
                            endpoint,
                            status: response.status,
                            contentType,
                            responsePreview: textData.slice(0, 100)
                        });
                    }
                }

                if (!response.ok) {
                    // Special handling for session end
                    if (options.method === 'PATCH' && endpoint.includes('/sessions/')) {
                        if (response.status === 404) {
                            return { status: 'expired' } as T;
                        } else if (response.status === 403) {
                            throw new ApiError(403, 'Not authorized to end this session');
                        }
                    }

                    if (response.status === 401) {
                        throw new ApiError(response.status, 'Authentication failed');
                    }
                    
                    if (response.status >= 500 && attempts < MAX_RETRIES - 1) {
                        attempts++;
                        await new Promise(r => setTimeout(r, RETRY_DELAY * attempts));
                        continue;
                    }
                    
                    const errorMessage = typeof data === 'object' && data.error 
                        ? data.error 
                        : typeof data === 'object' && data.message 
                            ? data.message 
                            : 'An error occurred';
                    
                    throw new ApiError(response.status, errorMessage);
                }

                resolve(data);
                return;
            } catch (error) {
                if (error instanceof ApiError) {
                    reject(error);
                    return;
                }
                
                attempts++;
                if (attempts === MAX_RETRIES) {
                    reject(new ApiError(500, 'Network error or server unavailable'));
                    return;
                }
                
                await new Promise(r => setTimeout(r, RETRY_DELAY * attempts));
            }
        }
    });

    if (options.method === 'GET') {
        pendingRequests.set(requestKey, fetchPromise);
    }

    try {
        const result = await fetchPromise;
        pendingRequests.delete(requestKey);
        return result;
    } catch (error) {
        pendingRequests.delete(requestKey);
        throw error;
    }
    
    

    
    
}