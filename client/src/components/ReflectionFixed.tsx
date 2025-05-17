import React, { useEffect, useState } from 'react';
import { KasinaSession } from '@/lib/types';
import PracticeChart from './PracticeChart';
import PracticeLog from './PracticeLog';
import { Button } from './ui/button';
import { KASINA_EMOJIS, KASINA_NAMES } from '@/lib/constants';

// Chart data type definitions
type ChartMode = 'overview' | 'color' | 'elemental' | 'vajrayana';
type ChartDataItem = {
  name: string;
  value: number;
  emoji: string;
  displayName: string;
  category?: 'color' | 'elemental' | 'vajrayana';
};

const ReflectionFixed: React.FC = () => {
  const [sessions, setSessions] = useState<KasinaSession[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>('overview');
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [totalTime, setTotalTime] = useState(0);
  const [vajrayanaTime, setVajrayanaTime] = useState(0);
  const [colorTime, setColorTime] = useState(0);
  const [elementalTime, setElementalTime] = useState(0);

  // Fetch sessions from the API
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions');
        if (!response.ok) throw new Error('Failed to fetch sessions');
        const data = await response.json();
        setSessions(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Process data for charts when sessions or timeRange changes
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  
  useEffect(() => {
    if (sessions.length === 0) return;

    // Filter sessions based on time range
    let filteredSessions = [...sessions];
    console.log("All sessions:", filteredSessions.length);
    
    const now = new Date();
    if (timeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredSessions = sessions.filter((session: KasinaSession) => new Date(session.timestamp) >= oneWeekAgo);
      console.log("Week sessions:", filteredSessions.length);
    } else if (timeRange === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredSessions = sessions.filter((session: KasinaSession) => new Date(session.timestamp) >= oneMonthAgo);
      console.log("Month sessions:", filteredSessions.length);
    }

    // Create arrays for different session types
    const colorSessions: KasinaSession[] = [];
    const elementalSessions: KasinaSession[] = [];
    const vajrayanaSessions: KasinaSession[] = [];
    
    // Clear and log every session for debugging
    console.log("PROCESSING SESSIONS:", JSON.stringify(filteredSessions));

    filteredSessions.forEach(session => {
      // Skip sessions without kasinaType
      if (!session.kasinaType) return;
      
      // Normalize type for consistent handling
      const type = String(session.kasinaType).toLowerCase();
      console.log(`Processing session: ${session.id}, type: ${type}`);
      
      // EXPLICIT Vajrayana mapping
      if (type === 'om_kasina' || type.includes('om')) {
        console.log(`Found OM Kasina: ${session.id}`);
        vajrayanaSessions.push(session);
      }
      else if (type === 'ah_kasina' || type.includes('ah')) {
        console.log(`Found AH Kasina: ${session.id}`);
        vajrayanaSessions.push(session);
      }
      else if (type === 'hum_kasina' || type.includes('hum')) {
        console.log(`Found HUM Kasina: ${session.id}`);
        vajrayanaSessions.push(session);
      }
      else if (type === 'clear_light_thigle' || type.includes('clear') || type.includes('thigle')) {
        console.log(`Found Clear Light: ${session.id}`);
        vajrayanaSessions.push(session);
      }
      // Color kasinas
      else if (['white', 'blue', 'red', 'yellow', 'custom'].includes(type)) {
        colorSessions.push(session);
      }
      // Elemental kasinas
      else if (['water', 'air', 'fire', 'earth', 'space', 'light'].includes(type)) {
        elementalSessions.push(session);
      }
    });

    console.log("After categorization:");
    console.log("Color sessions:", colorSessions.length);
    console.log("Elemental sessions:", elementalSessions.length);
    console.log("Vajrayana sessions:", vajrayanaSessions.length);

    // Calculate total times for each category
    const colorTotal = colorSessions.reduce((sum, s) => sum + s.duration, 0);
    setColorTime(colorTotal);
    
    const elementalTotal = elementalSessions.reduce((sum, s) => sum + s.duration, 0);
    setElementalTime(elementalTotal);
    
    const vajrayanaTotal = vajrayanaSessions.reduce((sum, s) => sum + s.duration, 0);
    setVajrayanaTime(vajrayanaTotal);
    
    setTotalTime(colorTotal + elementalTotal + vajrayanaTotal);

    // Process data for the selected chart mode
    if (chartMode === 'overview') {
      // Create summary data for the overview chart
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
          emoji: '🕉️',
          displayName: 'Vajrayana'
        });
      }
      
      setChartData(overviewData);
    } 
    else if (chartMode === 'color') {
      // Detailed breakdown for color kasinas
      const colorData: ChartDataItem[] = [];
      const colorTypes = ['white', 'blue', 'red', 'yellow', 'custom'];
      
      colorTypes.forEach(type => {
        const sessionsByType = colorSessions.filter(s => s.kasinaType?.toLowerCase() === type);
        const duration = sessionsByType.reduce((sum, s) => sum + s.duration, 0);
        
        if (duration > 0) {
          colorData.push({
            name: type,
            value: duration,
            emoji: KASINA_EMOJIS[type] || '⚪',
            displayName: KASINA_NAMES[type] || type.charAt(0).toUpperCase() + type.slice(1),
            category: 'color'
          });
        }
      });
      
      setChartData(colorData);
    } 
    else if (chartMode === 'elemental') {
      // Detailed breakdown for elemental kasinas
      const elementalData: ChartDataItem[] = [];
      const elementalTypes = ['water', 'air', 'fire', 'earth', 'space', 'light'];
      
      elementalTypes.forEach(type => {
        const sessionsByType = elementalSessions.filter(s => s.kasinaType?.toLowerCase() === type);
        const duration = sessionsByType.reduce((sum, s) => sum + s.duration, 0);
        
        if (duration > 0) {
          elementalData.push({
            name: type,
            value: duration,
            emoji: KASINA_EMOJIS[type] || '⚪',
            displayName: KASINA_NAMES[type] || type.charAt(0).toUpperCase() + type.slice(1),
            category: 'elemental'
          });
        }
      });
      
      setChartData(elementalData);
    } 
    else if (chartMode === 'vajrayana') {
      // Detailed breakdown for vajrayana kasinas - individually process each type
      const vajrayanaData: ChartDataItem[] = [];
      
      // Directly process OM Kasina sessions
      const omSessions = vajrayanaSessions.filter(s => 
        s.kasinaType?.toLowerCase() === 'om_kasina' || 
        s.kasinaType?.toLowerCase().includes('om')
      );
      const omDuration = omSessions.reduce((sum, s) => sum + s.duration, 0);
      
      console.log("OM Kasina sessions found:", omSessions.length, "Total duration:", omDuration);
      
      if (omDuration > 0) {
        vajrayanaData.push({
          name: 'om_kasina',
          value: omDuration,
          emoji: KASINA_EMOJIS['om_kasina'] || '🕉️',
          displayName: 'OM Kasina',
          category: 'vajrayana'
        });
      }
      
      // Process AH Kasina sessions
      const ahSessions = vajrayanaSessions.filter(s => 
        s.kasinaType?.toLowerCase() === 'ah_kasina' || 
        s.kasinaType?.toLowerCase().includes('ah')
      );
      const ahDuration = ahSessions.reduce((sum, s) => sum + s.duration, 0);
      
      console.log("AH Kasina sessions found:", ahSessions.length, "Total duration:", ahDuration);
      
      if (ahDuration > 0) {
        vajrayanaData.push({
          name: 'ah_kasina',
          value: ahDuration,
          emoji: KASINA_EMOJIS['ah_kasina'] || '🔮',
          displayName: 'AH Kasina',
          category: 'vajrayana'
        });
      }
      
      // Process HUM Kasina sessions
      const humSessions = vajrayanaSessions.filter(s => 
        s.kasinaType?.toLowerCase() === 'hum_kasina' || 
        s.kasinaType?.toLowerCase().includes('hum')
      );
      const humDuration = humSessions.reduce((sum, s) => sum + s.duration, 0);
      
      console.log("HUM Kasina sessions found:", humSessions.length, "Total duration:", humDuration);
      
      if (humDuration > 0) {
        vajrayanaData.push({
          name: 'hum_kasina',
          value: humDuration,
          emoji: KASINA_EMOJIS['hum_kasina'] || '🌀',
          displayName: 'HUM Kasina',
          category: 'vajrayana'
        });
      }
      
      // Process Clear Light Thigle sessions
      const clearLightSessions = vajrayanaSessions.filter(s => 
        s.kasinaType?.toLowerCase() === 'clear_light_thigle' || 
        s.kasinaType?.toLowerCase().includes('clear') || 
        s.kasinaType?.toLowerCase().includes('thigle')
      );
      const clearLightDuration = clearLightSessions.reduce((sum, s) => sum + s.duration, 0);
      
      console.log("Clear Light sessions found:", clearLightSessions.length, "Total duration:", clearLightDuration);
      
      if (clearLightDuration > 0) {
        vajrayanaData.push({
          name: 'clear_light_thigle',
          value: clearLightDuration,
          emoji: KASINA_EMOJIS['clear_light_thigle'] || '🌈',
          displayName: 'Clear Light',
          category: 'vajrayana'
        });
      }
      
      setChartData(vajrayanaData);
    }
    
  }, [sessions, timeRange, chartMode]);

  // Format time for display
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Get the correct total time based on chart mode
  const getDisplayTime = (): number => {
    switch (chartMode) {
      case 'color':
        return colorTime;
      case 'elemental':
        return elementalTime;
      case 'vajrayana':
        return vajrayanaTime;
      default:
        return totalTime;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-2xl font-bold mb-2">No Practice Data</h2>
        <p className="text-gray-600 mb-6">
          Your practice history will appear here once you complete your first meditation session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Time range selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant={timeRange === 'all' ? 'default' : 'outline'}
          onClick={() => setTimeRange('all')}
          className="text-sm"
        >
          All Time
        </Button>
        <Button
          variant={timeRange === 'month' ? 'default' : 'outline'}
          onClick={() => setTimeRange('month')}
          className="text-sm"
        >
          Past Month
        </Button>
        <Button
          variant={timeRange === 'week' ? 'default' : 'outline'}
          onClick={() => setTimeRange('week')}
          className="text-sm"
        >
          Past Week
        </Button>
      </div>

      {/* Chart section */}
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Practice Distribution</h2>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button
                variant={chartMode === 'overview' ? 'default' : 'outline'}
                onClick={() => setChartMode('overview')}
                className="text-xs"
                size="sm"
              >
                Overview
              </Button>
              <Button
                variant={chartMode === 'color' ? 'default' : 'outline'}
                onClick={() => setChartMode('color')}
                className="text-xs"
                size="sm"
              >
                Color
              </Button>
              <Button
                variant={chartMode === 'elemental' ? 'default' : 'outline'}
                onClick={() => setChartMode('elemental')}
                className="text-xs"
                size="sm"
              >
                Elemental
              </Button>
              <Button
                variant={chartMode === 'vajrayana' ? 'default' : 'outline'}
                onClick={() => setChartMode('vajrayana')}
                className="text-xs"
                size="sm"
              >
                Vajrayana
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-sm text-gray-600 mb-2">
              Total Meditation Time: <span className="font-semibold">{formatTime(getDisplayTime())}</span>
            </div>
            <div className="w-full max-w-md h-64">
              <PracticeChart data={chartData} />
            </div>
          </div>
        </div>
      </div>

      {/* Session Log */}
      <div className="bg-card rounded-lg p-4 shadow">
        <h2 className="text-xl font-bold mb-4">Practice Log</h2>
        <PracticeLog sessions={sessions} timeRange={timeRange} />
      </div>
    </div>
  );
};

export default ReflectionFixed;