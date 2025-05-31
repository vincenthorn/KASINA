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
    
    // Check for hard crashes (visual mode was active but no clean exit)
    const wasVisualModeActive = localStorage.getItem('visualModeActive');
    const visualModeStartTime = localStorage.getItem('visualModeStartTime');
    
    if (wasVisualModeActive === 'true') {
      const startTime = visualModeStartTime ? parseInt(visualModeStartTime) : Date.now();
      const sessionDuration = Math.round((Date.now() - startTime) / 1000);
      console.error('HARD CRASH DETECTED: Visual mode was active but did not exit cleanly');
      console.error(`Session lasted approximately ${sessionDuration} seconds before crash`);
      
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
