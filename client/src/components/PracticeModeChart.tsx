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

// Custom bar component for the chart with hover effects
const CustomBar = (props: any) => {
  const { fill, x, y, width, height, payload, dataKey, setHoveredSegment } = props;
  const [isHovered, setIsHovered] = useState(false);
  
  // Calculate expanded dimensions when hovered
  const expandAmount = isHovered ? 4 : 0;
  const adjustedX = x - expandAmount / 2;
  const adjustedWidth = width + expandAmount;
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    setHoveredSegment && setHoveredSegment(dataKey?.replace(' Kasinas', '') || '');
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoveredSegment && setHoveredSegment(null);
  };
  
  return (
    <rect
      x={adjustedX}
      y={y}
      width={adjustedWidth}
      height={height}
      fill={fill}
      rx={4}
      ry={4}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        filter: isHovered ? 'brightness(1.1)' : 'none'
      }}
    />
  );
};

const PracticeModeChart: React.FC<PracticeModeChartProps> = ({ sessions }) => {
  const [drillDownSeries, setDrillDownSeries] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Helper function to get kasina series from kasina type
  const getKasinaSeries = (kasinaType: string) => {
    if (KASINA_SERIES.COLOR.includes(kasinaType)) return 'Color Kasinas';
    if (KASINA_SERIES.ELEMENTAL.includes(kasinaType)) return 'Elemental Kasinas';
    if (KASINA_SERIES.VAJRAYANA.includes(kasinaType)) return 'Vajrayana Kasinas';
    return 'Other';
  };

  // Get color for individual kasinas - using gentler colors matching the Practice Breakdown
  const getKasinaColor = (kasina: string) => {
    const colors: { [key: string]: string } = {
      [KASINA_TYPES.BLUE]: '#3B82F6',
      [KASINA_TYPES.RED]: '#F87171', 
      [KASINA_TYPES.YELLOW]: '#FCD34D',
      [KASINA_TYPES.WHITE]: '#F3F4F6',
      [KASINA_TYPES.WATER]: '#67E8F9',
      [KASINA_TYPES.FIRE]: '#FB923C',
      [KASINA_TYPES.EARTH]: '#A3E635',
      [KASINA_TYPES.AIR]: '#A78BFA',
      [KASINA_TYPES.SPACE]: '#C084FC',
      [KASINA_TYPES.LIGHT]: '#67E8F9',
      [KASINA_TYPES.WHITE_A_KASINA]: '#A78BFA',
      [KASINA_TYPES.WHITE_A_THIGLE]: '#67E8F9',
      [KASINA_TYPES.OM_KASINA]: '#FBBF24',
      [KASINA_TYPES.AH_KASINA]: '#F87171',
      [KASINA_TYPES.HUM_KASINA]: '#34D399',
      [KASINA_TYPES.RAINBOW_KASINA]: '#A78BFA',
    };
    return colors[kasina] || '#9CA3AF';
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
    if (!drillDownSeries || !sessions) return [];
    
    // Get all kasina types in the selected series
    let seriesKasinas: string[] = [];
    if (drillDownSeries === 'Color Kasinas') {
      seriesKasinas = KASINA_SERIES.COLOR;
    } else if (drillDownSeries === 'Elemental Kasinas') {
      seriesKasinas = KASINA_SERIES.ELEMENTAL;
    } else if (drillDownSeries === 'Vajrayana Kasinas') {
      seriesKasinas = KASINA_SERIES.VAJRAYANA;
    }

    // Filter sessions for this series only
    const filteredSessions = sessions.filter(s => 
      seriesKasinas.includes(s.kasinaType)
    );

    const kasinaData: { [kasina: string]: number } = {};
    filteredSessions.forEach(session => {
      kasinaData[session.kasinaType] = (kasinaData[session.kasinaType] || 0) + session.duration;
    });

    return Object.entries(kasinaData)
      .filter(([_, duration]) => duration > 0)
      .map(([kasina, duration]) => ({
        name: kasina,
        value: duration,
        displayName: KASINA_NAMES[kasina] || kasina,
        emoji: KASINA_EMOJIS[kasina] || '⚫',
        color: getKasinaColor(kasina)
      }));
  }, [drillDownSeries, sessions]);

  // Get color for kasina series - matching Practice Breakdown colors
  const getSeriesColor = (series: string) => {
    switch (series) {
      case 'Color Kasinas': return '#F59E0B'; // Amber
      case 'Elemental Kasinas': return '#10B981'; // Green
      case 'Vajrayana Kasinas': return '#EC4899'; // Pink
      default: return '#6B7280'; // Gray
    }
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

  // Get appropriate text color based on background brightness
  const getTextColor = (backgroundColor: string) => {
    // For bright colors like yellow and light cyan, use black text
    const brightColors = ['#FCD34D', '#FBBF24', '#F59E0B', '#FFFFCC', '#FFFF00', '#67E8F9', '#FDE047'];
    if (brightColors.includes(backgroundColor)) {
      return 'text-black';
    }
    return 'text-white';
  };

  // Custom tooltip for stacked bar - completely disabled to prevent grey hover background
  const StackedTooltip = ({ active, payload, label }: any) => {
    // Return null to disable tooltips on hover
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

  // Handle click for drill-down (both bar and legend)
  const handleSeriesClick = (series: string) => {
    // Check if this series has any data
    const seriesTotal = chartData.reduce((sum, modeData) => sum + (modeData[series] || 0), 0);
    if (seriesTotal > 0) {
      setDrillDownSeries(series);
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
        <div>
          <CardTitle className="text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {drillDownSeries || 'Practice Mode'}
          </CardTitle>
        </div>

      </CardHeader>
      <CardContent className="p-6">
        {drillDownSeries ? (
          // Drill-down pie chart view - matching Practice Breakdown structure
          <div className="flex flex-col items-center gap-6">
            
            {/* Back to Overview button */}
            <button
              onClick={() => setDrillDownSeries(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              ← Back to Overview
            </button>
            
            {/* Chart container - matching PracticeChart sizing exactly */}
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
              
              {/* Legend below chart - aligned height with fully opaque colors */}
              <div className="w-full flex flex-col">
                <div className="flex flex-wrap gap-3 justify-center items-center">
                  {drillDownData.map((item, index) => {
                    return (
                      <div 
                        key={index} 
                        className="flex items-center p-2 px-3 md:p-3 md:px-4 rounded-full border border-transparent hover:border-gray-600 transition-all h-12"
                        style={{ backgroundColor: item.color }}
                      >
                        <span className="mr-2 text-xl md:text-2xl">{item.emoji}</span>
                        <span className={`text-sm md:text-base font-medium ${getTextColor(item.color)}`}>
                          {item.displayName}
                        </span>
                        <span className={`ml-2 text-xs md:text-sm ${getTextColor(item.color)} opacity-90`}>
                          {formatTime(item.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
        ) : (
          // Main stacked bar chart view
          <div className="flex flex-col gap-6">
            <div className="text-center text-gray-400 text-sm">
              Click on a section to see detailed breakdown
            </div>
            
            {/* Reserved space for tooltip to prevent layout shift */}
            <div className="flex justify-center h-10">
              {hoveredSegment && (
                <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 shadow-lg">
                  <p className="text-white text-sm font-medium">
                    {hoveredSegment}
                  </p>
                </div>
              )}
            </div>
            
            {/* Chart container - adjusted to match pie chart height */}
            <div className="flex flex-col items-center gap-6">
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

                  
                  <Bar 
                    dataKey="Color Kasinas"
                    stackId="mode"
                    fill={getSeriesColor('Color Kasinas')}
                    radius={[0, 0, 0, 0]}
                    onClick={() => handleSeriesClick('Color Kasinas')}
                    style={{ cursor: 'pointer' }}
                    shape={(props: any) => <CustomBar {...props} dataKey="Color Kasinas" setHoveredSegment={setHoveredSegment} />}
                  />
                  <Bar 
                    dataKey="Elemental Kasinas"
                    stackId="mode"
                    fill={getSeriesColor('Elemental Kasinas')}
                    radius={[0, 0, 0, 0]}
                    onClick={() => handleSeriesClick('Elemental Kasinas')}
                    style={{ cursor: 'pointer' }}
                    shape={(props: any) => <CustomBar {...props} dataKey="Elemental Kasinas" setHoveredSegment={setHoveredSegment} />}
                  />
                  <Bar 
                    dataKey="Vajrayana Kasinas"
                    stackId="mode"
                    fill={getSeriesColor('Vajrayana Kasinas')}
                    radius={[4, 4, 0, 0]}
                    onClick={() => handleSeriesClick('Vajrayana Kasinas')}
                    style={{ cursor: 'pointer' }}
                    shape={(props: any) => <CustomBar {...props} dataKey="Vajrayana Kasinas" setHoveredSegment={setHoveredSegment} />}
                  />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend for stacked bars - aligned height with fully opaque colors */}
              <div className="flex flex-wrap gap-3 justify-center items-center">
              {['Color Kasinas', 'Elemental Kasinas', 'Vajrayana Kasinas'].map((series) => {
                const seriesColor = getSeriesColor(series);
                
                // Calculate total time for this series across all modes
                const seriesTotal = chartData.reduce((sum, modeData) => sum + (modeData[series] || 0), 0);
                const seriesEmoji = series === 'Color Kasinas' ? '🎨' : 
                                  series === 'Elemental Kasinas' ? '✨' : '💀';
                const seriesName = series.replace(' Kasinas', ''); // Remove "Kasinas"
                
                return (
                  <div 
                    key={series}
                    className="flex items-center p-2 px-3 md:p-3 md:px-4 rounded-full border border-transparent hover:border-gray-600 transition-all cursor-pointer h-12"
                    style={{ backgroundColor: seriesColor }}
                    onClick={() => handleSeriesClick(series)}
                  >
                    <span className="mr-2 text-xl md:text-2xl">{seriesEmoji}</span>
                    <span className={`text-sm md:text-base font-medium ${getTextColor(seriesColor)}`}>
                      {seriesName}
                    </span>
                    <span className={`ml-2 text-xs md:text-sm ${getTextColor(seriesColor)} opacity-90`}>
                      {formatTime(seriesTotal)}
                    </span>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PracticeModeChart;