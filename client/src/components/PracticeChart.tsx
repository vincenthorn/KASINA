import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { useKasina } from "../lib/stores/useKasina";
import { KASINA_NAMES, KASINA_COLORS, KASINA_EMOJIS } from "../lib/constants";
import { Button } from './ui/button';

// Define chart data types and categories
type ChartMode = 'overview' | 'color' | 'elemental' | 'vajrayana';
type ChartDataItem = {
  name: string;
  value: number;
  emoji: string;
  displayName: string;
  color: string;
  category?: 'color' | 'elemental' | 'vajrayana';
  kasinaType?: string;
};

interface PracticeChartProps {
  sessions: {
    id: string;
    kasinaType: string;
    kasinaName: string;
    duration: number;
    timestamp: string;
    kasinaBreakdown?: Array<{
      kasina_type: string;
      duration_seconds: number;
    }>;
  }[];
  selectedKasinaType: string | null;
  onSelectKasinaType: (kasinaType: string | null) => void;
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

const PracticeChart: React.FC<PracticeChartProps> = ({ 
  sessions, 
  selectedKasinaType, 
  onSelectKasinaType 
}) => {
  // State for tracking active section and chart mode
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>('overview');

  // Notify parent component when chart mode changes
  useEffect(() => {
    // Update the parent component with chart mode changes
    // We do this by selecting a special category marker that the ReflectionPage can use
    if (chartMode === 'overview') {
      onSelectKasinaType(null); // Clear selected kasina type in overview mode
    } else if (chartMode === 'color') {
      onSelectKasinaType('category:color');
    } else if (chartMode === 'elemental') {
      onSelectKasinaType('category:elemental');
    } else if (chartMode === 'vajrayana') {
      onSelectKasinaType('category:vajrayana');
    }
  }, [chartMode, onSelectKasinaType]);

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

  // Helper function to round time (round up to nearest minute if > 30 seconds)
  const roundTime = (seconds: number): number => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds > 30) {
      return (minutes + 1) * 60;
    }
    return minutes * 60;
  };

  // Helper function to get kasina time totals from breakdown data
  const getKasinaTimeFromBreakdowns = (sessions: any[], kasinaType: string): number => {
    let totalTime = 0;
    
    sessions.forEach(session => {
      if (session.kasinaBreakdown && Array.isArray(session.kasinaBreakdown)) {
        session.kasinaBreakdown.forEach((breakdown: any) => {
          if (breakdown.kasina_type === kasinaType) {
            totalTime += breakdown.duration_seconds;
          }
        });
      }
    });
    
    return totalTime;
  };

  // Process chart data based on current view mode
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    // Group the kasina types into three kasina sets (practiced in either Visual or Breath mode)
    const colorKasinas = ['white', 'blue', 'red', 'yellow', 'custom'];
    const elementalKasinas = ['water', 'air', 'fire', 'earth', 'space', 'light'];
    const vajrayanaKasinas = ['clear_light_thigle', 'om_kasina', 'ah_kasina', 'hum_kasina', 'white_a_kasina', 'rainbow_kasina'];
    
    // Prepare data based on current mode
    if (chartMode === 'overview') {
      // Create overview data (Color vs Elemental vs Vajrayana - all kasina sets)
      // Sum up time from breakdown data for each category
      const colorTotal = colorKasinas.reduce((sum, kasinaType) => 
        sum + getKasinaTimeFromBreakdowns(sessions, kasinaType), 0);
        
      const elementalTotal = elementalKasinas.reduce((sum, kasinaType) => 
        sum + getKasinaTimeFromBreakdowns(sessions, kasinaType), 0);
      
      const vajrayanaTotal = vajrayanaKasinas.reduce((sum, kasinaType) => 
        sum + getKasinaTimeFromBreakdowns(sessions, kasinaType), 0);
        
      return [
        {
          name: 'color',
          value: colorTotal,
          emoji: '🎨',
          displayName: 'Color Kasinas',
          color: '#F59E0B',
          category: 'color' as const
        },
        {
          name: 'elemental',
          value: elementalTotal,
          emoji: '✨',
          displayName: 'Elemental Kasinas',
          color: '#10B981',
          category: 'elemental' as const
        },
        {
          name: 'vajrayana',
          value: vajrayanaTotal,
          emoji: '💀',
          displayName: 'Vajrayana Kasinas',
          color: '#EC4899',
          category: 'vajrayana' as const
        }
      ].filter(item => item.value > 0);
      
    } else if (chartMode === 'color') {
      // Show detailed breakdown of color kasinas using breakdown data
      return colorKasinas
        .map(type => {
          const totalTime = getKasinaTimeFromBreakdowns(sessions, type);
          const roundedTime = roundTime(totalTime);
            
          return {
            name: type,
            kasinaType: type,
            value: roundedTime,
            emoji: KASINA_EMOJIS[type] || '⚪',
            displayName: KASINA_NAMES[type] || type,
            color: KASINA_COLORS[type] || '#ffffff'
          };
        })
        .filter(item => item.value > 0);
        
    } else if (chartMode === 'elemental') {
      // Show detailed breakdown of elemental kasinas using breakdown data
      return elementalKasinas
        .map(type => {
          const totalTime = getKasinaTimeFromBreakdowns(sessions, type);
          const roundedTime = roundTime(totalTime);
            
          return {
            name: type,
            kasinaType: type,
            value: roundedTime,
            emoji: KASINA_EMOJIS[type] || '✨',
            displayName: KASINA_NAMES[type] || type,
            color: KASINA_COLORS[type] || '#ffffff'
          };
        })
        .filter(item => item.value > 0);
    } else if (chartMode === 'vajrayana') {
      // Show detailed breakdown of Vajrayana kasinas using breakdown data
      return vajrayanaKasinas
        .map(type => {
          const totalTime = getKasinaTimeFromBreakdowns(sessions, type);
          const roundedTime = roundTime(totalTime);
            
          return {
            name: type,
            kasinaType: type,
            value: roundedTime,
            emoji: KASINA_EMOJIS[type] || '💀',
            displayName: KASINA_NAMES[type] || type,
            color: KASINA_COLORS[type] || '#8855ff'
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
      
      // Clear any selected kasina type when switching views
      onSelectKasinaType(null);
      
      // Re-enable tooltips after a short delay
      setTimeout(() => {
        setShowTooltips(true);
      }, 500);
    } else {
      // In detailed view, clicking toggles the active section
      const newActiveIndex = activeIndex === index ? null : index;
      setActiveIndex(newActiveIndex);
      
      // Update selected kasina type for highlighting in practice log
      if (newActiveIndex !== null && data.kasinaType) {
        onSelectKasinaType(data.kasinaType);
      } else {
        onSelectKasinaType(null);
      }
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
    
    // Clear any selected kasina type
    onSelectKasinaType(null);
    
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
      <Card className="bg-gray-900 border-gray-700 shadow-xl">
        <CardHeader className="border-b border-gray-700 pb-4">
          <CardTitle className="text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Kasina Breakdown
          </CardTitle>
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
    <Card className="bg-gray-900 border-gray-700 shadow-xl">
      <CardHeader className="border-b border-gray-700 pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            {chartMode === 'overview' 
              ? 'Kasina Breakdown' 
              : chartMode === 'color' 
                ? 'Color Kasinas' 
                : chartMode === 'elemental'
                  ? 'Elemental Kasinas'
                  : 'Vajrayana Kasinas'}
          </CardTitle>

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
        {/* Improved layout with chart above and legend below */}
        <div className="flex flex-col items-center gap-6">
          {/* Chart container */}
          <div className="w-80 h-80">
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
          
          {/* Legend below chart */}
          <div className="w-full flex flex-col space-y-3">
            <div className="flex flex-wrap gap-3 justify-center">
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
                      // Handle click based on the current mode and data
                      if (chartMode === 'overview') {
                        // In overview mode, clicking should navigate to the detailed category view
                        // First check if this entry refers to a category (color, elemental, vajrayana)
                        if (entry.name === 'color' || entry.name === 'elemental' || entry.name === 'vajrayana') {
                          // Temporarily disable tooltips during transition
                          setShowTooltips(false);
                          // Switch to the detailed view for this category
                          setChartMode(entry.name as ChartMode);
                          // Reset active index for the new view
                          setActiveIndex(null);
                          // Clear any selected kasina type when switching views
                          onSelectKasinaType(null);
                          // Re-enable tooltips after a short delay
                          setTimeout(() => {
                            setShowTooltips(true);
                          }, 500);
                          return;
                        }
                      } else {
                        // In detailed view, clicking should highlight the specific kasina type
                        const index = chartData.findIndex(item => item.name === entry.name);
                        const newActiveIndex = activeIndex === index ? null : index;
                        setActiveIndex(newActiveIndex);
                        
                        if (newActiveIndex !== null) {
                          // If we're selecting an item, find the kasinaType if it exists
                          const selectedItem = chartData[newActiveIndex];
                          
                          // For highlighting, we'll create a compound selection that includes both
                          // the category and the specific kasina type
                          const specificKasinaType = selectedItem?.name || null;
                          
                          // Create a compound selection string that maintains category context
                          // "category:color+white" means "show color kasinas and highlight white"
                          const compoundSelection = `category:${chartMode}+${specificKasinaType}`;
                          
                          onSelectKasinaType(compoundSelection);
                        } else {
                          // When deselecting, keep showing only the current category
                          onSelectKasinaType(`category:${chartMode}`);
                        }
                      }
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
              <p className="text-center text-xs text-blue-300 mt-2">
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
