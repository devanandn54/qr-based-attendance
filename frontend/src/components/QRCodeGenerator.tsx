'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AttendanceSession } from '@/types';

interface QRCodeGeneratorProps {
  session: AttendanceSession;
  onExpire?: () => void;
}

export function QRCodeGenerator({ session, onExpire }: QRCodeGeneratorProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const qrCodeContainerRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const expiresAt = new Date(session.expiresAt).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiresAt - now;
      if (distance <= 0) {
        clearInterval(interval);
        onExpire?.();
      } else {
        setTimeLeft(Math.floor(distance / 1000));
      }
    }, 1000);

    const initQrCode = async () => {
      if (qrCodeContainerRef.current) {
        const html5Qrcode = new Html5Qrcode(qrCodeContainerRef.current.id);
        html5QrcodeRef.current = html5Qrcode;

        try {
          await html5Qrcode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 256, height: 256 },
            },
            (decodedText, decodedResult) => {
              console.log(`Scan result: ${decodedText}`, decodedResult);
            },
            (errorMessage) => {
              console.error(`QR code error: ${errorMessage}`);
            }
          );
        } catch (error) {
          console.error("QR code initialization error:", error);
        }
      }
    };

    initQrCode();

    // Cleanup function
    return () => {
      clearInterval(interval);
      
      // Clean up QR scanner
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop()
          .then(() => {
            if (html5QrcodeRef.current) {
              html5QrcodeRef.current.clear();
              html5QrcodeRef.current = null;
            }
          })
          .catch(error => {
            console.error("Error stopping QR scanner:", error);
          });
      }
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
      <div 
        className="p-4 bg-white rounded-lg shadow" 
        ref={qrCodeContainerRef} 
        id="qr-code-container" 
      />
      <div className="text-center">
        <p className="text-sm text-gray-500">Session expires in:</p>
        <p className="text-lg font-mono">{formatTime(timeLeft)}</p>
      </div>
    </div>
  );
}