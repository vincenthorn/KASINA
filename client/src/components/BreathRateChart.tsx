import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

interface BreathRateDataPoint {
  time: number;
  bpm: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgba(99, 102, 241, 0.4)',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '13px',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>
        {formatTime(label)}
      </p>
      <p style={{ color: '#818cf8', fontWeight: 600 }}>
        {payload[0].value.toFixed(1)} bpm
      </p>
    </div>
  );
};

const BreathRateChart: React.FC = () => {
  const [data, setData] = useState<BreathRateDataPoint[] | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('lastBreathRateHistory');
      if (stored) {
        const parsed = JSON.parse(stored) as BreathRateDataPoint[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setData(parsed);
        }
        sessionStorage.removeItem('lastBreathRateHistory');
      }
    } catch (e) {
      console.warn('Could not load breath rate history:', e);
    }
  }, []);

  if (!data || data.length < 10) return null;

  const bpmValues = data.map(d => d.bpm);
  const minBpm = Math.floor(Math.min(...bpmValues) - 1);
  const maxBpm = Math.ceil(Math.max(...bpmValues) + 1);
  const avgBpm = (bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length).toFixed(1);
  const startBpm = bpmValues.slice(0, 30).reduce((a, b) => a + b, 0) / Math.min(30, bpmValues.length);
  const endBpm = bpmValues.slice(-30).reduce((a, b) => a + b, 0) / Math.min(30, bpmValues.length);
  const totalMinutes = Math.floor(data[data.length - 1].time / 60);

  const tickInterval = Math.max(1, Math.floor(data.length / 8));
  const ticks = data.filter((_, i) => i % tickInterval === 0).map(d => d.time);

  return (
    <Card className="bg-gray-900 border-gray-700 shadow-xl">
      <CardHeader className="border-b border-gray-700 pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Breath Rate — Last Session
          </div>
          <span className="text-sm font-normal text-gray-400">{totalMinutes} min</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex gap-4 mb-4 text-sm">
          <div className="bg-gray-800 rounded-lg px-3 py-2 flex-1 text-center">
            <div className="text-gray-400 text-xs">Average</div>
            <div className="text-white font-semibold">{avgBpm} bpm</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 flex-1 text-center">
            <div className="text-gray-400 text-xs">Start</div>
            <div className="text-white font-semibold">{startBpm.toFixed(1)} bpm</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 flex-1 text-center">
            <div className="text-gray-400 text-xs">End</div>
            <div className="text-white font-semibold">{endBpm.toFixed(1)} bpm</div>
          </div>
          {endBpm < startBpm && (
            <div className="bg-green-900/30 border border-green-700/30 rounded-lg px-3 py-2 flex-1 text-center">
              <div className="text-green-400 text-xs">Change</div>
              <div className="text-green-300 font-semibold">-{(startBpm - endBpm).toFixed(1)} bpm</div>
            </div>
          )}
        </div>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                ticks={ticks}
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                domain={[minBpm, maxBpm]}
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickFormatter={(v) => `${v}`}
                label={{
                  value: 'bpm',
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
                dataKey="bpm"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#818cf8', stroke: '#312e81', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BreathRateChart;
