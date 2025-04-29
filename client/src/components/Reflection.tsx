import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useKasina } from "../lib/stores/useKasina";
import { getKasinaEmoji, KasinaSession, KasinaType } from "../lib/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { KASINA_EMOJIS, KASINA_NAMES } from "../lib/constants";

const Reflection = () => {
  const { sessions } = useKasina();
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('all');
  const [filteredSessions, setFilteredSessions] = useState<KasinaSession[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [totalTime, setTotalTime] = useState(0);

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
      'water', 'air', 'fire', 'earth', 'space', 'light'
    ];
    
    // Sum duration by kasina type
    const durationByType = kasinaTypes.reduce((acc, type) => {
      acc[type] = filteredSessions
        .filter(session => session.kasinaType === type)
        .reduce((sum, session) => sum + session.duration, 0);
      return acc;
    }, {} as Record<KasinaType, number>);
    
    // Create pie chart data
    const chartData = Object.entries(durationByType)
      .filter(([_, duration]) => duration > 0)
      .map(([type, duration]) => ({
        name: type,
        value: duration,
        emoji: KASINA_EMOJIS[type] || '🧿',
        displayName: KASINA_NAMES[type] || type.charAt(0).toUpperCase() + type.slice(1),
      }));
    
    const totalDuration = chartData.reduce((sum, item) => sum + item.value, 0);
    
    setPieData(chartData);
    setTotalTime(totalDuration);
  }, [filteredSessions]);

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
        <div>
          <h1 className="text-3xl font-bold mb-2">Reflection</h1>
          <p className="text-gray-400">
            Analyze your meditation patterns and progress
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Select value={timeFilter} onValueChange={(value: 'week' | 'month' | 'all') => setTimeFilter(value)}>
            <SelectTrigger className="w-36">
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
          <CardHeader>
            <CardTitle>Practice Distribution</CardTitle>
            <CardDescription className="text-gray-300">
              Time spent on each kasina type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data available for the selected time period
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, emoji, percent }) => `${emoji} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatTime(value), 'Duration']}
                      labelFormatter={(name) => name.charAt(0).toUpperCase() + name.slice(1)}
                    />
                  </PieChart>
                </ResponsiveContainer>
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
                          <span className="mr-2">{getKasinaEmoji(session.kasinaType)}</span>
                          {session.kasinaType.charAt(0).toUpperCase() + session.kasinaType.slice(1)}
                        </td>
                        <td className="py-3 px-4">{formatTime(session.duration)}</td>
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
