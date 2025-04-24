import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import PracticeChart from "../components/PracticeChart";
import PracticeLog from "../components/PracticeLog";
import { apiRequest } from "../lib/api";
import { KASINA_NAMES } from "../lib/constants";

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

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      let combinedSessions: Session[] = [];
      
      // Get local sessions first - prioritize these
      try {
        const localStorageSessions = localStorage.getItem("sessions");
        console.log("Raw localStorage:", localStorageSessions);
        
        if (localStorageSessions) {
          const localSessions = JSON.parse(localStorageSessions);
          console.log("Parsed local sessions:", localSessions);
          
          if (Array.isArray(localSessions) && localSessions.length > 0) {
            // Ensure all sessions have kasinaName
            const formattedLocalSessions = localSessions.map(session => ({
              ...session,
              kasinaName: session.kasinaName || KASINA_NAMES[session.kasinaType] || session.kasinaType
            }));
            
            combinedSessions = [...formattedLocalSessions];
            console.log("Added local sessions:", formattedLocalSessions.length);
          }
        }
      } catch (localError) {
        console.error("Error parsing local sessions:", localError);
      }
      
      // Now try to get server sessions
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
      
      // Sort sessions by timestamp (newest first)
      combinedSessions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      console.log("Final combined sessions:", combinedSessions);
      setSessions(combinedSessions);
      setIsLoading(false);
    };

    fetchSessions();
  }, []);

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
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const rawData = localStorage.getItem("sessions");
              console.log("Raw localStorage sessions:", rawData);
              if (rawData) {
                try {
                  const parsed = JSON.parse(rawData);
                  console.log("Parsed localStorage sessions:", parsed);
                  alert(`Found ${parsed.length} sessions in localStorage`);
                } catch (e) {
                  console.error("Error parsing sessions:", e);
                  alert("Error parsing sessions: " + e);
                }
              } else {
                alert("No sessions found in localStorage");
              }
            }}
            className="text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded px-2 py-1"
          >
            Debug Storage
          </button>
          <button 
            onClick={clearLocalSessions}
            className="text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded px-2 py-1"
          >
            Clear Local Data
          </button>
        </div>
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
