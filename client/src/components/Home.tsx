import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import Logo from "./Logo";
import { PlayCircle, BarChart3 } from "lucide-react";

const Home = () => {
  
  // Base menu items visible to all users
  const baseMenuItems = [
    {
      title: "Kasinas",
      icon: <PlayCircle className="h-12 w-12 mb-4 text-blue-500" />,
      description: "Choose from 10 orbs and meditate with timer controls",
      path: "/kasinas"
    },
    {
      title: "Reflection",
      icon: <BarChart3 className="h-12 w-12 mb-4 text-green-500" />,
      description: "View your practice history and statistics",
      path: "/reflection"
    }
  ];
  
  const menuItems = baseMenuItems;

  return (
    <div className="container mx-auto px-4 py-10 flex flex-col items-center">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Welcome to KASINA</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        {menuItems.map((item, index) => (
          <Link to={item.path} key={index}>
            <Card className="h-full bg-gray-800 text-white border-gray-700 hover:bg-gray-700 transition-colors">
              <CardContent className="p-6 text-center flex flex-col items-center justify-center">
                {item.icon}
                <h2 className="text-xl font-bold mb-2">{item.title}</h2>
                <p className="text-gray-300">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;
