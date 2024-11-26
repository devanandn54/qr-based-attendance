"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useAttendance } from "@/lib/hooks/useAttendance";
import AttendanceQRCode from "@/components/AttendanceQRCode";
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { AttendanceSession, AttendanceRecord, Location, ApiError } from "@/types";
type PopulatedAttendanceRecord = Omit<AttendanceRecord, "studentId"> & {
  studentId: {
    _id: string;
    username: string;
  };
};
type LocationDisplay = Location & {
  readableAddress: string;
};

type AttendanceModalProps = {
  session: AttendanceSession;
  onClose: () => void;
};

const AttendanceModal = ({ session, onClose }: AttendanceModalProps) => {
  const [attendance, setAttendance] = useState<PopulatedAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationDisplays, setLocationDisplays] = useState<
    Record<string, string>
  >({});

  const getReadableAddress = async (
    latitude: number,
    longitude: number
  ): Promise<string> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        return data.results[0].formatted_address;
      }
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error("Geocoding error:", error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  useEffect(() => {
    const fetchAttendanceAndLocations = async () => {
      try {
        const response = await fetchApi(
          `/attendanceSession/sessions/${session._id}/attendance`
        );
        if (Array.isArray(response)) {
          setAttendance(response as PopulatedAttendanceRecord[]);
          const addresses: Record<string, string> = {};
          for (const record of response) {
            const key = `${record.location.latitude}, ${record.location.longitude}`;
            if (!addresses[key]) {
              addresses[key] = await getReadableAddress(
                record.location.latitude,
                record.location.longitude
              );
            }
          }
          setLocationDisplays(addresses);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        setError("Failed to load attendance records");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceAndLocations();
  }, [session._id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            Attendance Records - Session {session._id.slice(0, 8)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-4">{error}</div>
          ) : attendance.length === 0 ? (
            <div className="text-center text-gray-500 p-4">
              No attendance records found for this session.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500 pb-2">
                <div>Student</div>
                <div>Time</div>
                <div>Location</div>
              </div>
              {attendance.map((record) => {
                const locationKey = `${record.location.latitude}, ${record.location.longitude}`;
                return (
                  <div
                    key={record._id}
                    className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100 text-sm"
                  >
                    <div className="font-medium text-gray-900">
                      {record.studentId.username}
                    </div>
                    <div className="text-gray-600">
                      {new Date(record.timestamp).toLocaleString()}
                    </div>
                    <div className="text-gray-600">
                      {locationDisplays[locationKey] ||
                        `${record.location.latitude.toFixed(
                          6
                        )}, ${record.location.longitude.toFixed(6)}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Total Attendance: {attendance.length} students
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TeacherPage() {
  const [mounting, setMounting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<AttendanceSession | null>(null);
  const [sessionLocations, setSessionLocations] = useState<
    Record<string, string>
  >({});
  const { user, loading } = useAuth("teacher");
  const { sessions, createSession, refreshSessions, updateSession } = useAttendance();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 5000;
  const POLLING_INTERVAL = 30000;

  const [currentLocation, setCurrentLocation] =
    useState<LocationDisplay | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  console.log("sessions", sessions)
  const getReadableAddress = async (
    latitude: number,
    longitude: number
  ): Promise<string> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        return data.results[0].formatted_address;
      }
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (err) {
      console.error("Geocoding error:", err);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

   

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        try {
          const address = await getReadableAddress(
            coords.latitude,
            coords.longitude
          );
          setCurrentLocation({
            ...coords,
            readableAddress: address,
          });
          setLocationError(null);
        } catch (err) {
          console.error("Error getting address:", err);
          setCurrentLocation({
            ...coords,
            readableAddress: `${coords.latitude.toFixed(
              6
            )}, ${coords.longitude.toFixed(6)}`,
          });
        }
      },
      (error) => {
        setLocationError("Unable to retrieve your location");
        console.error("Geolocation error:", error);
      }
    );
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  const hasActiveSession = useCallback(() => {
    return sessions.some((session) => {
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      return session.status === "active" && expiresAt > now;
    });
  }, [sessions]);

  const getCreateButtonState = useCallback(() => {
    if (isLoading) {
      return {
        disabled: true,
        text: "Creating...",
        tooltip: "Creating new session"
      };
    }
    
    if (hasActiveSession()) {
      return {
        disabled: true,
        text: "Create New Session",
        tooltip: "Please wait for the current session to expire"
      };
    }

    if (!currentLocation) {
      return {
        disabled: true,
        text: "Create New Session",
        tooltip: "Waiting for location"
      };
    }

    return {
      disabled: false,
      text: "Create New Session",
      tooltip: ""
    };
  }, [isLoading, hasActiveSession, currentLocation]);


  const canFetch = useCallback(() => {
    const now = Date.now();
    return now - lastFetchTime.current >= FETCH_COOLDOWN;
  }, []);

  const handleViewAttendance = (session: AttendanceSession) => {
    setSelectedSession(session);
  };

  const safeRefreshSessions = useCallback(async () => {
    if (!canFetch()) return;

    try {
      lastFetchTime.current = Date.now();
      await refreshSessions();
    } catch (err) {
      console.error("Failed to refresh sessions:", err);
    }
  }, [refreshSessions]);
  const updateSessionLocations = useCallback(async () => {
    for (const session of sessions) {
      if (!sessionLocations[session._id]) {
        if (session.location && (session.location as any).coordinates) {
          const [longitude, latitude] = (session.location as any).coordinates;
          console.log('Processing location for session:', session._id);
          try {
            const address = await getReadableAddress(latitude, longitude);
            setSessionLocations(prev => ({
              ...prev,
              [session._id]: address
            }));
          } catch (err) {
            console.error('Error getting address for session:', session._id, err);
            setSessionLocations(prev => ({
              ...prev,
              [session._id]: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            }));
          }
        } else {
          setSessionLocations(prev => ({
            ...prev,
            [session._id]: 'Location data not available'
          }));
        }
      }
    }
  }, [sessions, sessionLocations]);

  useEffect(() => {
    updateSessionLocations();
  }, [updateSessionLocations]);
  // Single effect to handle both initialization and polling
  useEffect(() => {
    let mounted = true;

    const initializeAndStartPolling = async () => {
      if (!user) return;

      if (mounting) {
        try {
          await safeRefreshSessions();
          await updateSessionLocations();
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
          }
        } finally {
          if (mounted) {
            setMounting(false);
          }
        }
      }

      stopPolling();

      if (hasActiveSession()) {
        isPollingRef.current = true;
        pollingIntervalRef.current = setInterval(async () => {
          if (hasActiveSession()) {
            await safeRefreshSessions();
            await updateSessionLocations();
          } else {
            stopPolling();
          }
        }, POLLING_INTERVAL);
      }
    };

    initializeAndStartPolling();

    return () => {
      mounted = false;
      stopPolling();
    };
  }, [user, mounting, hasActiveSession, safeRefreshSessions, stopPolling, updateSessionLocations]);

  // Rest of the component remains the same...
  const handleCreateSession = async () => {
    if (isLoading || !currentLocation || hasActiveSession()) return;

    try {
      setIsLoading(true);
      await createSession({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
      await safeRefreshSessions();
      setSuccess("Session created successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionExpire = async (sessionId: string) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      await updateSession(sessionId, {status: "expired"});
      stopPolling();
      await safeRefreshSessions();
      setSuccess("Session expired successfully!");
      setTimeout(() => setSuccess(null), 3000);
      await updateSessionLocations();
    } catch (error) {
      console.error('Session end error:', error);
      if (error instanceof ApiError) {
        // Handle specific error cases
        if (error.status === 404) {
          await safeRefreshSessions();
                setSuccess("Session already ended");
                setTimeout(() => setSuccess(null), 3000);
        } else if (error.status === 403) {
          setError('Not authorized to end this session');
          setTimeout(() => setError(null), 3000);
        } else {
          setError(error.message || 'Error ending session');
          setTimeout(() => setError(null), 3000);
        }
      } else {
        setError('Unexpected error while ending session');
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveSessionsCount = useCallback(() => {
    return sessions.filter((session) => {
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      return session.status === "active" && expiresAt > now;
    }).length;
  }, [sessions]);

  // Only show loading spinner during initial auth check
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <p className="text-red-500 text-lg">
            Please log in to manage attendance sessions
          </p>
        </div>
      </div>
    );
  }
  console.log("location on card", sessionLocations);

  return (
    <div className="space-y-6 p-6">
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

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome, Professor {user.username}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Active Sessions: {getActiveSessionsCount()}
            </p>
            {locationError && (
              <p className="text-sm text-red-500 mt-1">
                {locationError}

                <button
                  onClick={getCurrentLocation}
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                >
                  Retry
                </button>
              </p>
            )}
            {currentLocation && (
              <p className="text-sm text-gray-600 mt-1">
                Location: {currentLocation.readableAddress}
              </p>
            )}
          </div>
          <div className="relative group">
            <button
              onClick={handleCreateSession}
              disabled={getCreateButtonState().disabled}
              className={`px-4 py-2 rounded-md transition-colors ${
                getCreateButtonState().disabled
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {getCreateButtonState().text}
            </button>
            
            {getCreateButtonState().disabled && getCreateButtonState().tooltip && (
              <div className="absolute bottom-full mb-2 hidden group-hover:block">
                <div className="bg-gray-800 text-white text-sm rounded py-1 px-2 whitespace-nowrap">
                  {getCreateButtonState().tooltip}
                </div>
                <div className="w-3 h-3 bg-gray-800 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="bg-white shadow rounded-lg p-6 border border-gray-200"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Session {session._id.slice(0, 8)}
                </h3>
                <p className="text-sm text-gray-500">
                  Created: {new Date(session.createdAt).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  Created Location: {
                    sessionLocations[session._id] ? (
                      sessionLocations[session._id]
                    ) : session.location && session.location.latitude && session.location.longitude ? (
                      <span className="inline-flex items-center">
                        <span className="animate-pulse mr-2">Loading location...</span>
                        <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    ) : (
                      'Location data not available'
                    )
                  }
                </p> 
              </div>

              {session.status === "active" ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <AttendanceQRCode
                      session={session}
                      onExpire={async () => {
                        try {
                            await handleSessionExpire(session._id);
                        } catch (error) {
                            console.error('Failed to expire session:', error);
                        }
                    }}
                      
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleViewAttendance(session)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      View Attendance
                    </button>
                    <button
                      onClick={async () => {
                        if (!isLoading) {
                            await handleSessionExpire(session._id);
                        }
                    }}
                    disabled={isLoading}
                    className={`text-sm ${
                      isLoading 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-red-600 hover:text-red-800'
                  }`}
                    >
                      {isLoading ? 'Ending Session...' : 'End Session'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center p-4">
                    <p className="text-gray-500 capitalize">
                      Status: {session.status}
                    </p>
                    {session.status === "expired" && (
                      <p className="text-sm text-gray-400">
                        Expired: {new Date(session.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleViewAttendance(session)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      View Attendance
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {sessions.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No attendance sessions found.</p>
            <p className="text-sm text-gray-400">
              Create a new session to get started.
            </p>
          </div>
        )}

        {isLoading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}
      </div>

      {selectedSession && (
        <AttendanceModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
