export interface User {
    username: string;
    role: 'teacher' | 'student';
    id: string;
  }
  
  export interface LoginResponse {
    token: string;
    role: 'teacher' | 'student';
    // user: User;
  }
  
  export interface ApiErrorData {
    message?: string;
    code?: string;
    details?: Record<string, unknown>;
  }
  
  export class ApiError extends Error {
    status: number;
    data?: ApiErrorData;
  
    constructor(message: string, status: number, data?: ApiErrorData) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  }
  
  export interface AttendanceSession {
    _id: string;
    teacherId: string;
    createdAt: string;
    expiresAt: string;
    status: 'active' | 'expired' | 'cancelled';
    code: string;
  }
  export interface AttendanceHookReturn {
    sessions: AttendanceSession[];
    loading: boolean;
    error: string | null;
    createSession: () => Promise<AttendanceSession>;
    refreshSessions: () => Promise<void>;  // Added this type definition
}
  
  export interface AttendanceRecord {
    _id: string;
    sessionId: string;
    studentId: string;
    timestamp: string;
    location: {
      latitude: number;
      longitude: number;
    };
  }