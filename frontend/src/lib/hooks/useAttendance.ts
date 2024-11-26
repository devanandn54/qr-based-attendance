import { AttendanceSession, AttendanceHookReturn, Location } from "@/types";
import { useState, useCallback } from "react";
import { fetchApi } from "../api";


export function useAttendance(): AttendanceHookReturn {
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshSessions = async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedSessions = await fetchApi<AttendanceSession[]>('/attendanceSession/sessions');
            setSessions(fetchedSessions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const createSession = async (location: Location): Promise<AttendanceSession> => {
        setLoading(true);
        setError(null);
        try {
            const session = await fetchApi<AttendanceSession>('/attendanceSession/sessions', {
                method: 'POST',
                body: JSON.stringify({location})
            });
            setSessions(prev => [session, ...prev]);
            return session;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create session');
            throw err;
            
        }finally {
            setLoading(false);
        }
    };

    const updateSession = useCallback(async (sessionId: string, updates: Partial<AttendanceSession>) => {
        try {
            const updatedSession = await fetchApi<AttendanceSession>(
                `/attendanceSession/sessions/${sessionId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updates)
                },
                'teacher'
            );

            setSessions(prevSessions =>
                prevSessions.map(session =>
                    session._id === sessionId
                        ? { ...session, ...updatedSession }
                        : session
                )
            );

            return updatedSession;
        } catch (error) {
            throw error;
        }
    }, []);
    return { sessions, loading, error, createSession, refreshSessions, updateSession };
}