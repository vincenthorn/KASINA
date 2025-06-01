import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { BookOpen, BarChart, Wind, Monitor, Expand, PieChart, Waves } from "lucide-react";
import Logo from "../components/Logo";
import { useAuth } from "../lib/stores/useAuth";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { email, subscriptionType } = useAuth();
  
  // Check for crash logs and monitoring data from visual mode
  React.useEffect(() => {
    const sessionData = localStorage.getItem('visualModeSession');
    const crashData = localStorage.getItem('visualModeCrash');
    const promiseRejectionData = localStorage.getItem('visualModePromiseRejection');
    const memoryWarningData = localStorage.getItem('visualModeMemoryWarning');
    const criticalMemoryData = localStorage.getItem('visualModeCriticalMemory');
    const sessionLimitData = localStorage.getItem('visualModeSessionLimit');
    
    // Check for hard crashes (visual mode was active but no clean exit)
    const wasVisualModeActive = localStorage.getItem('visualModeActive');
    const visualModeStartTime = localStorage.getItem('visualModeStartTime');
    
    if (wasVisualModeActive === 'true') {
      const startTime = visualModeStartTime ? parseInt(visualModeStartTime) : Date.now();
      const sessionDuration = Math.round((Date.now() - startTime) / 1000);
      console.error('HARD CRASH DETECTED: Visual mode was active but did not exit cleanly');
      console.error(`Session lasted approximately ${sessionDuration} seconds before crash`);
      
      // Save hard crash to persistent log
      const hardCrashData = {
        timestamp: new Date().toISOString(),
        sessionDuration,
        crashType: 'hard_crash',
        message: 'Visual mode was active but did not exit cleanly',
        userAgent: navigator.userAgent
      };
      
      const crashLog = localStorage.getItem('persistentCrashLog') || '[]';
      const crashes = JSON.parse(crashLog);
      crashes.push(hardCrashData);
      if (crashes.length > 10) crashes.shift();
      localStorage.setItem('persistentCrashLog', JSON.stringify(crashes));
      
      // Clear the flags
      localStorage.removeItem('visualModeActive');
      localStorage.removeItem('visualModeStartTime');
    }
    
    if (sessionData) {
      console.log('Last visual mode session data:', JSON.parse(sessionData));
      localStorage.removeItem('visualModeSession');
    }
    
    if (crashData) {
      console.error('Retrieved visual mode crash data:', JSON.parse(crashData));
      localStorage.removeItem('visualModeCrash');
    }
    
    if (promiseRejectionData) {
      console.error('Retrieved visual mode promise rejection:', JSON.parse(promiseRejectionData));
      localStorage.removeItem('visualModePromiseRejection');
    }
    
    if (memoryWarningData) {
      console.warn('Memory warning from last session:', JSON.parse(memoryWarningData));
      localStorage.removeItem('visualModeMemoryWarning');
    }
    
    if (criticalMemoryData) {
      console.error('Critical memory warning from last session:', JSON.parse(criticalMemoryData));
      localStorage.removeItem('visualModeCriticalMemory');
    }
    
    if (sessionLimitData) {
      console.log('Session limit data from last session:', JSON.parse(sessionLimitData));
      localStorage.removeItem('visualModeSessionLimit');
    }
    
    // Log ALL diagnostic data for debugging
    const persistentCrashLog = localStorage.getItem('persistentCrashLog');
    const webglDiagnostics = localStorage.getItem('webglDiagnostics');
    const performanceData = localStorage.getItem('performanceSnapshots');
    
    console.log('=== COMPLETE DIAGNOSTIC REPORT ===');
    
    if (webglDiagnostics) {
      const webglData = JSON.parse(webglDiagnostics);
      console.log('WebGL Capabilities:', webglData);
    }
    
    if (performanceData) {
      const perfData = JSON.parse(performanceData);
      console.log('Performance Snapshots:', perfData);
      
      // Analyze the last few snapshots before crash
      if (perfData.length > 0) {
        console.log('=== PERFORMANCE ANALYSIS ===');
        console.log('Last 3 snapshots before crash:');
        const lastSnapshots = perfData.slice(-3);
        lastSnapshots.forEach((snapshot: any, index: number) => {
          console.log(`Snapshot ${perfData.length - 3 + index + 1}:`, {
            time: snapshot.sessionTime + 's',
            memory: snapshot.memory,
            kasina: snapshot.kasina
          });
        });
        
        // Check for memory trend
        if (lastSnapshots.length >= 2) {
          const memoryTrend = lastSnapshots[lastSnapshots.length - 1].memory.used - lastSnapshots[0].memory.used;
          console.log(`Memory trend in final snapshots: ${memoryTrend > 0 ? '+' : ''}${memoryTrend}MB`);
        }
        console.log('=== END PERFORMANCE ANALYSIS ===');
      }
    }
    
    if (persistentCrashLog) {
      try {
        const crashes = JSON.parse(persistentCrashLog);
        console.log('Crash History:', crashes);
        crashes.forEach((crash: any, index: number) => {
          console.log(`Crash #${index + 1}:`, crash);
        });
      } catch (e) {
        console.error('Failed to parse persistent crash log:', e);
      }
    }
    
    console.log('=== END DIAGNOSTIC REPORT ===');
  }, []);
  
  // Check if user is admin or premium
  const isAdmin = email === "admin@kasina.app";
  const isPremium = subscriptionType === "premium" || subscriptionType === "admin";
  
  // Define features based on user role with correct order
  const features = isAdmin ? [
    // Admin users: Visual → Breath → Watch → Reflect
    {
      icon: <div className="h-10 w-10 bg-red-500 rounded-full" />,
      title: "Visual",
      description: "Meditate on the sense of sight",
      path: "/kasinas",
      color: "from-red-600 to-red-800",
    },
    {
      icon: <Waves className="h-10 w-10 text-blue-500" />,
      title: "Breath",
      description: "Breathing with the visual field",
      path: "/breath",
      color: "from-blue-600 to-blue-800",
    },
    {
      icon: <Monitor className="h-10 w-10" style={{ color: "#FFFF00" }} />,
      title: "Watch",
      description: "Guided meditations to accelerate learning",
      path: "/meditation",
      color: "from-yellow-400 to-yellow-600",
    },
    {
      icon: <PieChart className="h-10 w-10 text-white" />,
      title: "Reflect",
      description: "View your history & track your progress",
      path: "/reflection",
      color: "from-gray-300 to-gray-500",
    },
  ] : [
    // Regular users: Visual → Reflect
    {
      icon: <div className="h-10 w-10 bg-red-500 rounded-full" />,
      title: "Visual",
      description: "Meditate on the sense of sight",
      path: "/kasinas",
      color: "from-red-600 to-red-800",
    },
    {
      icon: <PieChart className="h-10 w-10 text-white" />,
      title: "Reflect",
      description: "View your history & track your progress",
      path: "/reflection",
      color: "from-gray-300 to-gray-500",
    },
  ];

  return (
    <Layout>
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Choose your Path</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="bg-gray-900 border-gray-700 cursor-pointer overflow-hidden transform transition-all hover:scale-102 hover:shadow-lg"
            onClick={() => navigate(feature.path)}
          >
            <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-gray-800">
                  {feature.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h2>
                  <p className="text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
};

export default HomePage;
