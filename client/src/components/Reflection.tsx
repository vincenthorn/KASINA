import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useKasina } from "../lib/stores/useKasina";
import { getKasinaEmoji, KasinaSession, KasinaType } from "../lib/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { KASINA_EMOJIS, KASINA_NAMES } from "../lib/constants";
import { Button } from './ui/button';

// Define our types for chart organization
type ChartMode = 'overview' | 'color' | 'elemental' | 'vajrayana';
type ChartDataItem = {
  name: string;
  value: number;
  emoji: string;
  displayName: string;
  category?: 'color' | 'elemental' | 'vajrayana';
};

const Reflection = () => {
  const { sessions } = useKasina();
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('all');
  const [filteredSessions, setFilteredSessions] = useState<KasinaSession[]>([]);
  const [pieData, setPieData] = useState<ChartDataItem[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [chartMode, setChartMode] = useState<ChartMode>('overview');
  
  // Store all data categories for easy switching
  const [allChartData, setAllChartData] = useState<{
    overview: ChartDataItem[];
    color: ChartDataItem[];
    elemental: ChartDataItem[];
    vajrayana: ChartDataItem[];
  }>({
    overview: [],
    color: [],
    elemental: [],
    vajrayana: []
  });

  // Filter sessions based on selected time range
  useEffect(() => {
    const now = new Date();
    let filtered: KasinaSession[];
    
    if (timeFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = sessions.filter(session => new Date(session.date) >= oneWeekAgo);
    } else if (timeFilter === 'month') {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      filtered = sessions.filter(session => new Date(session.date) >= oneMonthAgo);
    } else {
      filtered = [...sessions];
    }
    
    setFilteredSessions(filtered);
  }, [sessions, timeFilter]);

  // Prepare pie chart data
  useEffect(() => {
    const kasinaTypes: KasinaType[] = [
      'white', 'blue', 'red', 'yellow', 
      'water', 'air', 'fire', 'earth', 'space', 'light',
      'clear_light_thigle', 'om_kasina', 'ah_kasina', 'hum_kasina'
    ];
    
    // Define which kasinas belong to which category
    const colorKasinas: KasinaType[] = ['white', 'blue', 'red', 'yellow'];
    const elementalKasinas: KasinaType[] = ['water', 'air', 'fire', 'earth', 'space', 'light'];
    const vajrayanaKasinas: KasinaType[] = ['clear_light_thigle', 'om_kasina', 'ah_kasina', 'hum_kasina'];
    
    // Sum duration by kasina type
    const durationByType = kasinaTypes.reduce((acc, type) => {
      acc[type] = filteredSessions
        .filter(session => session.kasinaType === type)
        .reduce((sum, session) => sum + session.duration, 0);
      return acc;
    }, {} as Record<KasinaType, number>);
    
    // Create detailed pie chart data with category flags
    const detailedChartData = Object.entries(durationByType)
      .filter(([_, duration]) => duration > 0)
      .map(([type, duration]) => {
        const isColorKasina = colorKasinas.includes(type as KasinaType);
        const isElementalKasina = elementalKasinas.includes(type as KasinaType);
        const isVajrayanaKasina = vajrayanaKasinas.includes(type as KasinaType);
        
        return {
          name: type,
          value: duration,
          emoji: KASINA_EMOJIS[type] || '🧿',
          displayName: KASINA_NAMES[type] || type.charAt(0).toUpperCase() + type.slice(1),
          category: isColorKasina ? 'color' as const : 
                   isElementalKasina ? 'elemental' as const : 
                   isVajrayanaKasina ? 'vajrayana' as const : 'elemental' as const
        };
      });
    
    // Calculate total time for all sessions
    const totalDuration = detailedChartData.reduce((sum, item) => sum + item.value, 0);
    setTotalTime(totalDuration);
    
    // Create color kasinas summary
    const colorTotal = detailedChartData
      .filter(item => item.category === 'color')
      .reduce((sum, item) => sum + item.value, 0);
      
    // Create elemental kasinas summary
    const elementalTotal = detailedChartData
      .filter(item => item.category === 'elemental')
      .reduce((sum, item) => sum + item.value, 0);
      
    // Calculate vajrayana total
    const vajrayanaTotal = detailedChartData
      .filter(item => item.category === 'vajrayana')
      .reduce((sum, item) => sum + item.value, 0);
    
    // Create overview data (color vs elemental vs vajrayana)
    const overviewData: ChartDataItem[] = [
      {
        name: 'color',
        value: colorTotal,
        emoji: '🎨',
        displayName: 'Color'
      },
      {
        name: 'elemental',
        value: elementalTotal,
        emoji: '✨',
        displayName: 'Elemental'
      },
      {
        name: 'vajrayana',
        value: vajrayanaTotal,
        emoji: '🕉️',
        displayName: 'Vajrayana'
      }
    ].filter(item => item.value > 0);
    
    // Filter to only get color, elemental, or vajrayana kasinas
    const colorData = detailedChartData.filter(item => item.category === 'color');
    const elementalData = detailedChartData.filter(item => item.category === 'elemental');
    const vajrayanaData = detailedChartData.filter(item => item.category === 'vajrayana');
    
    // Store all data sets
    setAllChartData({
      overview: overviewData,
      color: colorData,
      elemental: elementalData,
      vajrayana: vajrayanaData
    });
    
    // Set the current view based on chartMode
    if (chartMode === 'overview') {
      setPieData(overviewData);
    } else if (chartMode === 'color') {
      setPieData(colorData);
    } else if (chartMode === 'elemental') {
      setPieData(elementalData);
    } else if (chartMode === 'vajrayana') {
      setPieData(vajrayanaData);
    }
    
  }, [filteredSessions, chartMode]);

  // Colors for pie chart
  const COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
    '#9966FF', '#FF9F40', '#2ECC71', '#E74C3C', 
    '#3498DB', '#F1C40F'
  ];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-indigo-600/20 rounded-full flex items-center justify-center mr-4 shadow-lg shadow-indigo-900/20">
            <span className="text-2xl">🧘</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">Reflection</h1>
            <p className="text-gray-400">
              Analyze your meditation patterns and progress
            </p>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Select value={timeFilter} onValueChange={(value: 'week' | 'month' | 'all') => setTimeFilter(value)}>
            <SelectTrigger className="w-36 bg-gray-800 border-gray-700">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-800 text-white border-gray-700 col-span-3 md:col-span-1">
          <CardHeader>
            <CardTitle>Total Meditation Time</CardTitle>
            <CardDescription className="text-gray-300">
              {timeFilter === 'week' 
                ? 'This week' 
                : timeFilter === 'month' 
                  ? 'This month' 
                  : 'All time'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatTime(totalTime)}</div>
            <div className="text-sm text-gray-400 mt-1">
              {filteredSessions.length} {filteredSessions.length === 1 ? 'session' : 'sessions'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 text-white border-gray-700 col-span-3 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Practice Distribution</CardTitle>
              <CardDescription className="text-gray-300">
                {chartMode === 'overview' ? 'Color, Elemental & Vajrayana Kasinas' : 
                  chartMode === 'color' ? 'Color Kasinas Breakdown' : 
                  chartMode === 'elemental' ? 'Elemental Kasinas Breakdown' : 
                  'Vajrayana Kasinas Breakdown'}
              </CardDescription>
            </div>
            {chartMode !== 'overview' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setChartMode('overview')}
                className="bg-gray-700 hover:bg-gray-600 border-gray-600"
              >
                ← Back to Overview
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {pieData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data available for the selected time period
              </div>
            ) : (
              <div className="h-[300px] relative">
                {chartMode === 'overview' && pieData.length > 0 && (
                  <div className="absolute top-0 left-0 right-0 text-center text-gray-400 text-sm z-10 py-2 px-4 bg-gray-800/60 rounded-md backdrop-blur-sm">
                    <span className="inline-flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Click on a section to see detailed breakdown
                    </span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      dataKey="value"
                      labelLine={false}
                      label={({ emoji, percent }) => `${emoji} ${(percent * 100).toFixed(0)}%`}
                      onClick={(data) => {
                        // Only enable click in overview mode
                        if (chartMode === 'overview') {
                          if (data.name === 'color') {
                            setChartMode('color');
                          } else if (data.name === 'elemental') {
                            setChartMode('elemental');
                          } else if (data.name === 'vajrayana') {
                            setChartMode('vajrayana');
                          }
                        }
                      }}
                      activeShape={(props) => {
                        const RADIAN = Math.PI / 180;
                        const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
                        const sin = Math.sin(-RADIAN * midAngle);
                        const cos = Math.cos(-RADIAN * midAngle);
                        const sx = cx + (outerRadius + 10) * cos;
                        const sy = cy + (outerRadius + 10) * sin;
                        const mx = cx + (outerRadius + 30) * cos;
                        const my = cy + (outerRadius + 30) * sin;
                        const ex = mx + (cos >= 0 ? 1 : -1) * 22;
                        const ey = my;
                        const textAnchor = cos >= 0 ? 'start' : 'end';
                  
                        return (
                          <g>
                            <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#fff" fontSize={14}>
                              {payload.emoji}
                            </text>
                            <Sector
                              cx={cx}
                              cy={cy}
                              innerRadius={innerRadius}
                              outerRadius={outerRadius}
                              startAngle={startAngle}
                              endAngle={endAngle}
                              fill={fill}
                              opacity={0.8}
                            />
                            <Sector
                              cx={cx}
                              cy={cy}
                              startAngle={startAngle}
                              endAngle={endAngle}
                              innerRadius={outerRadius + 6}
                              outerRadius={outerRadius + 10}
                              fill={fill}
                            />
                          </g>
                        );
                      }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          style={{ cursor: chartMode === 'overview' ? 'pointer' : 'default' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatTime(value), 'Duration']}
                      labelFormatter={(name, entry) => {
                        const dataEntry = pieData.find(item => item.name === name);
                        if (!dataEntry) return name;
                        
                        return chartMode === 'overview' 
                          ? `${dataEntry.emoji} ${dataEntry.displayName} Kasinas${chartMode === 'overview' ? ' (Click to expand)' : ''}`
                          : `${dataEntry.emoji} ${dataEntry.displayName} Kasina`;
                      }}
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        borderColor: '#4B5563',
                        borderRadius: '0.375rem',
                        padding: '0.75rem',
                        color: 'white'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Custom legend */}
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {pieData.map((entry, index) => (
                    <div 
                      key={`legend-${index}`} 
                      className={`flex items-center px-3 py-1.5 rounded-full text-sm 
                        ${chartMode === 'overview' ? 'cursor-pointer' : 'cursor-default'} 
                        transition-all duration-200 hover:scale-105`}
                      style={{ 
                        backgroundColor: `${COLORS[index % COLORS.length]}30`, 
                        border: `1px solid ${COLORS[index % COLORS.length]}80` 
                      }}
                      onClick={() => {
                        if (chartMode === 'overview') {
                          if (entry.name === 'color') {
                            setChartMode('color');
                          } else if (entry.name === 'elemental') {
                            setChartMode('elemental');
                          } else if (entry.name === 'vajrayana') {
                            setChartMode('vajrayana');
                          }
                        }
                      }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="mr-1">{entry.emoji}</span>
                      <span>{entry.displayName}</span>
                      <span className="ml-2 text-gray-300 font-mono">{formatTime(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-gray-800 text-white border-gray-700">
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription className="text-gray-300">
            Log of your meditation sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No sessions recorded in this time period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Kasina</th>
                    <th className="text-left py-3 px-4">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((session, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="py-3 px-4">{formatDate(session.date)}</td>
                        <td className="py-3 px-4">
                          <span className="mr-2">{KASINA_EMOJIS[session.kasinaType] || '🧿'}</span>
                          {session.kasinaType === 'clear_light_thigle' 
                            ? 'Clear Light Kasina'
                            : KASINA_NAMES[session.kasinaType] || session.kasinaType.charAt(0).toUpperCase() + session.kasinaType.slice(1).replace(/_/g, ' ') + ' Kasina'
                          }
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 bg-indigo-600/30 text-indigo-200 rounded-full text-sm font-medium">
                            {formatTime(session.duration)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reflection;
