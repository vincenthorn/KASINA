import React, { useState, useEffect } from 'react';

const CrashLogPage: React.FC = () => {
  const [crashLog, setCrashLog] = useState<any[]>([]);
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    const log = localStorage.getItem('persistentCrashLog');
    if (log) {
      try {
        setCrashLog(JSON.parse(log));
      } catch (e) {
        console.error('Failed to parse crash log:', e);
      }
    }
  }, []);

  const clearCrashLog = () => {
    localStorage.removeItem('persistentCrashLog');
    setCrashLog([]);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Visual Kasina Crash Log</h1>
          <div className="space-x-4">
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              {showRawData ? 'Show Formatted' : 'Show Raw Data'}
            </button>
            <button
              onClick={clearCrashLog}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Clear Log
            </button>
          </div>
        </div>

        {crashLog.length === 0 ? (
          <div className="bg-green-800 border border-green-600 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">No Crashes Detected</h2>
            <p>No crash data found in local storage. This is good news!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-800 border border-yellow-600 p-4 rounded">
              <h2 className="text-xl font-semibold mb-2">
                {crashLog.length} Crash{crashLog.length > 1 ? 'es' : ''} Found
              </h2>
              <p>Recent crashes from visual kasina sessions are shown below.</p>
            </div>

            {showRawData ? (
              <div className="bg-gray-800 border border-gray-600 p-4 rounded">
                <h3 className="text-lg font-semibold mb-2">Raw Crash Data</h3>
                <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(crashLog, null, 2)}
                </pre>
              </div>
            ) : (
              crashLog.map((crash, index) => (
                <div key={index} className="bg-gray-800 border border-gray-600 p-4 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">
                      Crash #{crashLog.length - index}
                    </h3>
                    <span className="text-sm text-gray-400">
                      {formatDate(crash.timestamp)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p><strong>Type:</strong> {crash.crashType}</p>
                      {crash.sessionDuration && (
                        <p><strong>Session Duration:</strong> {formatDuration(crash.sessionDuration)}</p>
                      )}
                      {crash.meditationTime && (
                        <p><strong>Meditation Time:</strong> {formatDuration(crash.meditationTime)}</p>
                      )}
                      {crash.selectedKasina && (
                        <p><strong>Kasina:</strong> {crash.selectedKasina}</p>
                      )}
                    </div>
                    
                    <div>
                      {crash.memoryMB && (
                        <p><strong>Memory Used:</strong> {crash.memoryMB}MB / {crash.limitMB}MB</p>
                      )}
                      {crash.message && (
                        <p><strong>Error:</strong> {crash.message}</p>
                      )}
                      {crash.filename && (
                        <p><strong>File:</strong> {crash.filename}:{crash.line}</p>
                      )}
                    </div>
                  </div>
                  
                  {crash.crashType === 'critical_memory' && (
                    <div className="mt-2 p-2 bg-red-900 border border-red-700 rounded">
                      <strong>Critical Memory Event:</strong> Session reached dangerous memory levels
                    </div>
                  )}
                  
                  {crash.crashType === 'hard_crash' && (
                    <div className="mt-2 p-2 bg-red-900 border border-red-700 rounded">
                      <strong>Hard Crash:</strong> Browser tab crashed or reloaded unexpectedly
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-8 bg-gray-800 border border-gray-600 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">About This Log</h2>
          <p className="text-sm text-gray-300">
            This log persists across browser sessions and logouts. It tracks crashes, memory issues, and unexpected session endings from the visual kasina meditation feature. 
            The log automatically keeps only the 10 most recent crash events to prevent storage bloat.
          </p>
          <p className="text-sm text-gray-300 mt-2">
            <strong>Access this page anytime at:</strong> /crash-log
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrashLogPage;