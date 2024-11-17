import { AttendanceSession, AttendanceHookReturn, Location } from "@/types";
import { useState } from "react";
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
    return { sessions, loading, error, createSession, refreshSessions };
}