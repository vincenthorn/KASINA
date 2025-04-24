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
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Practice Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sortedSessions.map((session) => (
            <div 
              key={session.id} 
              className="flex items-center p-3 bg-gray-800 rounded-lg"
            >
              <div className="text-2xl mr-3" title={session.kasinaName}>
                {getKasinaEmoji(session.kasinaType)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="text-white font-medium">{session.kasinaName}</h3>
                  <span className="text-gray-400 text-sm">{formatTime(session.duration)}</span>
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
