import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useKasina } from "../lib/stores/useKasina";
import { KasinaSession, KasinaType } from "../lib/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { KASINA_EMOJIS, KASINA_NAMES, KASINA_SERIES } from "../lib/constants";
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
  // Get sessions from Kasina store
  const kasina = useKasina();
  const sessions = kasina.sessions || [];
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
      filtered = sessions.filter((session: KasinaSession) => new Date(session.date) >= oneWeekAgo);
    } else if (timeFilter === 'month') {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      filtered = sessions.filter((session: KasinaSession) => new Date(session.date) >= oneMonthAgo);
    } else {
      filtered = [...sessions];
    }
    
    setFilteredSessions(filtered);
  }, [sessions, timeFilter]);

  // Prepare pie chart data
  useEffect(() => {
    // Create separate arrays for each kasina type
    const colorSessions: KasinaSession[] = [];
    const elementalSessions: KasinaSession[] = [];
    const vajrayanaSessions: KasinaSession[] = [];
    
    // Categorize all sessions
    filteredSessions.forEach((session) => {
      if (!session.kasinaType) return;
      
      const kasinaType = String(session.kasinaType).toLowerCase();
      
      // Categorize Vajrayana sessions first
      if (kasinaType.includes('om')) {
        // Deep clone to avoid reference issues
        vajrayanaSessions.push({...session, kasinaType: 'om_kasina' as KasinaType});
      }
      else if (kasinaType.includes('ah')) {
        vajrayanaSessions.push({...session, kasinaType: 'ah_kasina' as KasinaType});
      }
      else if (kasinaType.includes('hum')) {
        vajrayanaSessions.push({...session, kasinaType: 'hum_kasina' as KasinaType});
      }
      else if (kasinaType.includes('clear') || kasinaType.includes('thigle')) {
        vajrayanaSessions.push({...session, kasinaType: 'clear_light_thigle' as KasinaType});
      }
      // Color kasinas
      else if (['white', 'blue', 'red', 'yellow', 'custom'].includes(kasinaType)) {
        colorSessions.push(session);
      }
      // Elemental kasinas
      else if (['water', 'air', 'fire', 'earth', 'space', 'light'].includes(kasinaType)) {
        elementalSessions.push(session);
      }
    });
    
    // Calculate total durations for each category
    let colorTotal = 0;
    let elementalTotal = 0;
    let vajrayanaTotal = 0;
    
    // Color data
    const colorData: ChartDataItem[] = [];
    KASINA_SERIES.COLOR.forEach(type => {
      const sessionsOfType = colorSessions.filter(s => s.kasinaType === type);
      const duration = sessionsOfType.reduce((sum, s) => sum + s.duration, 0);
      colorTotal += duration;
      
      if (duration > 0) {
        colorData.push({
          name: type,
          value: duration,
          emoji: KASINA_EMOJIS[type] || '⚪',
          displayName: KASINA_NAMES[type] || type,
          category: 'color'
        });
      }
    });
    
    // Elemental data
    const elementalData: ChartDataItem[] = [];
    KASINA_SERIES.ELEMENTAL.forEach(type => {
      const sessionsOfType = elementalSessions.filter(s => s.kasinaType === type);
      const duration = sessionsOfType.reduce((sum, s) => sum + s.duration, 0);
      elementalTotal += duration;
      
      if (duration > 0) {
        elementalData.push({
          name: type,
          value: duration,
          emoji: KASINA_EMOJIS[type] || '💧',
          displayName: KASINA_NAMES[type] || type,
          category: 'elemental'
        });
      }
    });
    
    // Vajrayana data - manually calculate for each type
    const vajrayanaData: ChartDataItem[] = [];
    
    // Calculate OM Kasina
    const omSessions = vajrayanaSessions.filter(s => s.kasinaType === 'om_kasina');
    const omDuration = omSessions.reduce((sum, s) => sum + s.duration, 0);
    vajrayanaTotal += omDuration;
    if (omDuration > 0) {
      vajrayanaData.push({
        name: 'om_kasina',
        value: omDuration,
        emoji: KASINA_EMOJIS['om_kasina'] || '🕉️',
        displayName: 'OM Kasina',
        category: 'vajrayana'
      });
    }
    
    // Calculate AH Kasina
    const ahSessions = vajrayanaSessions.filter(s => s.kasinaType === 'ah_kasina');
    const ahDuration = ahSessions.reduce((sum, s) => sum + s.duration, 0);
    vajrayanaTotal += ahDuration;
    if (ahDuration > 0) {
      vajrayanaData.push({
        name: 'ah_kasina',
        value: ahDuration,
        emoji: KASINA_EMOJIS['ah_kasina'] || '🔮',
        displayName: 'AH Kasina',
        category: 'vajrayana'
      });
    }
    
    // Calculate HUM Kasina
    const humSessions = vajrayanaSessions.filter(s => s.kasinaType === 'hum_kasina');
    const humDuration = humSessions.reduce((sum, s) => sum + s.duration, 0);
    vajrayanaTotal += humDuration;
    if (humDuration > 0) {
      vajrayanaData.push({
        name: 'hum_kasina',
        value: humDuration,
        emoji: KASINA_EMOJIS['hum_kasina'] || '🌀',
        displayName: 'HUM Kasina',
        category: 'vajrayana'
      });
    }
    
    // Calculate Clear Light Thigle
    const clearLightSessions = vajrayanaSessions.filter(s => s.kasinaType === 'clear_light_thigle');
    const clearLightDuration = clearLightSessions.reduce((sum, s) => sum + s.duration, 0);
    vajrayanaTotal += clearLightDuration;
    if (clearLightDuration > 0) {
      vajrayanaData.push({
        name: 'clear_light_thigle',
        value: clearLightDuration,
        emoji: KASINA_EMOJIS['clear_light_thigle'] || '🌈',
        displayName: 'Clear Light',
        category: 'vajrayana'
      });
    }
    
    // Logging for debugging
    console.log('Found OM sessions:', omSessions.length, 'with duration:', omDuration);
    console.log('Vajrayana data:', vajrayanaData);
    
    // Create overview data
    const overviewData: ChartDataItem[] = [];
    
    if (colorTotal > 0) {
      overviewData.push({
        name: 'color',
        value: colorTotal,
        emoji: '🎨',
        displayName: 'Color'
      });
    }
    
    if (elementalTotal > 0) {
      overviewData.push({
        name: 'elemental',
        value: elementalTotal,
        emoji: '🌍',
        displayName: 'Elemental'
      });
    }
    
    if (vajrayanaTotal > 0) {
      overviewData.push({
        name: 'vajrayana',
        value: vajrayanaTotal,
        emoji: '☸️',
        displayName: 'Vajrayana'
      });
    }
    
    const totalSessionsTime = colorTotal + elementalTotal + vajrayanaTotal;
    
    // Update the state
    setTotalTime(totalSessionsTime);
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

  // Format date for display
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const month = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${month} ${day}, ${year}, ${displayHours}:${minutes} ${ampm}`;
  };
  
  // Custom active shape for the pie chart
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    
    return (
      <g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#e4e4e7" fontSize={18}>
          {payload.emoji}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#e4e4e7" fontSize={14}>
          {payload.displayName}
        </text>
        <text x={cx} y={cy + 30} textAnchor="middle" fill="#e4e4e7" fontSize={12} fontWeight="bold">
          {formatTime(payload.value)}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
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
  };
  
  // State to track active index in the pie chart
  const [activeIndex, setActiveIndex] = useState(0);
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                {chartMode === 'overview' ? 'Practice Overview' : 
                 chartMode === 'color' ? 'Color Kasinas' :
                 chartMode === 'elemental' ? 'Elemental Kasinas' : 'Vajrayana Kasinas'}
              </CardTitle>
              <CardDescription>
                {chartMode === 'overview' 
                  ? 'Overview of all sessions' 
                  : `Click segments for details or select to overview`}
              </CardDescription>
            </div>
            {chartMode !== 'overview' && (
              <Button size="sm" variant="outline" onClick={() => setChartMode('overview')}>
                Back to Overview
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex">
            <div className="flex-1">
              <div className="h-[200px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onClick={(data) => {
                          if (chartMode === 'overview' && data.name) {
                            setChartMode(data.name as ChartMode);
                          }
                        }}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">No data for selected period</p>
                  </div>
                )}
              </div>
            </div>
            <div className="ml-4 flex-1">
              <div className="text-center mb-2">
                <h3 className="text-lg font-medium text-gray-300">Total Meditation Time</h3>
                <p className="text-3xl font-bold">{formatTime(totalTime)}</p>
                <p className="text-sm text-gray-400">
                  {chartMode === 'overview' 
                    ? 'Overview of all sessions' 
                    : `Viewing ${chartMode} Kasinas`}
                </p>
              </div>
              
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {allChartData.overview.map(category => (
                  <Button
                    key={category.name}
                    size="sm"
                    variant={chartMode === category.name ? "default" : "outline"}
                    onClick={() => setChartMode(category.name as ChartMode)}
                    className="flex items-center space-x-1"
                  >
                    <span>{category.emoji}</span>
                    <span>{category.displayName}</span>
                    <span className="ml-1 text-xs">{formatTime(category.value)}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Select 
              value={timeFilter} 
              onValueChange={(value) => setTimeFilter(value as 'week' | 'month' | 'all')}
            >
              <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center">
            <span className="mr-2">📝</span>
            Practice Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No practice sessions recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium text-gray-300">Date</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-300">Kasina</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-300">Duration</th>
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