import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
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

interface DetectedPause {
  startTime: number;
  endTime: number;
  duration: number;
}

interface SessionPhase {
  name: string;
  startTime: number;
  endTime: number;
  color: string;
}

function computeRollingAverage(bpmValues: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= bpmValues.length - windowSize; i++) {
    const window = bpmValues.slice(i, i + windowSize);
    result.push(window.reduce((s, v) => s + v, 0) / windowSize);
  }
  return result;
}

function formatTimeLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;
}

function findIndexAtTime(data: BreathRateDataPoint[], targetTime: number): number {
  for (let i = 0; i < data.length; i++) {
    if (data[i].time >= targetTime) return i;
  }
  return data.length - 1;
}

function detectPhases(data: BreathRateDataPoint[]): SessionPhase[] {
  if (data.length < 30) return [];

  const totalDuration = data[data.length - 1].time - data[0].time;
  const phases: SessionPhase[] = [];
  const windowSize = Math.min(30, Math.floor(data.length / 3));
  const rolling = computeRollingAverage(data.map(d => d.bpm), windowSize);
  if (rolling.length < 2) return [];

  const slopes: number[] = [];
  for (let i = 1; i < rolling.length; i++) {
    slopes.push(rolling[i] - rolling[i - 1]);
  }

  const maxSettleIdx = findIndexAtTime(data, data[0].time + 3 * 60);
  let settlingEnd = Math.min(data.length - 1, maxSettleIdx);
  const maxSlopeSearch = findIndexAtTime(data, data[0].time + 8 * 60);
  const minSlopeSearch = findIndexAtTime(data, data[0].time + 30);
  for (let i = minSlopeSearch; i < Math.min(slopes.length, maxSlopeSearch); i++) {
    if (slopes[i] >= 0) {
      settlingEnd = Math.min(i + windowSize, data.length - 1);
      break;
    }
  }

  phases.push({
    name: 'Settling',
    startTime: data[0].time,
    endTime: data[settlingEnd].time,
    color: '#F59E0B'
  });

  if (totalDuration < 5 * 60) {
    phases.push({
      name: 'Practice',
      startTime: data[settlingEnd].time,
      endTime: data[data.length - 1].time,
      color: '#6366F1'
    });
    return phases;
  }

  const stabilizationEndIdx = findIndexAtTime(data, data[0].time + 8 * 60);
  let lowestRollingIdx = 0;
  let lowestRollingVal = Infinity;
  for (let i = 0; i < rolling.length; i++) {
    if (rolling[i] < lowestRollingVal) {
      lowestRollingVal = rolling[i];
      lowestRollingIdx = i;
    }
  }

  const deepeningStartIdx = Math.max(settlingEnd, stabilizationEndIdx);
  const clampedDeepening = Math.min(deepeningStartIdx, data.length - 1);
  if (clampedDeepening < Math.min(lowestRollingIdx + windowSize, data.length - 1) && clampedDeepening > settlingEnd) {
    phases.push({
      name: 'Stabilization',
      startTime: data[settlingEnd].time,
      endTime: data[clampedDeepening].time,
      color: '#3B82F6'
    });
  }

  const absorptionThreshold = 6;
  let absorptionStartIdx = -1;
  let absorptionEndIdx = -1;
  for (let i = clampedDeepening; i < rolling.length; i++) {
    if (rolling[i] < absorptionThreshold) {
      if (absorptionStartIdx === -1) absorptionStartIdx = i;
      absorptionEndIdx = i;
    }
  }

  const emergenceTime = Math.min(3 * 60, totalDuration * 0.15);
  const emergenceStartIdx = findIndexAtTime(data, data[data.length - 1].time - emergenceTime);
  const mainEndIdx = absorptionEndIdx > 0
    ? Math.min(absorptionEndIdx + windowSize, emergenceStartIdx)
    : emergenceStartIdx;
  const safeMainEnd = Math.min(mainEndIdx, data.length - 1);

  if (absorptionStartIdx > 0 && absorptionStartIdx < emergenceStartIdx) {
    const absIdx = Math.min(absorptionStartIdx + windowSize, data.length - 1);
    phases.push({
      name: 'Deepening',
      startTime: data[clampedDeepening].time,
      endTime: data[absIdx].time,
      color: '#8B5CF6'
    });
    phases.push({
      name: 'Absorption',
      startTime: data[absIdx].time,
      endTime: data[safeMainEnd].time,
      color: '#EC4899'
    });
  } else {
    phases.push({
      name: 'Deepening',
      startTime: data[clampedDeepening].time,
      endTime: data[safeMainEnd].time,
      color: '#8B5CF6'
    });
  }

  if (emergenceStartIdx < data.length - 1) {
    const lastPhaseEnd = phases[phases.length - 1]?.endTime || data[emergenceStartIdx].time;
    if (data[data.length - 1].time > lastPhaseEnd) {
      phases.push({
        name: 'Emergence',
        startTime: lastPhaseEnd,
        endTime: data[data.length - 1].time,
        color: '#10B981'
      });
    }
  }

  return phases;
}

function detectPauses(data: BreathRateDataPoint[]): DetectedPause[] {
  const pauses: DetectedPause[] = [];
  const threshold = 2;
  const minDurationSeconds = 10;

  let pauseStart = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i].bpm < threshold) {
      if (pauseStart === -1) pauseStart = i;
    } else {
      if (pauseStart !== -1) {
        const duration = data[i].time - data[pauseStart].time;
        if (duration >= minDurationSeconds) {
          pauses.push({
            startTime: data[pauseStart].time,
            endTime: data[i].time,
            duration
          });
        }
        pauseStart = -1;
      }
    }
  }

  if (pauseStart !== -1) {
    const duration = data[data.length - 1].time - data[pauseStart].time;
    if (duration >= minDurationSeconds) {
      pauses.push({
        startTime: data[pauseStart].time,
        endTime: data[data.length - 1].time,
        duration
      });
    }
  }

  return pauses;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAboutMetrics, setShowAboutMetrics] = useState(false);

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

    const windowSize = Math.min(60, bpmValues.length);
    const rollingAvgs = computeRollingAverage(bpmValues, windowSize);
    const minSustainedBpm = rollingAvgs.length > 0 ? Math.min(...rollingAvgs) : min;

    let settlingTimeSeconds: number | null = null;
    const settlingWindowSize = Math.min(30, bpmValues.length);
    for (let i = 0; i <= bpmValues.length - settlingWindowSize; i++) {
      const windowAvg = bpmValues.slice(i, i + settlingWindowSize).reduce((s, v) => s + v, 0) / settlingWindowSize;
      if (windowAvg <= 9) {
        settlingTimeSeconds = data[i].time;
        break;
      }
    }

    const crucialZoneCount = bpmValues.filter(v => v >= 4 && v <= 9).length;
    const deepConcentrationCount = bpmValues.filter(v => v >= 2 && v <= 6).length;
    const resonanceZoneCount = bpmValues.filter(v => v >= 5.5 && v <= 6.5).length;
    const crucialZonePercent = (crucialZoneCount / bpmValues.length) * 100;
    const deepConcentrationPercent = (deepConcentrationCount / bpmValues.length) * 100;
    const resonanceZonePercent = (resonanceZoneCount / bpmValues.length) * 100;

    const breathIntervals = bpmValues.map(bpm => bpm > 0 ? 60 / bpm : 0).filter(v => v > 0 && isFinite(v));
    const meanInterval = breathIntervals.length > 0 ? breathIntervals.reduce((s, v) => s + v, 0) / breathIntervals.length : 0;

    let sdbb = 0;
    if (breathIntervals.length > 1) {
      const variance = breathIntervals.reduce((s, v) => s + Math.pow(v - meanInterval, 2), 0) / (breathIntervals.length - 1);
      sdbb = Math.sqrt(variance);
    }

    let rmssd = 0;
    if (breathIntervals.length > 1) {
      const successiveDiffs = [];
      for (let i = 1; i < breathIntervals.length; i++) {
        successiveDiffs.push(breathIntervals[i] - breathIntervals[i - 1]);
      }
      const meanSquaredDiff = successiveDiffs.reduce((s, d) => s + d * d, 0) / successiveDiffs.length;
      rmssd = Math.sqrt(meanSquaredDiff);
    }

    const cv = meanInterval > 0 ? (sdbb / meanInterval) * 100 : 0;
    let regularityLabel = 'Variable';
    if (cv < 8) regularityLabel = 'Very Rhythmic';
    else if (cv < 15) regularityLabel = 'Rhythmic';
    else if (cv < 25) regularityLabel = 'Moderate';

    return {
      avg, startBpm, endBpm, min, max, change, count: data.length,
      minSustainedBpm,
      settlingTimeSeconds,
      crucialZonePercent,
      deepConcentrationPercent,
      resonanceZonePercent,
      sdbb,
      rmssd,
      cv,
      regularityLabel,
      meanInterval
    };
  }, [session]);

  const chartData = useMemo(() => {
    if (!session?.breathRateData) return [];
    return session.breathRateData.map(d => ({
      time: d.time,
      timeLabel: formatTimeLabel(d.time),
      bpm: Math.round(d.bpm * 10) / 10
    }));
  }, [session]);

  const phases = useMemo(() => {
    if (!session?.breathRateData || session.breathRateData.length < 30) return [];
    return detectPhases(session.breathRateData);
  }, [session]);

  const pauses = useMemo(() => {
    if (!session?.breathRateData) return [];
    return detectPauses(session.breathRateData);
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

  const yMin = Math.min(1, stats ? Math.floor(stats.min) - 1 : 1);
  const yMax = stats ? Math.ceil(stats.max) + 1 : 'auto';

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Lowest Sustained</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.minSustainedBpm.toFixed(1)}</p>
                <p className="text-gray-600 text-xs">60s rolling avg</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Settling Time</p>
                <p className="text-2xl font-bold text-amber-400">
                  {stats.settlingTimeSeconds !== null ? formatTimeLabel(stats.settlingTimeSeconds) : '—'}
                </p>
                <p className="text-gray-600 text-xs">Time to reach &lt;9 BPM</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Crucial Zone</p>
                <p className="text-2xl font-bold text-teal-400">{stats.crucialZonePercent.toFixed(0)}%</p>
                <p className="text-gray-600 text-xs">4–9 BPM</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Deep Concentration</p>
                <p className="text-2xl font-bold text-purple-400">{stats.deepConcentrationPercent.toFixed(0)}%</p>
                <p className="text-gray-600 text-xs">2–6 BPM</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Resonance Zone</p>
                <p className="text-2xl font-bold text-amber-300">{stats.resonanceZonePercent.toFixed(0)}%</p>
                <p className="text-gray-600 text-xs">5.5–6.5 BPM</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-300">Breath Rate Over Time</h2>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

                    <ReferenceArea y1={4} y2={9} fill="#2DD4BF" fillOpacity={0.08} />
                    <ReferenceArea y1={2} y2={6} fill="#A78BFA" fillOpacity={0.1} />
                    <ReferenceArea y1={5.5} y2={6.5} fill="#F59E0B" fillOpacity={0.12} />

                    {pauses.map((pause, i) => (
                      <ReferenceArea
                        key={`pause-${i}`}
                        x1={pause.startTime}
                        x2={pause.endTime}
                        fill="#F97316"
                        fillOpacity={0.15}
                      />
                    ))}

                    {phases.length > 1 && phases.map((phase, i) => {
                      if (i === 0) return null;
                      return (
                        <ReferenceLine
                          key={`phase-${i}`}
                          x={phase.startTime}
                          stroke={phase.color}
                          strokeDasharray="4 4"
                          strokeOpacity={0.6}
                          label={{
                            value: phase.name,
                            position: 'top',
                            fill: phase.color,
                            fontSize: 11,
                            fontWeight: 500
                          }}
                        />
                      );
                    })}

                    <XAxis 
                      dataKey="time"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(v: number) => formatTimeLabel(v)}
                      stroke="#6B7280"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Time (min:sec)', position: 'insideBottom', offset: -10, fill: '#6B7280' }}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'BPM', angle: -90, position: 'insideLeft', fill: '#6B7280' }}
                      domain={[yMin, yMax]}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#9CA3AF' }}
                      itemStyle={{ color: '#818CF8' }}
                      labelFormatter={(v: number) => formatTimeLabel(v)}
                      formatter={(value: number) => [`${value.toFixed(1)} bpm`, 'Breath Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bpm" 
                      stroke="#818CF8" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#818CF8', stroke: '#1F2937', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#A5B4FC', stroke: '#818CF8', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 justify-center text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(45, 212, 191, 0.3)' }} />
                  Crucial Breathing Zone (4–9 BPM)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(167, 139, 250, 0.4)' }} />
                  Deep Concentration (2–6 BPM)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.45)' }} />
                  Resonance Zone (5.5–6.5 BPM)
                </span>
              </div>

              <p className="text-gray-600 text-sm mt-3 text-center">{stats.count} data points recorded</p>
            </div>

            {phases.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
                <h2 className="text-lg font-semibold mb-3 text-gray-300">Session Phases</h2>
                <div className="flex w-full h-8 rounded-lg overflow-hidden mb-3">
                  {phases.map((phase, i) => {
                    const totalTime = phases[phases.length - 1].endTime - phases[0].startTime;
                    const phaseTime = phase.endTime - phase.startTime;
                    const widthPercent = totalTime > 0 ? (phaseTime / totalTime) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-center text-xs font-medium text-white/90 transition-all"
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: phase.color,
                          opacity: 0.7,
                          minWidth: widthPercent > 3 ? undefined : '2px'
                        }}
                        title={`${phase.name}: ${formatTimeLabel(phase.startTime)} – ${formatTimeLabel(phase.endTime)}`}
                      >
                        {widthPercent > 12 ? phase.name : ''}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
                  {phases.map((phase, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: phase.color }} />
                      {phase.name} ({formatTimeLabel(phase.startTime)} – {formatTimeLabel(phase.endTime)})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {pauses.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
                <h2 className="text-lg font-semibold mb-3 text-gray-300">Stillness Moments</h2>
                <p className="text-gray-500 text-sm mb-3">
                  {pauses.length} period{pauses.length !== 1 ? 's' : ''} of near-stillness detected (BPM &lt; 2 for 10+ seconds)
                </p>
                <div className="space-y-2">
                  {pauses.map((pause, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-2">
                      <span className="text-orange-400 font-mono text-sm">{formatTimeLabel(pause.startTime)}</span>
                      <span className="text-gray-600">→</span>
                      <span className="text-orange-400 font-mono text-sm">{formatTimeLabel(pause.endTime)}</span>
                      <span className="text-gray-500 text-sm ml-auto">{Math.round(pause.duration)}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-300">Breath Variability</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Regularity</p>
                  <p className="text-xl font-bold text-emerald-400">{stats.regularityLabel}</p>
                  <p className="text-gray-600 text-xs">CV: {stats.cv.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">SDBB</p>
                  <p className="text-xl font-bold text-gray-300">{stats.sdbb.toFixed(2)}s</p>
                  <p className="text-gray-600 text-xs">Breath interval variability</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">RMSSD</p>
                  <p className="text-xl font-bold text-gray-300">{stats.rmssd.toFixed(2)}s</p>
                  <p className="text-gray-600 text-xs">Successive difference variability</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 mb-6">
              <button
                onClick={() => setShowAboutMetrics(!showAboutMetrics)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-800/30 transition-colors rounded-xl"
              >
                <h2 className="text-lg font-semibold text-gray-300">About These Metrics</h2>
                {showAboutMetrics ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              {showAboutMetrics && (
                <div className="px-6 pb-6 space-y-4 text-sm text-gray-400 leading-relaxed">
                  <p>
                    <strong className="text-gray-300">Breathing Zones.</strong> Research consistently shows that experienced meditators naturally settle into the 4–9 BPM range during practice, described as the "crucial breathing zone" for mindfulness (Khan et al., 2025). The narrower Deep Concentration zone (2–6 BPM) reflects the even slower rates associated with deep absorption states. The Resonance Zone (5.5–6.5 BPM) is the frequency at which breathing synchronizes with the heart's baroreflex, amplifying heart rate variability 4–10x above baseline (Lehrer & Vaschillo, Rutgers). Individual resonance frequency varies with body size — taller individuals tend toward the lower end.
                  </p>
                  <p>
                    <strong className="text-gray-300">Breath Rate and Practice Depth.</strong> Sara Lazar's Harvard group found that the change in respiration rate from rest to meditation correlated with lifetime practice hours at r = −0.75. The Vernier Respiration Belt captures your breath rate approximately once per second, giving a high-resolution picture of how your breathing evolves across a session. The characteristic pattern is a U-shape: settling from baseline, sustaining low rates during the core practice, and gradually returning during emergence.
                  </p>
                  <p>
                    <strong className="text-gray-300">Breath Rate Variability (BRV).</strong> SDBB and RMSSD measure how much your breath-to-breath intervals vary — analogous to heart rate variability. Research by Soni & Muniyandi (2019) found that experienced meditators showed 29% higher SDBB and 26% higher RMSSD than controls. The Regularity score (coefficient of variation) indicates how rhythmic your breathing was — Bernardi et al. (2001) found that regularity dropped from 22% to 6–8% during resonant breathing, with greater regularity accompanying greater cardiovascular benefit.
                  </p>
                  <p>
                    <strong className="text-gray-300">Stillness Moments.</strong> Research on spontaneous breath suspension during meditation (Farrow & Hebert, 1982) documented 565 episodes across 40 practitioners, with an extraordinary correlation to subjective reports of "pure consciousness" (p &lt; 10⁻¹⁰). These may represent apneustic breathing — extremely slow, sustained inhalation — rather than true breath cessation. The fire kasina practice that KASINA draws from has been scientifically validated as producing experiences of extraordinary depth (Woollacott et al., 2024).
                  </p>
                  <p className="text-gray-500 italic">
                    Note: Individual variation in breathing patterns during meditation is natural and well-documented. Your own trends across sessions are more meaningful than any single benchmark. These metrics are intended to support your practice, not define it.
                  </p>
                </div>
              )}
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
