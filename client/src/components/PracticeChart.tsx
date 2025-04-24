import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useKasina } from "../lib/stores/useKasina";
import { KASINA_NAMES, KASINA_COLORS } from "../lib/constants";

interface PracticeChartProps {
  sessions: {
    id: string;
    kasinaType: string;
    kasinaName: string;
    duration: number;
    timestamp: string;
  }[];
}

const PracticeChart: React.FC<PracticeChartProps> = ({ sessions }) => {
  const { getKasinaColor } = useKasina();

  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Group by kasina type and sum durations
    const durationsMap = sessions.reduce((acc, session) => {
      const { kasinaType, duration } = session;
      if (!acc[kasinaType]) {
        acc[kasinaType] = 0;
      }
      acc[kasinaType] += duration;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array for chart
    return Object.entries(durationsMap).map(([kasinaType, duration]) => ({
      kasinaType,
      kasinaName: KASINA_NAMES[kasinaType] || kasinaType,
      minutes: Math.round(duration / 60),
      duration,
      color: getKasinaColor(kasinaType)
    }));
  }, [sessions, getKasinaColor]);

  // Calculate total time
  const totalTimeInSeconds = useMemo(() => {
    return sessions.reduce((total, session) => total + session.duration, 0);
  }, [sessions]);

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 p-3 rounded shadow text-white border border-gray-700">
          <p className="font-semibold">{data.kasinaName}</p>
          <p className="text-sm">{formatTime(data.duration)}</p>
          <p className="text-xs text-gray-400">
            {Math.round((data.duration / totalTimeInSeconds) * 100)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Practice Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">No meditation sessions recorded yet.</p>
          <p className="text-gray-500 text-sm mt-2">
            Complete meditation sessions to see your practice data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Practice Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  dataKey="duration"
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-col justify-center space-y-4">
            <div className="text-center">
              <h3 className="text-lg text-gray-400">Total Meditation Time</h3>
              <p className="text-3xl font-bold text-white mt-1">
                {formatTime(totalTimeInSeconds)}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {chartData.map((entry) => (
                <div key={entry.kasinaType} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm text-gray-300">{entry.kasinaName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PracticeChart;
