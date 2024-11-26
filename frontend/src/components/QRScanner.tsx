'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, AlertTriangle } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  scanning: boolean;
  setScanning: (scanning: boolean) => void;
}

export function QRScanner({ onScan, scanning, setScanning }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<{
    type: 'warning' | 'error' | null;
    text: string | null;
  }>({ type: 'warning', text: 'Please point your camera at a QR code' });
  const html5QrcodeScannerRef = useRef<Html5QrcodeScanner | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const qrDetectedRef = useRef<boolean>(false);

  const stopScanning = useCallback(() => {
    setScanning(false);
    setMessage({ type: null, text: null });
    qrDetectedRef.current = false;
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
          qrDetectedRef.current = true;
          try {
            // Try to parse the QR code content
            const parsedData = JSON.parse(decodedText);
            if (!parsedData.code || !parsedData.sessionId) {
              setMessage({
                type: 'error',
                text: 'QR code parse error, error = Invalid QR code format.'
              });
            } else {
              onScan(decodedText);
              stopScanning();
            }
          } catch (parseError) {
            setMessage({
              type: 'error',
              text: 'QR code parse error, error = Invalid QR code format.'
            });
          }
        }, 
        (errorMessage) => {
          // Check if the error is about no QR code detected
          if (!qrDetectedRef.current) {
            setMessage({
              type: 'warning',
              text: 'Please point your camera at a QR code'
            });
          }
        }

      );

      const addCustomStyles = () => {
        const style = document.createElement('style');
        style.setAttribute('data-qr-scanner-styles', 'true');
        style.textContent = `
          /* Override all text colors within the scanner */
          #qr-scanner div,
          #qr-scanner span,
          #qr-scanner p,
          #qr-scanner select,
          #qr-scanner option,
          #qr-scanner button {
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-weight: 500 !important;
            text-shadow: none !important;
          }

          /* Scanner container */
          #qr-scanner-container,
          #qr-scanner {
            background-color: #FFFFFF !important;
            padding: 20px !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          }

          /* Select dropdown */
          #qr-scanner select {
            background-color: #FFFFFF !important;
            border: 1px solid #D1D5DB !important;
            border-radius: 6px !important;
            padding: 8px 12px !important;
            margin: 8px 0 !important;
            width: auto !important;
            min-width: 200px !important;
            font-size: 14px !important;
          }

          /* Primary action buttons */
          #html5-qrcode-button-camera-permission,
          #html5-qrcode-button-camera-start {
            background-color: #4F46E5 !important;
            color: #FFFFFF !important;
            border: none !important;
            padding: 8px 16px !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
            margin: 4px !important;
            cursor: pointer !important;
          }

          /* Stop button */
          #html5-qrcode-button-camera-stop {
            background-color: #DC2626 !important;
            color: #FFFFFF !important;
            border: none !important;
            padding: 8px 16px !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
            margin: 4px !important;
            cursor: pointer !important;
          }

          /* Secondary buttons */
          #qr-scanner button:not(#html5-qrcode-button-camera-permission):not(#html5-qrcode-button-camera-start):not(#html5-qrcode-button-camera-stop) {
            background-color: #FFFFFF !important;
            color: #4B5563 !important;
            border: 1px solid #D1D5DB !important;
            padding: 8px 16px !important;
            border-radius: 6px !important;
            margin: 4px !important;
            cursor: pointer !important;
          }

          /* Link styles */
          #html5-qrcode-anchor-scan-type-change {
            color: #4F46E5 !important;
            text-decoration: underline !important;
            font-weight: 500 !important;
            cursor: pointer !important;
          }

          /* Section headers */
          #qr-scanner .html5-qrcode-element {
            color: #111827 !important;
            font-weight: 600 !important;
            font-size: 14px !important;
            margin: 8px 0 !important;
          }

          /* File selection button */
          #qr-scanner input[type="file"] {
            color: #4B5563 !important;
          }

          /* Override any other text elements */
          #qr-scanner * {
            color: #000000 !important;
          }
        `;
        document.head.appendChild(style);
        styleRef.current = style;
      };

      // Add styles immediately and then again after a short delay
      addCustomStyles();
      const timeoutId = setTimeout(addCustomStyles, 100);

      


      return () => {
        html5QrcodeScanner.clear().catch((err) => {
          console.error('Error stopping QR code scan', err);
        });
        if (styleRef.current) {
          styleRef.current.remove();
        }
        qrDetectedRef.current = false;
      };
    }
  }, [scanning, onScan, stopScanning]);

  const startScanning = () => {
    setScanning(true);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {scanning ? (
        <div className="w-full max-w-md">
          <div
            className="bg-white rounded-lg shadow-lg overflow-hidden"
            ref={scannerRef}
            id="qr-scanner"
          />
          {message.text && (
            <div className={`mt-4 ${
              message.type === 'warning' 
                ? 'bg-amber-50 border-l-4 border-amber-500' 
                : 'bg-red-50 border-l-4 border-red-500'
              } p-4`}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  ) : (
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
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm ${
                    message.type === 'warning' 
                      ? 'text-amber-700' 
                      : 'text-red-700'
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setScanning(true)}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Camera size={24} />
          <span>Start Scanner</span>
        </button>
      )}
    </div>
  );
}