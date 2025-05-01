import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { useKasina } from "../lib/stores/useKasina";
import { KASINA_NAMES, KASINA_COLORS, KASINA_EMOJIS } from "../lib/constants";
import { Button } from './ui/button';

// Define chart data types and categories
type ChartMode = 'overview' | 'color' | 'elemental';
type ChartDataItem = {
  name: string;
  value: number;
  emoji: string;
  displayName: string;
  color: string;
  category?: 'color' | 'elemental';
  kasinaType?: string;
};

interface PracticeChartProps {
  sessions: {
    id: string;
    kasinaType: string;
    kasinaName: string;
    duration: number;
    timestamp: string;
  }[];
}

// Component for the active segment in the chart
const ActiveShape = (props: any) => {
  const { 
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, 
    fill, payload, percent, value 
  } = props;
  
  // Format time for display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <g>
      {/* Background circle for the emoji */}
      <circle 
        cx={cx} 
        cy={cy} 
        r={innerRadius - 5} 
        fill="#111827" 
      />
      
      {/* Display emoji in the center */}
      <text 
        x={cx} 
        y={cy} 
        textAnchor="middle" 
        dominantBaseline="central"
        fill="#fff" 
        fontSize={innerRadius * 0.8}
      >
        {payload.emoji}
      </text>
      
      {/* Enhanced sectors with glow effect */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius - 3}
        outerRadius={innerRadius - 1}
        fill={fill}
      />
    </g>
  );
};

const PracticeChart: React.FC<PracticeChartProps> = ({ sessions }) => {
  // State for tracking active section and chart mode
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>('overview');

  // Calculate total time spent for all sessions
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

  // Process chart data based on current view mode
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    // Group the kasina types into "color" and "elemental" categories
    const colorKasinas = ['white', 'blue', 'red', 'yellow'];
    const elementalKasinas = ['water', 'air', 'fire', 'earth', 'space', 'light'];
    
    // Prepare data based on current mode
    if (chartMode === 'overview') {
      // Create overview data (Color vs Elemental)
      const colorTotal = sessions
        .filter(s => colorKasinas.includes(s.kasinaType))
        .reduce((sum, s) => sum + s.duration, 0);
        
      const elementalTotal = sessions
        .filter(s => elementalKasinas.includes(s.kasinaType))
        .reduce((sum, s) => sum + s.duration, 0);
        
      return [
        {
          name: 'color',
          value: colorTotal,
          emoji: '🎨',
          displayName: 'Color Kasinas',
          color: '#6366f1',
          category: 'color' as const
        },
        {
          name: 'elemental',
          value: elementalTotal,
          emoji: '✨',
          displayName: 'Elemental Kasinas',
          color: '#3b82f6',
          category: 'elemental' as const
        }
      ].filter(item => item.value > 0);
      
    } else if (chartMode === 'color') {
      // Show detailed breakdown of color kasinas
      return colorKasinas
        .map(type => {
          const totalTime = sessions
            .filter(s => s.kasinaType === type)
            .reduce((sum, s) => sum + s.duration, 0);
            
          return {
            name: type,
            kasinaType: type,
            value: totalTime,
            emoji: KASINA_EMOJIS[type] || '⚪',
            displayName: KASINA_NAMES[type] || type,
            color: KASINA_COLORS[type] || '#ffffff'
          };
        })
        .filter(item => item.value > 0);
        
    } else if (chartMode === 'elemental') {
      // Show detailed breakdown of elemental kasinas
      return elementalKasinas
        .map(type => {
          const totalTime = sessions
            .filter(s => s.kasinaType === type)
            .reduce((sum, s) => sum + s.duration, 0);
            
          return {
            name: type,
            kasinaType: type,
            value: totalTime,
            emoji: KASINA_EMOJIS[type] || '✨',
            displayName: KASINA_NAMES[type] || type,
            color: KASINA_COLORS[type] || '#ffffff'
          };
        })
        .filter(item => item.value > 0);
    }
    
    return [];
  }, [sessions, chartMode]);

  // Track if we should show tooltips
  const [showTooltips, setShowTooltips] = useState(true);
  
  // Handle pie sector click
  const handlePieClick = (data: any, index: number) => {
    if (chartMode === 'overview') {
      // When in overview mode, clicking navigates to detailed view
      const category = data.category;
      
      // Temporarily disable tooltips during transition
      setShowTooltips(false);
      setChartMode(category as ChartMode);
      setActiveIndex(null);
      
      // Re-enable tooltips after a short delay
      setTimeout(() => {
        setShowTooltips(true);
      }, 500);
    } else {
      // In detailed view, clicking toggles the active section
      setActiveIndex(activeIndex === index ? null : index);
    }
  };
  
  // Calculate total time for the current category view
  const currentViewTotalTime = useMemo(() => {
    if (chartMode === 'overview') {
      return totalTimeInSeconds;
    } 
    
    // For color or elemental view, sum up the time from the current chart data
    return chartData.reduce((total, item) => total + item.value, 0);
  }, [chartMode, chartData, totalTimeInSeconds]);

  // Return to overview mode
  const handleBackToOverview = () => {
    // Temporarily disable tooltips during transition
    setShowTooltips(false);
    setChartMode('overview');
    setActiveIndex(null);
    
    // Re-enable tooltips after a short delay
    setTimeout(() => {
      setShowTooltips(true);
    }, 500);
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 p-3 rounded shadow text-white border border-gray-700">
          <p className="font-semibold">
            {data.emoji} {data.displayName}
          </p>
          <p className="text-sm">{formatTime(data.value)}</p>
          <p className="text-xs text-gray-400">
            {Math.round((data.value / currentViewTotalTime) * 100)}% of total
          </p>
          {chartMode === 'overview' && (
            <p className="text-xs text-blue-300 mt-2">Click to see details</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Empty state
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">
            {chartMode === 'overview' 
              ? 'Practice Overview' 
              : chartMode === 'color' 
                ? 'Color Kasinas' 
                : 'Elemental Kasinas'}
          </CardTitle>
          {chartMode !== 'overview' && (
            <CardDescription className="text-gray-400">
              Click segments for details or return to overview
            </CardDescription>
          )}
        </div>
        {chartMode !== 'overview' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToOverview}
            className="text-sm bg-gray-800 hover:bg-gray-700 border-gray-600"
          >
            Back to Overview
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {/* Improved responsive layout for better desktop experience */}
        <div className="flex flex-col lg:flex-row gap-6 justify-center items-center">
          {/* Chart container - larger on desktop */}
          <div className="w-full lg:w-1/2 h-80 lg:h-[450px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={activeIndex !== null ? 120 : 110}
                  innerRadius={chartMode === 'overview' ? 50 : 60}
                  dataKey="value"
                  labelLine={false}
                  activeIndex={activeIndex !== null ? activeIndex : undefined}
                  activeShape={(props: any) => <ActiveShape {...props} totalValue={currentViewTotalTime} />}
                  onClick={handlePieClick}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      style={{filter: activeIndex === index ? "brightness(1.2)" : "none"}}
                      className="hover:opacity-90 transition-opacity"
                    />
                  ))}
                </Pie>
                
                {showTooltips && <Tooltip content={<CustomTooltip />} />}
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Statistics and legend - more space on desktop */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-6">
            <div className="text-center lg:text-left">
              <h3 className="text-lg md:text-xl text-gray-400">Total Meditation Time</h3>
              <p className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mt-1">
                {formatTime(currentViewTotalTime)}
              </p>
              <p className="text-sm md:text-base text-gray-500 mt-1">
                {chartMode !== 'overview' 
                  ? `Viewing ${chartMode === 'color' ? 'Color' : 'Elemental'} Kasinas` 
                  : 'Overview of all sessions'}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4 justify-center lg:justify-start">
              {chartData.map((entry, i) => {
                const isActive = activeIndex !== null && chartData[activeIndex]?.name === entry.name;
                return (
                  <div 
                    key={entry.name} 
                    className={`flex items-center p-2 px-3 md:p-3 md:px-4 rounded-full transition-all
                      ${isActive
                        ? 'bg-gray-700 border border-gray-500 shadow-lg scale-110' 
                        : 'bg-gray-800 hover:bg-gray-700 border border-transparent'}`}
                    onClick={() => {
                      const index = chartData.findIndex(item => item.name === entry.name);
                      setActiveIndex(activeIndex === index ? null : index);
                    }}
                    style={{
                      cursor: 'pointer',
                      boxShadow: isActive ? `0 0 8px ${entry.color}40` : 'none'
                    }}
                  >
                    <span className="mr-2 text-xl md:text-2xl">{entry.emoji}</span>
                    <span className={`text-sm md:text-base ${isActive ? 'text-white font-medium' : 'text-gray-300'}`}>
                      {entry.displayName}
                    </span>
                    <span className={`ml-2 text-xs md:text-sm ${isActive ? 'text-gray-200' : 'text-gray-400'}`}>
                      {formatTime(entry.value)}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {chartMode === 'overview' && (
              <p className="text-center lg:text-left text-xs text-blue-300 mt-2">
                Click on a section to see detailed breakdown
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PracticeChart;
