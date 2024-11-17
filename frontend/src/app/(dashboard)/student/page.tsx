'use client';

import { useAuth } from "@/lib/hooks/useAuth";
import { QRScanner } from "@/components/QRScanner";
import { useState, useEffect } from "react";
import { ApiError, AttendanceRecord, AttendanceSession } from "@/types";
import { fetchApi } from "@/lib/api";

// Updated type to match schema exactly
type QRSessionData = {
  sessionId: string;  // MongoDB _id
  code: string;      // 6-digit code
  teacherId: string;
  timestamp: string;
};

export default function StudentPage() {
  const [mounting, setMounting] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ _id?: string } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'scan'>('manual');
  const [isMobile, setIsMobile] = useState(false);
  const [scannedData, setScannedData] = useState<QRSessionData | null>(null);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    setMounting(false);
    if (user) {
      setUserData({ _id: user.id });
    }
  }, [user]);

  const handleQRCodeScan = async (qrData: string) => {
    try {
      const parsedData: QRSessionData = JSON.parse(qrData);
      // Validate that we have either sessionId or code
      if (!parsedData.code) {
        throw new Error('Invalid QR code data');
      }
      setScannedData(parsedData);
      setConfirmationStep(true);
      setScanning(false);
    } catch (err) {
      setError('Invalid QR code format');
      setScanning(false);
    }
  };

  const markAttendance = async (code: string, location: { latitude: number, longitude: number }) => {
    try {
      await fetchApi<AttendanceRecord>('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({
          code, // Using code instead of sessionId
          location
        }),
      });

      setSuccess('Attendance marked successfully!');
      return true;
    } catch (err) {
      if (err instanceof Error && err.message.includes('already marked')) {
        setError('Attendance already marked for this session');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to mark attendance');
      }
      return false;
    }
  };

  const getLocation = async (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    });
  };


  const handleAttendanceConfirmation = async () => {
    if (!userData?._id || !scannedData?.code) {
      setError('Missing required data');
      return;
    }

    setScanning(true);
    setError(null);
    setSuccess(null);

    try {
      const position = await getLocation();
      const success = await markAttendance(
        scannedData.code,
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
      );

      if (success) {
        setScannedData(null);
        setConfirmationStep(false);
      }
    } catch (err) {
      setError('Failed to get location. Please ensure location services are enabled.');
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode || !/^\d{6}$/.test(manualCode)) {
      setError('Please enter a valid 6-digit code');
      return;
  }

    setScanning(true);
    setError(null);
    setSuccess(null);

    try {
      const position = await getLocation();
      const success = await markAttendance(
        manualCode,
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
      );

      if (success) {
        setManualCode('');
        setSuccess('Attendance marked successfully!');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
    } else {
        setError('Failed to get location. Please ensure location services are enabled.');
    }
    } finally {
      setScanning(false);
    }
  };

  const renderConfirmationStep = () => {
    if (!scannedData) return null;

    return (
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900">Confirm Attendance</h3>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Session Code:</span>{' '}
            {scannedData.code}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Date:</span>{' '}
            {new Date(scannedData.timestamp).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Time:</span>{' '}
            {new Date(scannedData.timestamp).toLocaleTimeString()}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            By confirming, you agree that:
          </p>
          <ul className="text-sm text-gray-500 list-disc list-inside">
            <li>You are physically present in the class</li>
            <li>You are marking attendance for yourself only</li>
            <li>Your location will be recorded for verification</li>
          </ul>
        </div>

        <div className="flex space-x-3 mt-4">
          <button
            onClick={handleAttendanceConfirmation}
            disabled={scanning}
            className={`flex-1 py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white 
              ${scanning 
                ? 'bg-indigo-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
          >
            {scanning ? 'Marking Attendance...' : 'Confirm Attendance'}
          </button>
          <button
            onClick={() => {
              setScannedData(null);
              setConfirmationStep(false);
              setActiveTab('scan');
            }}
            disabled={scanning}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mark Attendance</h2>
        
        {userData ? (
          <div>
            {!confirmationStep && isMobile && (
              <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 mb-6">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-md ${
                    activeTab === 'manual'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Enter Code
                </button>
                <button
                  onClick={() => setActiveTab('scan')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-md ${
                    activeTab === 'scan'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Scan QR
                </button>
              </div>
            )}

            <div className="mt-4">
              {confirmationStep ? (
                renderConfirmationStep()
              ) : (
                <>
                  {(!isMobile || activeTab === 'manual') ? (
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                          Enter Attendance Code
                        </label>
                        <input
                          type="text"
                          id="code"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black sm:text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={scanning}
                        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                          ${scanning 
                            ? 'bg-indigo-400 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                          }`}
                      >
                        {scanning ? 'Marking Attendance...' : 'Mark Attendance'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        Use your device's camera to scan the QR code shown by your instructor.
                      </p>
                      <QRScanner onScan={handleQRCodeScan} scanning={scanning} setScanning={setScanning} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-red-500">Please log in to mark attendance</div>
        )}
      </div>
    </div>
  );
}