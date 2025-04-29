import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { format } from "date-fns";
import { useKasina } from "../lib/stores/useKasina";

interface Session {
  id: string;
  kasinaType: string;
  kasinaName: string;
  duration: number;
  timestamp: string;
}

interface PracticeLogProps {
  sessions: Session[];
}

const PracticeLog: React.FC<PracticeLogProps> = ({ sessions }) => {
  const { getKasinaEmoji } = useKasina();

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Sort sessions by timestamp (newest first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedSessions.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Practice Log</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">No meditation sessions recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700 shadow-xl">
      <CardHeader className="border-b border-gray-700 pb-4">
        <CardTitle className="text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Practice Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedSessions.map((session) => (
            <div 
              key={session.id} 
              className="flex items-center p-4 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg border border-gray-700"
            >
              <div 
                className="text-3xl mr-4 bg-gray-700 p-2 rounded-full flex items-center justify-center h-12 w-12" 
                title={`${session.kasinaType.charAt(0).toUpperCase() + session.kasinaType.slice(1)} Kasina`}
              >
                {getKasinaEmoji(session.kasinaType)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-semibold text-lg my-0">
                    {/* Extract just the kasina type and add "Kasina" after it */}
                    {session.kasinaType.charAt(0).toUpperCase() + session.kasinaType.slice(1)} Kasina
                  </h3>
                  <div className="flex items-center h-full">
                    <span className="text-white font-semibold bg-indigo-700 hover:bg-indigo-600 px-4 py-1 rounded-full text-base flex items-center justify-center shadow-sm transition-colors min-w-[65px]">
                      <span className="font-mono">{Math.round(session.duration / 60)}</span>
                      <span className="ml-0.5">min</span>
                    </span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm">{format(new Date(session.timestamp), 'PPp')}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PracticeLog;
