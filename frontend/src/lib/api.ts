

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';


export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError'
        this.message = typeof message === 'string' ? message : 'An error occurred';
    }
}
function getTokenFromCookies() {
    const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
    return match ? match[2] : null;
  }

export async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getTokenFromCookies();
    if (!token) {
        throw new ApiError(401, 'Authentication required');
    }

    const headers: HeadersInit = {
        'Content-Type' : 'application/json',
        ...(token && { Authorization: `Bearer ${token}`}),
        ...options.headers,

    };
    try{
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });
        const data = await response.json();
        if(!response.ok){
            throw new ApiError(response.status, data.message || 'An error occurred')
        }
        return data;
    

    }catch(error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, 'Network error or server unavailable');
    }
    
    

    
    
}