import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import PracticeChart from "../components/PracticeChart";
import PracticeModeChart from "../components/PracticeModeChart";
import PracticeLog from "../components/PracticeLog";
import PracticeConsistencyCalendar from "../components/PracticeConsistencyCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { apiRequest } from "../lib/api";
import { KASINA_NAMES } from "../lib/constants";
import { toast } from "sonner";
import { useAuth } from "../lib/stores/useAuth";
import { useSessionLogger } from "../lib/stores/useSessionLogger";

interface Session {
  id: string;
  kasinaType: string;
  kasinaName: string;
  duration: number;
  timestamp: string;
  kasinaBreakdown?: Array<{
    kasina_type: string;
    duration_seconds: number;
  }>;
}

const ReflectionPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRegistrationDate, setUserRegistrationDate] = useState<string | undefined>(undefined);
  const { email } = useAuth();
  
  // State to track the currently selected kasina type from chart
  const [selectedKasinaType, setSelectedKasinaType] = useState<string | null>(null);
  
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
      let sessions: Session[] = [];
      
      console.log("================================");
      console.log("LOADING SESSIONS FROM DATABASE");
      console.log("Refresh counter:", refreshCounter);
      console.log("Current user:", email);
      console.log("================================");
      
      // Primary: Load sessions from database
      if (email) {
        try {
          // Fetch user registration date
          try {
            const userResponse = await apiRequest("GET", "/api/auth/me", undefined);
            const userData = await userResponse.json();
            if (userData.createdAt) {
              setUserRegistrationDate(userData.createdAt);
            }
          } catch (userError) {
            console.warn("Could not fetch user registration date:", userError);
          }

          const response = await apiRequest("GET", "/api/sessions", undefined);
          const serverSessions = await response.json();
          console.log("Fetched database sessions:", serverSessions.length);
          
          if (Array.isArray(serverSessions) && serverSessions.length > 0) {
            sessions = serverSessions;
            console.log("✅ Successfully loaded sessions from database");
          } else {
            console.log("No sessions found in database");
          }
        } catch (serverError) {
          console.error("❌ Error fetching database sessions:", serverError);
          
          // Fallback: Try to load emergency backup sessions from localStorage only if database fails
          console.log("🔄 Database failed, checking emergency backup...");
          try {
            const localStorageSessions = window.localStorage.getItem("sessions");
            
            if (localStorageSessions) {
              const localSessions = JSON.parse(localStorageSessions);
              
              if (Array.isArray(localSessions) && localSessions.length > 0) {
                const userSessions = localSessions.filter(session => 
                  !session.userEmail || session.userEmail === email
                );
                
                const formattedLocalSessions = userSessions.map(session => ({
                  ...session,
                  kasinaName: session.kasinaName || KASINA_NAMES[session.kasinaType] || session.kasinaType,
                  userEmail: email
                }));
                
                sessions = formattedLocalSessions;
                console.log("📱 Using emergency backup sessions:", sessions.length);
                toast.info(`Using ${sessions.length} backup sessions (database temporarily unavailable)`);
              }
            }
          } catch (localError) {
            console.error("❌ Emergency backup also failed:", localError);
            toast.error("Unable to load sessions from database or backup");
          }
        }
      }
      
      // Sort sessions by timestamp (newest first)
      sessions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      console.log("Final sessions loaded:", sessions.length);
      console.log("================================");
      
      setSessions(sessions);
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
    if (window.confirm("Clear emergency backup sessions from local storage? (Database sessions are not affected)")) {
      localStorage.removeItem("sessions");
      localStorage.removeItem("lastSessionBackup");
      localStorage.removeItem("sessionBackupStatus");
      toast.success("Emergency backup data cleared");
      refresh();
    }
  };

  return (
    <Layout fullWidth={true}>
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Reflect</h1>
          
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
                  onClick={async () => {
                    // Ask which kasina type to test with
                    const kasinaType = prompt("Enter kasina type to test (e.g., fire, water, blue):", "blue");
                    if (!kasinaType) return;
                    
                    // Ask for duration
                    const durationInput = prompt("Enter duration in minutes:", "1");
                    const minutes = parseInt(durationInput || "1", 10);
                    
                    try {
                      // Use the proper session logger to test database integration
                      const sessionLogger = useSessionLogger();
                      const success = await sessionLogger.logSession({
                        kasinaType: kasinaType as any,
                        duration: minutes * 60,
                        showToast: true
                      });
                      
                      if (success) {
                        toast.success(`Test ${kasinaType} session saved to database (${minutes}m)`);
                        refresh();
                      } else {
                        toast.error("Failed to save test session to database");
                      }
                    } catch (e) {
                      console.error("Database test failed:", e);
                      toast.error("Database test failed: " + e);
                    }
                  }}
                  className="text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded px-2 py-1"
                >
                  Test Database
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
          <div className="text-center py-16 px-6 bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-xl">
            <div className="mb-6 flex items-center justify-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                  <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">Loading Your Reflection</h3>
            <p className="text-gray-300">Preparing your meditation insights and practice data...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 px-6 bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-xl">
            <div className="mb-6 relative">
              <div className="inline-flex items-center justify-center p-6 bg-indigo-900/30 rounded-full mb-2 backdrop-blur-sm">
                <svg className="w-16 h-16 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>

            </div>
            
            <h3 className="text-2xl font-semibold text-white mb-4">Your Journey Awaits</h3>
            
            <div className="max-w-md mx-auto">
              <p className="text-gray-300 mb-6">Complete your first meditation session in Kasinas mode to begin tracking your practice and visualizing your progress.</p>
              
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-6">
                <h4 className="font-medium text-indigo-300 mb-2">What You'll See Here:</h4>
                <ul className="text-gray-400 text-sm space-y-2 text-left list-disc list-inside">
                  <li>Visual charts of your meditation history</li>
                  <li>Detailed practice logs for each session</li>
                  <li>Distribution of time spent with each kasina</li>
                  <li>Insights into your meditation patterns</li>
                </ul>
              </div>
              
              <Link to="/kasinas" className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-indigo-600/20">
                <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Start Meditating
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Practice Consistency Calendar */}
            <Card className="bg-gray-900 border-gray-700 shadow-xl">
              <CardHeader className="border-b border-gray-700 pb-4">
                <CardTitle className="text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Consistency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PracticeConsistencyCalendar 
                  sessions={sessions} 
                  userRegistrationDate={userRegistrationDate} 
                />
              </CardContent>
            </Card>
            
            {/* Charts Section - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PracticeChart 
                sessions={sessions} 
                selectedKasinaType={selectedKasinaType}
                onSelectKasinaType={setSelectedKasinaType}
              />
              <PracticeModeChart 
                sessions={sessions}
              />
            </div>
            
            <PracticeLog 
              sessions={sessions} 
              selectedKasinaType={selectedKasinaType}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReflectionPage;
