'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  scanning: boolean;
  setScanning: (scanning: boolean) => void;
}

export function QRScanner({ onScan, scanning, setScanning }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const html5QrcodeScannerRef = useRef<Html5QrcodeScanner | null>(null);
  const stopScanning = useCallback(() => {
    setScanning(false);
    setError(null);
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear().catch((err) => {
        console.error('Error stopping QR code scan', err);
      });
    }
  }, [setScanning]);

  useEffect(() => {
    if (scanning && scannerRef.current) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        scannerRef.current.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.777777778,
          disableFlip: true,
        },
        false
      );
      html5QrcodeScannerRef.current = html5QrcodeScanner;

      html5QrcodeScanner.render(
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          console.warn('QR Scanner error:', errorMessage);
          setError(errorMessage); 
        }
      );

      return () => {
        html5QrcodeScanner.clear().catch((err) => {
          console.error('Error stopping QR code scan', err);
        });
      };
    }
  }, [scanning, onScan, stopScanning]);

  const startScanning = () => {
    setScanning(true);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {scanning ? (
        <div
          className="relative w-full max-w-md aspect-square"
          ref={scannerRef}
          id="qr-scanner"
        >
          {/* QR code scanner will be rendered here */}
        </div>
      ) : (
        <button
          onClick={startScanning}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Camera size={24} />
          <span>Start Scanner</span>
        </button>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}