'use client';

import { AttendanceSession } from "@/types";
import { useEffect, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { fetchApi } from "@/lib/api";

interface AttendanceQRCodeProps {
    session: AttendanceSession;
    onExpire?: () => void;
}

interface SessionCode {
    code: string;
    codeUpdatedAt: string;
    expiresAt: string;
}

export default function AttendanceQRCode({ session, onExpire }: AttendanceQRCodeProps) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [qrUrl, setQrUrl] = useState<string>('');
    const [displayCode, setDisplayCode] = useState<string>('');
    const [currentCode, setCurrentCode] = useState<SessionCode | null>(null);
    const [nextRefresh, setNextRefresh] = useState<number>(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastFetchTime = useRef<number>(0);
    const fetchInProgress = useRef<boolean>(false);
    const generateQR = useCallback(async (code: string, timestamp: string) => {
        try {
            const payload = {
                code,
                sessionId: session._id,
                teacherId: session.teacherId,
                timestamp
            };
            
            const url = await QRCode.toDataURL(JSON.stringify(payload), {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            });
            setQrUrl(url);
            setDisplayCode(code);
            
        } catch (err) {
            console.error("Error generating QR code:", err);
            
        }
    }, [session._id, session.teacherId]);

    const fetchCurrentCode = useCallback(async (force: boolean = false) => {
        if (fetchInProgress.current && !force) {
            return;
        }
        
        const now = Date.now();
        if (!force && now - lastFetchTime.current < 2000) return;
        
        try {
            fetchInProgress.current = true;
            setIsRefreshing(true);
            lastFetchTime.current = now;

            const response = await fetchApi<SessionCode>(
                `/attendanceSession/sessions/${session._id}/code`,
                { method: 'GET' },
                'teacher'
            );

            // Always update if forced or if we have a new code
            if (force || !currentCode || response.code !== currentCode.code) {
                setCurrentCode(response);
                await generateQR(response.code, response.codeUpdatedAt);
                const codeUpdateTime = new Date(response.codeUpdatedAt).getTime();
                // Set next refresh time (2:55 minutes)
                const nextRefreshTime = codeUpdateTime + (2 * 60 + 55) * 1000;
                setNextRefresh(nextRefreshTime);
            }
        } catch (err) {
            console.error("Error fetching session code:", err);
            const retryTime = force ? 5000 : 30000; // 5 seconds if forced, 30 seconds otherwise
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
            refreshTimeoutRef.current = setTimeout(() => fetchCurrentCode(true), retryTime);
        } finally {
            setIsRefreshing(false);
            fetchInProgress.current = false;
        }
    }, [session._id, generateQR, currentCode]);
    useEffect(() => {
        fetchCurrentCode(true);
        return () => {
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
            
        };
    }, [fetchCurrentCode]);

    useEffect(() => {
        if (!nextRefresh) return;

        const scheduleNextRefresh = () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }

            const now = Date.now();
            const timeToRefresh = nextRefresh - now;

            if (timeToRefresh <= 0) {
                fetchCurrentCode(true);
            } else {
                refreshTimeoutRef.current = setTimeout(() => fetchCurrentCode(true), timeToRefresh);
            }
        };

        scheduleNextRefresh();

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, [nextRefresh, fetchCurrentCode]);

    // Immediate refresh function
    const immediateRefresh = useCallback(() => {
        // Clear existing timeout
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }
        // Force immediate refresh
        fetchCurrentCode(true);
    }, [fetchCurrentCode]);

    // Effect for code refreshing
    useEffect(() => {
        fetchCurrentCode(true); // Initial fetch with force

        const scheduleNextRefresh = () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }

            const now = Date.now();
            const timeToRefresh = nextRefresh - now;

            if (timeToRefresh <= 0) {
                immediateRefresh();
            } else {
                refreshTimeoutRef.current = setTimeout(immediateRefresh, timeToRefresh);
            }
        };

        scheduleNextRefresh();

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, [fetchCurrentCode, nextRefresh, immediateRefresh]);

    // Effect for countdown timer
    useEffect(() => {
        if (!currentCode) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const expiresAt = new Date(currentCode.expiresAt).getTime();
            const distance = expiresAt - now;
            
            if (distance <= 0) {
                clearInterval(interval);
                immediateRefresh(); // Immediately refresh when timer hits zero
                onExpire?.();
            } else {
                setTimeLeft(Math.floor(distance / 1000));
            }
        }, 1000);

        // Initial time set
        const initialDistance = new Date(currentCode.expiresAt).getTime() - new Date().getTime();
        setTimeLeft(Math.floor(Math.max(0, initialDistance) / 1000));

        return () => clearInterval(interval);
    }, [currentCode, onExpire, immediateRefresh]);

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-lg shadow">
                {qrUrl && (
                    <img
                        src={qrUrl}
                        alt="Session QR Code"
                        className="w-64 h-64"
                    />
                )}
            </div>
            <div className="text-center space-y-2">
                <p className="text-sm text-black">Code refreshes in:</p>
                <p className="text-lg font-mono text-orange-500">
                    {formatTime(Math.max(0, Math.floor((nextRefresh - Date.now()) / 1000)))}
                </p>
                <p className="text-sm text-black">Session expires in:</p>
                <p className="text-lg font-mono text-indigo-500">{formatTime(timeLeft)}</p>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
                <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        Or enter this code:
                    </p>
                    <div className="text-3xl font-mono tracking-wider bg-white p-3 text-black rounded-md border border-gray-200 inline-block">
                        {displayCode}
                    </div>
                </div>
            </div>
        </div>
    );
}