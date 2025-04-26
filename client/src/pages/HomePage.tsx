import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { Flame, Video, BookOpen, BarChart } from "lucide-react";
import Logo from "../components/Logo";
import { useAuth } from "../lib/stores/useAuth";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { email } = useAuth();
  
  // Check if user is admin
  const isAdmin = email === "admin@kasina.app";
  
  // Features available to all users
  const baseFeatures = [
    {
      icon: <Flame className="h-10 w-10 text-orange-500" />,
      title: "Freestyle",
      description: "Choose from 10 different orbs and customize your meditation practice.",
      path: "/freestyle",
      color: "from-orange-600 to-orange-800",
    },
    {
      icon: <BarChart className="h-10 w-10 text-green-500" />,
      title: "Reflection",
      description: "Track your practice progress and view your meditation history.",
      path: "/reflection",
      color: "from-green-600 to-green-800",
    },
  ];
  
  // Features only available to admin users
  const adminFeatures = [
    {
      icon: <BookOpen className="h-10 w-10 text-purple-500" />,
      title: "Meditation",
      description: "Learn with guided meditations and community resources.",
      path: "/meditation",
      color: "from-purple-600 to-purple-800",
    },
    {
      icon: <Video className="h-10 w-10 text-blue-500" />,
      title: "Recording",
      description: "Record your meditation sessions to revisit and share your practice.",
      path: "/recording",
      color: "from-blue-600 to-blue-800",
    },
  ];
  
  // Combine features based on user role
  const features = [
    ...baseFeatures,
    ...(isAdmin ? adminFeatures : [])
  ];

  return (
    <Layout>
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Welcome to KASINA</h1>
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
                <div className="p-3 rounded-lg bg-gray-800">
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
