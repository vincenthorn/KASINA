import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import { KASINA_TYPES, KASINA_SERIES, KASINA_NAMES, KASINA_EMOJIS } from "../lib/constants";

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
  const [drillDownMode, setDrillDownMode] = useState<{ mode: string; series: string } | null>(null);

  // Helper function to get kasina series from kasina type
  const getKasinaSeries = (kasinaType: string) => {
    if (KASINA_SERIES.COLOR.includes(kasinaType)) return 'Color Kasinas';
    if (KASINA_SERIES.ELEMENTAL.includes(kasinaType)) return 'Elemental Kasinas';
    if (KASINA_SERIES.VAJRAYANA.includes(kasinaType)) return 'Vajrayana Kasinas';
    return 'Other';
  };

  // Calculate stacked bar chart data
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    // Group sessions by mode and kasina series
    const modeData: { [mode: string]: { [series: string]: number } } = {};
    
    sessions.forEach(session => {
      const mode = session.kasinaName === 'Visual Kasina' ? 'Visual' : 'Breath';
      const series = getKasinaSeries(session.kasinaType);
      
      if (!modeData[mode]) {
        modeData[mode] = {};
      }
      
      modeData[mode][series] = (modeData[mode][series] || 0) + session.duration;
    });

    // Convert to chart format
    const data: any[] = [];
    Object.entries(modeData).forEach(([mode, seriesData]) => {
      const total = Object.values(seriesData).reduce((sum, val) => sum + val, 0);
      if (total > 0) {
        data.push({
          mode,
          total,
          'Color Kasinas': seriesData['Color Kasinas'] || 0,
          'Elemental Kasinas': seriesData['Elemental Kasinas'] || 0,
          'Vajrayana Kasinas': seriesData['Vajrayana Kasinas'] || 0,
        });
      }
    });
    
    return data;
  }, [sessions]);

  // Calculate drill-down pie chart data
  const drillDownData = useMemo(() => {
    if (!drillDownMode || !sessions) return [];
    
    const filteredSessions = sessions.filter(s => {
      const mode = s.kasinaName === 'Visual Kasina' ? 'Visual' : 'Breath';
      const series = getKasinaSeries(s.kasinaType);
      return mode === drillDownMode.mode && series === drillDownMode.series;
    });

    const kasinaData: { [kasina: string]: number } = {};
    filteredSessions.forEach(session => {
      kasinaData[session.kasinaType] = (kasinaData[session.kasinaType] || 0) + session.duration;
    });

    return Object.entries(kasinaData).map(([kasina, duration]) => ({
      name: kasina,
      value: duration,
      displayName: KASINA_NAMES[kasina] || kasina,
      emoji: KASINA_EMOJIS[kasina] || '⚫',
      color: getKasinaColor(kasina)
    }));
  }, [drillDownMode, sessions]);

  // Get color for kasina series
  const getSeriesColor = (series: string) => {
    switch (series) {
      case 'Color Kasinas': return '#8B5CF6'; // Purple
      case 'Elemental Kasinas': return '#06B6D4'; // Cyan
      case 'Vajrayana Kasinas': return '#F59E0B'; // Amber
      default: return '#6B7280'; // Gray
    }
  };

  // Get color for individual kasinas
  const getKasinaColor = (kasina: string) => {
    const colors: { [key: string]: string } = {
      [KASINA_TYPES.BLUE]: '#3B82F6',
      [KASINA_TYPES.RED]: '#EF4444', 
      [KASINA_TYPES.YELLOW]: '#EAB308',
      [KASINA_TYPES.WHITE]: '#F3F4F6',
      [KASINA_TYPES.WATER]: '#06B6D4',
      [KASINA_TYPES.FIRE]: '#F97316',
      [KASINA_TYPES.EARTH]: '#84CC16',
      [KASINA_TYPES.AIR]: '#8B5CF6',
      [KASINA_TYPES.SPACE]: '#A855F7',
      [KASINA_TYPES.LIGHT]: '#06B6D4',
      [KASINA_TYPES.WHITE_A_KASINA]: '#8B5CF6',
      [KASINA_TYPES.WHITE_A_THIGLE]: '#06B6D4',
      [KASINA_TYPES.OM_KASINA]: '#F59E0B',
      [KASINA_TYPES.AH_KASINA]: '#EF4444',
      [KASINA_TYPES.HUM_KASINA]: '#10B981',
      [KASINA_TYPES.RAINBOW_KASINA]: '#8B5CF6',
    };
    return colors[kasina] || '#6B7280';
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Custom tooltip for stacked bar
  const StackedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label} Mode</p>
          {payload.map((entry: any, index: number) => (
            entry.value > 0 && (
              <div key={index} className="text-gray-300 text-sm">
                <span style={{ color: entry.color }}>●</span> {entry.dataKey}: {formatTime(entry.value)}
              </div>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: any) => {
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

  // Handle bar click for drill-down
  const handleBarClick = (data: any, series: string) => {
    if (data[series] > 0) {
      setDrillDownMode({ mode: data.mode, series });
    }
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
        {drillDownMode ? (
          // Drill-down pie chart view
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">
                {drillDownMode.series} in {drillDownMode.mode} Mode
              </h3>
              <button
                onClick={() => setDrillDownMode(null)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                ← Back to Overview
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              {/* Chart container */}
              <div className="w-80 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={drillDownData}
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={60}
                      dataKey="value"
                      labelLine={false}
                      paddingAngle={2}
                    >
                      {drillDownData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          className="hover:opacity-90 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend below chart */}
              <div className="w-full flex flex-col space-y-3">
                <div className="flex flex-wrap gap-3 justify-center">
                  {drillDownData.map((item, index) => {
                    const lightColor = item.color + '20'; // Add 20% opacity
                    return (
                      <div 
                        key={index} 
                        className="flex items-center p-2 px-3 md:p-3 md:px-4 rounded-full border border-transparent hover:border-gray-600 transition-all"
                        style={{ backgroundColor: lightColor }}
                      >
                        <span className="mr-2 text-xl md:text-2xl">{item.emoji}</span>
                        <span className="text-sm md:text-base text-white">
                          {item.displayName}
                        </span>
                        <span className="ml-2 text-xs md:text-sm text-gray-300">
                          {formatTime(item.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Main stacked bar chart view
          <div className="flex flex-col gap-6">
            <div className="text-center text-gray-400 text-sm">
              Click on a section to see detailed breakdown
            </div>
            
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
                    dataKey="mode" 
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
                  <Tooltip content={<StackedTooltip />} />
                  
                  <Bar 
                    dataKey="Color Kasinas"
                    stackId="mode"
                    fill={getSeriesColor('Color Kasinas')}
                    radius={[0, 0, 0, 0]}
                    onClick={(data) => handleBarClick(data, 'Color Kasinas')}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="Elemental Kasinas"
                    stackId="mode"
                    fill={getSeriesColor('Elemental Kasinas')}
                    radius={[0, 0, 0, 0]}
                    onClick={(data) => handleBarClick(data, 'Elemental Kasinas')}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="Vajrayana Kasinas"
                    stackId="mode"
                    fill={getSeriesColor('Vajrayana Kasinas')}
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => handleBarClick(data, 'Vajrayana Kasinas')}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend for stacked bars */}
            <div className="flex flex-wrap gap-3 justify-center">
              {['Color Kasinas', 'Elemental Kasinas', 'Vajrayana Kasinas'].map((series) => {
                const seriesColor = getSeriesColor(series);
                const lightColor = seriesColor + '20'; // Add 20% opacity
                
                // Calculate total time for this series across all modes
                const seriesTotal = chartData.reduce((sum, modeData) => sum + (modeData[series] || 0), 0);
                const seriesEmoji = series === 'Color Kasinas' ? '🎨' : 
                                  series === 'Elemental Kasinas' ? '✨' : '💀';
                
                return (
                  <div 
                    key={series}
                    className="flex items-center p-2 px-3 md:p-3 md:px-4 rounded-full border border-transparent hover:border-gray-600 transition-all"
                    style={{ backgroundColor: lightColor }}
                  >
                    <span className="mr-2 text-xl md:text-2xl">{seriesEmoji}</span>
                    <span className="text-sm md:text-base text-white">
                      {series}
                    </span>
                    <span className="ml-2 text-xs md:text-sm text-gray-300">
                      {formatTime(seriesTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PracticeModeChart;