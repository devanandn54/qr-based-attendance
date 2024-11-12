'use client';

import { AttendanceSession } from "@/types";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface AttendanceQRCodeProps {
    session: AttendanceSession;
    onExpire?: () => void;
}

export default function AttendanceQRCode({ session, onExpire }: AttendanceQRCodeProps) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [qrUrl, setQrUrl] = useState<string>('');

    useEffect(() => {
        // Generate QR code
        const generateQR = async () => {
            try {
                // Create a JSON payload with session data
                const payload = {
                    sessionId: session._id,
                    timestamp: new Date().toISOString()
                };
                
                // Generate QR code as data URL
                const url = await QRCode.toDataURL(JSON.stringify(payload), {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff',
                    },
                });
                setQrUrl(url);
            } catch (err) {
                console.error("Error generating QR code:", err);
            }
        };

        // Generate initial QR code
        generateQR();

        // Set up timer for QR code refresh and expiration
        const expiresAt = new Date(session.expiresAt).getTime();
        
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = expiresAt - now;
            
            if (distance <= 0) {
                clearInterval(interval);
                onExpire?.();
            } else {
                setTimeLeft(Math.floor(distance / 1000));
                // Refresh QR code every 30 seconds for security
                if (Math.floor(distance / 1000) % 30 === 0) {
                    generateQR();
                }
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [session, onExpire]);

    // Format time as MM:SS
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
            <div className="text-center">
                <p className="text-sm text-black">Session expires in:</p>
                <p className="text-lg font-mono text-indigo-500">{formatTime(timeLeft)}</p>
            </div>
        </div>
    );
}