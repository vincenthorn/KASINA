import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import PracticeChart from "../components/PracticeChart";
import PracticeLog from "../components/PracticeLog";
import { apiRequest } from "../lib/api";
import { KASINA_NAMES } from "../lib/constants";
import { toast } from "sonner";
import { useAuth } from "../lib/stores/useAuth";

interface Session {
  id: string;
  kasinaType: string;
  kasinaName: string;
  duration: number;
  timestamp: string;
}

const ReflectionPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { email } = useAuth();
  
  // Check if user is admin
  const isAdmin = email === 'admin@kasina.app';

  // Disable caching in useEffect by using a refresh counter
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  const refresh = () => {
    setRefreshCounter(prev => prev + 1);
    toast.info("Refreshing sessions...");
  };

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      let combinedSessions: Session[] = [];
      
      console.log("================================");
      console.log("REFRESHING SESSIONS");
      console.log("Refresh counter:", refreshCounter);
      console.log("Current user:", email);
      console.log("================================");
      
      // Get local sessions first - prioritize these
      try {
        // Force direct window reference to avoid any scope issues
        const localStorageSessions = window.localStorage.getItem("sessions");
        console.log("Raw localStorage value:", localStorageSessions);
        
        if (localStorageSessions) {
          try {
            const localSessions = JSON.parse(localStorageSessions);
            console.log("Parsed local sessions:", localSessions);
            
            if (Array.isArray(localSessions) && localSessions.length > 0) {
              // Filter to only include sessions for the current user (or sessions with no user)
              const userSessions = localSessions.filter(session => 
                !session.userEmail || // Include orphaned sessions with no user
                session.userEmail === email // Include sessions for current user
              );
              
              // Ensure all sessions have kasinaName
              const formattedLocalSessions = userSessions.map(session => ({
                ...session,
                kasinaName: session.kasinaName || KASINA_NAMES[session.kasinaType] || session.kasinaType,
                userEmail: email // Assign current user to orphaned sessions
              }));
              
              combinedSessions = [...formattedLocalSessions];
              console.log("Added local sessions:", formattedLocalSessions.length);
              
              // Show notification if we found sessions
              if (formattedLocalSessions.length > 0) {
                toast.success(`Found ${formattedLocalSessions.length} sessions in local storage`);
              }
            } else {
              console.warn("Local sessions is not an array or is empty:", localSessions);
            }
          } catch (parseError) {
            console.error("Failed to parse local sessions JSON:", parseError);
            toast.error("Error parsing local sessions data");
          }
        } else {
          console.log("No sessions found in localStorage");
        }
      } catch (localError) {
        console.error("Error accessing localStorage:", localError);
      }
      
      // Now try to get server sessions - these will already be filtered by user
      if (email) {
        try {
          const response = await apiRequest("GET", "/api/sessions", undefined);
          const serverSessions = await response.json();
          console.log("Fetched server sessions:", serverSessions);
          
          if (Array.isArray(serverSessions) && serverSessions.length > 0) {
            // Avoid duplicates by checking IDs
            const existingIds = new Set(combinedSessions.map(s => s.id));
            const uniqueServerSessions = serverSessions.filter(s => !existingIds.has(s.id));
            
            if (uniqueServerSessions.length > 0) {
              combinedSessions = [...combinedSessions, ...uniqueServerSessions];
              console.log("Added server sessions:", uniqueServerSessions.length);
            }
          }
        } catch (error) {
          console.warn("Failed to fetch sessions from server:", error);
        }
      }
      
      // Sort sessions by timestamp (newest first)
      combinedSessions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      console.log("Final combined sessions:", combinedSessions);
      console.log("================================");
      
      setSessions(combinedSessions);
      setIsLoading(false);
    };

    // Only fetch sessions if a user is logged in
    if (email) {
      fetchSessions();
    } else {
      setIsLoading(false);
      setSessions([]);
    }
  }, [refreshCounter, email]);

  const clearLocalSessions = () => {
    if (window.confirm("Are you sure you want to clear your locally stored sessions? This can't be undone.")) {
      localStorage.removeItem("sessions");
      window.location.reload();
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Practice Reflection</h1>
        
        {/* Only show admin buttons if user is admin */}
        {isAdmin && (
          <div className="flex gap-2">
            <button 
              onClick={refresh}
              className="text-xs text-blue-500 bg-gray-800 hover:bg-gray-700 rounded px-2 py-1"
            >
              Refresh Data
            </button>
            {/* Only show in development environment - hidden in production */}
            {process.env.NODE_ENV === 'development' && (
              <button 
                onClick={() => {
                  // Ask which kasina type to test with
                  const kasinaType = prompt("Enter kasina type to test (e.g., fire, water, blue):", "");
                  if (!kasinaType) return;
                  
                  // Ask for duration
                  const durationInput = prompt("Enter duration in seconds:", "60");
                  const duration = parseInt(durationInput || "60", 10);
                  
                  try {
                    // Test direct localStorage access with user specified values
                    const testSession = {
                      id: Date.now().toString(),
                      kasinaType: kasinaType, 
                      kasinaName: KASINA_NAMES[kasinaType] || kasinaType, 
                      duration: duration,
                      timestamp: new Date().toISOString()
                    };
                    
                    // Try to get existing sessions
                    let existingSessions = [];
                    try {
                      const storedSessions = window.localStorage.getItem("sessions");
                      if (storedSessions) {
                        existingSessions = JSON.parse(storedSessions);
                        if (!Array.isArray(existingSessions)) {
                          console.error("Stored sessions is not an array:", existingSessions);
                          existingSessions = [];
                        }
                      }
                    } catch (e) {
                      console.error("Error reading from localStorage:", e);
                    }
                    
                    // Add test session
                    existingSessions.push(testSession);
                    
                    // Write back to localStorage
                    window.localStorage.setItem("sessions", JSON.stringify(existingSessions));
                    
                    // Verify it got saved
                    const verification = window.localStorage.getItem("sessions");
                    console.log("LOCAL STORAGE TEST - Saved sessions:", verification);
                    
                    toast.success(`Test ${kasinaType} session added (${duration}s)`);
                    refresh();
                  } catch (e) {
                    console.error("LocalStorage test failed:", e);
                    toast.error("LocalStorage test failed: " + e);
                  }
                }}
                className="text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded px-2 py-1"
              >
                Debug Storage
              </button>
            )}
            <button 
              onClick={clearLocalSessions}
              className="text-xs text-red-400 bg-gray-800 hover:bg-gray-700 rounded px-2 py-1"
            >
              Clear Local Data
            </button>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading your practice data...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-10 bg-gray-900 rounded-lg">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">No meditation sessions recorded yet</h3>
          <p className="text-gray-400">Complete a meditation session in Freestyle mode to start tracking your practice.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <PracticeChart sessions={sessions} />
          <PracticeLog sessions={sessions} />
        </div>
      )}
    </Layout>
  );
};

export default ReflectionPage;
