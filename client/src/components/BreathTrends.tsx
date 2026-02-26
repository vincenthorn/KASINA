import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceArea } from 'recharts';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface BreathTrendPoint {
  id: string;
  sessionDate: string;
  durationSeconds: number;
  kasinaType: string;
  kasinaName: string;
  avgBpm: number;
  minSustainedBpm: number;
  settlingTimeSeconds: number | null;
  crucialZonePercent: number;
  dataPointCount: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div style={{
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgba(99, 102, 241, 0.4)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '13px',
      maxWidth: '200px'
    }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontSize: '11px' }}>
        {data.dateLabel}
      </p>
      <p style={{ color: '#818cf8', fontWeight: 600, marginBottom: '2px' }}>
        Avg: {data.avgBpm} BPM
      </p>
      <p style={{ color: '#22d3ee', fontSize: '12px', marginBottom: '2px' }}>
        Lowest sustained: {data.minSustainedBpm} BPM
      </p>
      <p style={{ color: '#2dd4bf', fontSize: '12px', marginBottom: '2px' }}>
        Crucial zone: {data.crucialZonePercent}%
      </p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
        {Math.round(data.durationSeconds / 60)} min session
      </p>
    </div>
  );
};

const BreathTrends: React.FC = () => {
  const [trends, setTrends] = useState<BreathTrendPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sessions/breath-trends', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data: BreathTrendPoint[]) => {
        setTrends(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !trends || trends.length < 3) return null;

  const chartData = trends.map((t, i) => ({
    ...t,
    index: i,
    dateLabel: format(new Date(t.sessionDate), 'MMM d'),
    shortDate: format(new Date(t.sessionDate), 'M/d')
  }));

  const firstThird = chartData.slice(0, Math.ceil(chartData.length / 3));
  const lastThird = chartData.slice(-Math.ceil(chartData.length / 3));
  const earlyAvg = firstThird.reduce((s, d) => s + d.avgBpm, 0) / firstThird.length;
  const recentAvg = lastThird.reduce((s, d) => s + d.avgBpm, 0) / lastThird.length;
  const bpmChange = recentAvg - earlyAvg;

  const allBpm = chartData.map(d => d.avgBpm);
  const yMin = Math.min(1, Math.floor(Math.min(...allBpm)) - 1);
  const yMax = Math.ceil(Math.max(...allBpm)) + 1;

  const avgCrucialZone = chartData.reduce((s, d) => s + d.crucialZonePercent, 0) / chartData.length;

  return (
    <Card className="bg-gray-900 border-gray-700 shadow-xl">
      <CardHeader className="border-b border-gray-700 pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Breath Rate Trends
          </div>
          <span className="text-sm font-normal text-gray-400">{trends.length} sessions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex gap-3 mb-4 text-sm flex-wrap">
          <div className="bg-gray-800 rounded-lg px-3 py-2 flex-1 min-w-[120px] text-center">
            <div className="text-gray-400 text-xs">BPM Trend</div>
            <div className="flex items-center justify-center gap-1">
              {bpmChange < -0.5 ? (
                <TrendingDown className="w-4 h-4 text-green-400" />
              ) : bpmChange > 0.5 ? (
                <TrendingUp className="w-4 h-4 text-orange-400" />
              ) : (
                <Minus className="w-4 h-4 text-gray-400" />
              )}
              <span className={`font-semibold ${bpmChange < -0.5 ? 'text-green-400' : bpmChange > 0.5 ? 'text-orange-400' : 'text-gray-300'}`}>
                {bpmChange > 0 ? '+' : ''}{bpmChange.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 flex-1 min-w-[120px] text-center">
            <div className="text-gray-400 text-xs">Recent Avg</div>
            <div className="text-white font-semibold">{recentAvg.toFixed(1)} BPM</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 flex-1 min-w-[120px] text-center">
            <div className="text-gray-400 text-xs">Avg Crucial Zone</div>
            <div className="text-teal-400 font-semibold">{avgCrucialZone.toFixed(0)}%</div>
          </div>
        </div>

        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

              <ReferenceArea y1={4} y2={9} fill="#2DD4BF" fillOpacity={0.06} />
              <ReferenceArea y1={2} y2={6} fill="#A78BFA" fillOpacity={0.08} />
              <ReferenceArea y1={5.5} y2={6.5} fill="#F59E0B" fillOpacity={0.1} />

              <XAxis
                dataKey="shortDate"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                domain={[yMin, yMax]}
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                label={{
                  value: 'Avg BPM',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'rgba(255,255,255,0.4)',
                  fontSize: 11,
                  offset: 10,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="avgBpm"
                stroke="#818cf8"
                strokeWidth={2}
                dot={{ r: 4, fill: '#818cf8', stroke: '#312e81', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#a5b4fc', stroke: '#818cf8', strokeWidth: 2 }}
                name="Avg BPM"
              />
              <Line
                type="monotone"
                dataKey="minSustainedBpm"
                stroke="#22d3ee"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={{ r: 3, fill: '#22d3ee', stroke: '#164e63', strokeWidth: 1 }}
                activeDot={{ r: 5, fill: '#67e8f9', stroke: '#22d3ee', strokeWidth: 2 }}
                name="Lowest Sustained"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 justify-center text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: '#818cf8' }} />
            Average BPM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded border-dashed" style={{ backgroundColor: '#22d3ee' }} />
            Lowest Sustained
          </span>
        </div>

        {Math.abs(bpmChange) > 0.3 && (
          <p className="text-gray-500 text-xs mt-3 text-center">
            {bpmChange < 0
              ? `Over your last ${trends.length} breath sessions, your average BPM has decreased by ${Math.abs(bpmChange).toFixed(1)} — indicating deepening practice.`
              : `Over your last ${trends.length} breath sessions, your average BPM has increased by ${bpmChange.toFixed(1)}.`
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BreathTrends;
