import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';

interface BreathRateDataPoint {
  time: number;
  bpm: number;
}

interface SessionDetail {
  id: string;
  kasinaType: string;
  kasinaName: string;
  duration: number;
  timestamp: string;
  breathRateData: BreathRateDataPoint[] | null;
  kasinaBreakdown: Array<{ kasina_type: string; duration_seconds: number }>;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    fetch(`/api/sessions/${id}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Session not found');
        return res.json();
      })
      .then(data => {
        setSession(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const stats = useMemo(() => {
    if (!session?.breathRateData || session.breathRateData.length === 0) return null;
    
    const data = session.breathRateData;
    const bpmValues = data.map(d => d.bpm);
    const avg = bpmValues.reduce((sum, v) => sum + v, 0) / bpmValues.length;
    const startBpm = bpmValues[0];
    const endBpm = bpmValues[bpmValues.length - 1];
    const min = Math.min(...bpmValues);
    const max = Math.max(...bpmValues);
    const change = endBpm - startBpm;
    
    return { avg, startBpm, endBpm, min, max, change, count: data.length };
  }, [session]);

  const chartData = useMemo(() => {
    if (!session?.breathRateData) return [];
    return session.breathRateData.map(d => ({
      time: Math.floor(d.time / 60),
      timeLabel: `${Math.floor(d.time / 60)}:${String(d.time % 60).padStart(2, '0')}`,
      bpm: Math.round(d.bpm * 10) / 10
    }));
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading session...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">{error || 'Session not found'}</p>
        <Button onClick={() => navigate('/reflection')} variant="outline" className="text-gray-300 border-gray-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reflect
        </Button>
      </div>
    );
  }

  const durationMinutes = Math.round(session.duration / 60);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button 
          onClick={() => navigate('/reflection')} 
          variant="ghost" 
          className="text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reflect
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">{session.kasinaName}</h1>
          <div className="flex items-center gap-4 text-gray-400">
            <span>{format(new Date(session.timestamp), 'PPp')}</span>
            <span className="bg-indigo-700 text-white px-3 py-0.5 rounded-full text-sm font-semibold">
              {durationMinutes} min
            </span>
          </div>
        </div>

        {stats && chartData.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Average BPM</p>
                <p className="text-2xl font-bold text-indigo-400">{stats.avg.toFixed(1)}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Start → End</p>
                <p className="text-2xl font-bold">
                  <span className="text-gray-300">{stats.startBpm.toFixed(1)}</span>
                  <span className="text-gray-600 mx-1">→</span>
                  <span className="text-gray-300">{stats.endBpm.toFixed(1)}</span>
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Range</p>
                <p className="text-2xl font-bold text-gray-300">{stats.min.toFixed(1)} – {stats.max.toFixed(1)}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Change</p>
                <p className={`text-2xl font-bold ${stats.change < 0 ? 'text-green-400' : stats.change > 0 ? 'text-orange-400' : 'text-gray-300'}`}>
                  {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-300">Breath Rate Over Time</h2>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="timeLabel" 
                      stroke="#6B7280"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Time (min:sec)', position: 'insideBottom', offset: -10, fill: '#6B7280' }}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'BPM', angle: -90, position: 'insideLeft', fill: '#6B7280' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#9CA3AF' }}
                      itemStyle={{ color: '#818CF8' }}
                      formatter={(value: number) => [`${value.toFixed(1)} bpm`, 'Breath Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bpm" 
                      stroke="#818CF8" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#818CF8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-gray-600 text-sm mt-3 text-center">{stats.count} data points recorded</p>
            </div>
          </>
        ) : (
          <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center">
            <p className="text-gray-500">No breath rate data available for this session.</p>
            <p className="text-gray-600 text-sm mt-2">Breath rate data is recorded when using a Vernier Respiration Belt during sessions of 5+ minutes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
