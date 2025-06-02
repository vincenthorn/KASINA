import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/indexedDBStorage';

interface DiagnosticData {
  contextLoss: any;
  snapshots: any[];
  incrementalSession: any;
  crashLog: any;
  lastError: any;
  componentLifecycle: any[];
  authEvents: any[];
  stateChanges: any[];
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadDiagnosticData = async () => {
      try {
        console.log('Loading diagnostic data from IndexedDB and localStorage...');
        
        // Try IndexedDB first, fallback to localStorage
        const [contextLoss, snapshots, incrementalSession, crashLog, lastError, componentLifecycle, authEvents, stateChanges] = await Promise.all([
          storage.getItemSafe('diagnostics', 'webglContextLoss').catch(() => 
            localStorage.getItem('webglContextLoss') ? JSON.parse(localStorage.getItem('webglContextLoss')!) : null
          ),
          storage.getItemSafe('diagnostics', 'performanceSnapshots').catch(() => 
            localStorage.getItem('performanceSnapshots') ? JSON.parse(localStorage.getItem('performanceSnapshots')!) : []
          ),
          storage.getItemSafe('sessions', 'incrementalSession').catch(() => 
            localStorage.getItem('incrementalSession') ? JSON.parse(localStorage.getItem('incrementalSession')!) : null
          ),
          storage.getItemSafe('diagnostics', 'crashLog').catch(() => 
            localStorage.getItem('crashLog') ? JSON.parse(localStorage.getItem('crashLog')!) : null
          ),
          storage.getItemSafe('diagnostics', 'lastError').catch(() => 
            localStorage.getItem('lastError') ? JSON.parse(localStorage.getItem('lastError')!) : null
          ),
          // New crash detection logs
          storage.getItemSafe('diagnostics', 'componentLifecycle').catch(() => 
            localStorage.getItem('componentLifecycle') ? JSON.parse(localStorage.getItem('componentLifecycle')!) : []
          ),
          storage.getItemSafe('diagnostics', 'authEvents').catch(() => 
            localStorage.getItem('authEvents') ? JSON.parse(localStorage.getItem('authEvents')!) : []
          ),
          storage.getItemSafe('diagnostics', 'stateChanges').catch(() => 
            localStorage.getItem('stateChanges') ? JSON.parse(localStorage.getItem('stateChanges')!) : []
          )
        ]);

        console.log('Loaded data:', { contextLoss, snapshots: snapshots?.length, incrementalSession, crashLog });

        const diagnosticData: DiagnosticData = {
          contextLoss,
          snapshots: Array.isArray(snapshots) ? snapshots : [],
          incrementalSession,
          crashLog,
          lastError,
          componentLifecycle: Array.isArray(componentLifecycle) ? componentLifecycle : [],
          authEvents: Array.isArray(authEvents) ? authEvents : [],
          stateChanges: Array.isArray(stateChanges) ? stateChanges : []
        };
        
        setData(diagnosticData);
      } catch (error) {
        console.error('Failed to load diagnostic data:', error);
        setData({
          contextLoss: null,
          snapshots: [],
          incrementalSession: null,
          crashLog: null,
          lastError: null,
          componentLifecycle: [],
          authEvents: [],
          stateChanges: []
        });
      }
    };

    loadDiagnosticData();
  }, []);

  const copyToClipboard = () => {
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearData = () => {
    localStorage.removeItem('webglContextLoss');
    localStorage.removeItem('performanceSnapshots');
    localStorage.removeItem('incrementalSession');
    localStorage.removeItem('crashLog');
    setData({
      contextLoss: null,
      snapshots: [],
      incrementalSession: null,
      crashLog: null,
      lastError: null,
      componentLifecycle: [],
      authEvents: [],
      stateChanges: []
    });
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Diagnostic Data Recovery</h1>
          <p className="text-gray-300">WebGL and performance diagnostic information</p>
        </div>

        <div className="flex gap-4 mb-6">
          <Button onClick={copyToClipboard} variant="outline">
            {copied ? 'Copied!' : 'Copy All Data'}
          </Button>
          <Button onClick={clearData} variant="destructive">
            Clear All Data
          </Button>
        </div>

        <Card className="bg-black/20 border-gray-700">
          <CardHeader>
            <CardTitle className="text-red-400">WebGL Context Loss</CardTitle>
            <CardDescription>Records of WebGL context loss events</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto bg-black/30 p-4 rounded">
              {data.contextLoss ? JSON.stringify(data.contextLoss, null, 2) : 'No context loss events recorded'}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400">Performance Snapshots</CardTitle>
            <CardDescription>30-second interval diagnostic snapshots ({data.snapshots.length} records)</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto bg-black/30 p-4 rounded max-h-96">
              {data.snapshots.length > 0 ? JSON.stringify(data.snapshots, null, 2) : 'No performance snapshots recorded'}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-gray-700">
          <CardHeader>
            <CardTitle className="text-green-400">Last Session State</CardTitle>
            <CardDescription>Incremental session data saved before crash</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto bg-black/30 p-4 rounded">
              {data.incrementalSession ? JSON.stringify(data.incrementalSession, null, 2) : 'No incremental session data'}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-gray-700">
          <CardHeader>
            <CardTitle className="text-orange-400">Crash Log</CardTitle>
            <CardDescription>General crash and error information</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto bg-black/30 p-4 rounded">
              {data.crashLog ? JSON.stringify(data.crashLog, null, 2) : 'No crash log data'}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-gray-700">
          <CardHeader>
            <CardTitle className="text-cyan-400">Component Lifecycle Events</CardTitle>
            <CardDescription>Mount/unmount events that could indicate crashes</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto bg-black/30 p-4 rounded max-h-60">
              {data.componentLifecycle.length > 0 ? JSON.stringify(data.componentLifecycle, null, 2) : 'No component lifecycle events recorded'}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-gray-700">
          <CardHeader>
            <CardTitle className="text-yellow-400">Authentication Events</CardTitle>
            <CardDescription>Auth checks and potential logout events</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto bg-black/30 p-4 rounded max-h-60">
              {data.authEvents.length > 0 ? JSON.stringify(data.authEvents, null, 2) : 'No authentication events recorded'}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-gray-700">
          <CardHeader>
            <CardTitle className="text-pink-400">State Changes</CardTitle>
            <CardDescription>Component state changes that could trigger unmounts</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto bg-black/30 p-4 rounded max-h-60">
              {data.stateChanges.length > 0 ? JSON.stringify(data.stateChanges, null, 2) : 'No state changes recorded'}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-gray-700">
          <CardHeader>
            <CardTitle className="text-purple-400">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>WebGL Context Loss:</strong> {data.contextLoss ? 'YES - Context loss detected!' : 'No context loss recorded'}</p>
            <p><strong>Performance Snapshots:</strong> {data.snapshots.length} records</p>
            <p><strong>Component Events:</strong> {data.componentLifecycle.length} lifecycle events</p>
            <p><strong>Auth Events:</strong> {data.authEvents.length} authentication checks</p>
            <p><strong>State Changes:</strong> {data.stateChanges.length} component state changes</p>
            <p><strong>Last Session Duration:</strong> {data.incrementalSession?.duration || 'Unknown'} seconds</p>
            <p><strong>Last Kasina:</strong> {data.incrementalSession?.kasina || 'Unknown'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}