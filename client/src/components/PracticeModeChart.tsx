import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface PracticeModeChartProps {
  sessions: {
    id: string;
    kasinaType: string;
    kasinaName: string;
    duration: number;
    timestamp: string;
  }[];
}

// Custom bar component for the chart
const CustomBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      rx={4}
      ry={4}
    />
  );
};

const PracticeModeChart: React.FC<PracticeModeChartProps> = ({ sessions }) => {
  // Calculate practice mode breakdown
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    // Calculate totals for each practice mode
    const visualTotal = sessions
      .filter(s => s.kasinaName === 'Visual Kasina')
      .reduce((sum, s) => sum + s.duration, 0);
      
    const breathTotal = sessions
      .filter(s => s.kasinaName === 'Breath Kasina')
      .reduce((sum, s) => sum + s.duration, 0);
    
    const data = [];
    
    if (visualTotal > 0) {
      data.push({
        name: 'visual',
        value: visualTotal,
        displayName: 'Visual',
        color: '#8B5CF6', // Purple - represents insight/wisdom
        emoji: '👁️'
      });
    }
    
    if (breathTotal > 0) {
      data.push({
        name: 'breath',
        value: breathTotal,
        displayName: 'Breath',
        color: '#06B6D4', // Cyan - represents air/breath
        emoji: '🫁'
      });
    }
    
    return data;
  }, [sessions]);

  // Calculate total time
  const totalTime = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">
            {data.emoji} {data.displayName}
          </p>
          <p className="text-gray-300">
            {formatTime(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700 shadow-xl">
        <CardHeader className="border-b border-gray-700 pb-4">
          <CardTitle className="text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Practice Mode
          </CardTitle>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Practice Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          {/* Bar Chart */}
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <XAxis 
                  dataKey="displayName" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 14 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => formatTime(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  fill="#8884d8"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="w-full flex flex-col space-y-3">
            <div className="flex flex-wrap gap-3 justify-center">
              {chartData.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center p-2 px-3 md:p-3 md:px-4 rounded-full bg-gray-800 hover:bg-gray-700 border border-transparent transition-all"
                >
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-300 font-medium text-sm">
                    {item.emoji} {item.displayName}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">
                    {formatTime(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PracticeModeChart;