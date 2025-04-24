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
      try {
        const response = await apiRequest("GET", "/api/sessions", undefined);
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        // Fallback to local storage
        const localSessions = JSON.parse(localStorage.getItem("sessions") || "[]");
        setSessions(localSessions);
      } finally {
        setIsLoading(false);
      }
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
