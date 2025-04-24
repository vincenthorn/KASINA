import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import PracticeChart from "../components/PracticeChart";
import PracticeLog from "../components/PracticeLog";
import { apiRequest } from "../lib/api";

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
      
      try {
        // Get server sessions
        const response = await apiRequest("GET", "/api/sessions", undefined);
        const serverSessions = await response.json();
        console.log("Fetched server sessions:", serverSessions);
        
        if (Array.isArray(serverSessions)) {
          combinedSessions = [...serverSessions];
        }
      } catch (error) {
        console.warn("Failed to fetch sessions from server:", error);
      }
      
      try {
        // Get local sessions (we'll display both)
        const localSessions = JSON.parse(localStorage.getItem("sessions") || "[]");
        console.log("Fetched local sessions:", localSessions);
        
        if (Array.isArray(localSessions) && localSessions.length > 0) {
          // Avoid duplicates by checking IDs
          const existingIds = new Set(combinedSessions.map(s => s.id));
          const uniqueLocalSessions = localSessions.filter(s => !existingIds.has(s.id));
          
          combinedSessions = [...combinedSessions, ...uniqueLocalSessions];
        }
      } catch (localError) {
        console.error("Error parsing local sessions:", localError);
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

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-white mb-6">Practice Reflection</h1>
      
      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading your practice data...</p>
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
