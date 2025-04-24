import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import Logo from "./Logo";
import { PlayCircle, Video, BarChart3, Disc } from "lucide-react";

const Home = () => {
  const menuItems = [
    {
      title: "Freestyle",
      icon: <PlayCircle className="h-12 w-12 mb-4 text-blue-500" />,
      description: "Choose from 10 kasina orbs and meditate with timer controls",
      path: "/freestyle"
    },
    {
      title: "Meditation",
      icon: <Disc className="h-12 w-12 mb-4 text-purple-500" />,
      description: "Guided meditation videos and community resources",
      path: "/meditation"
    },
    {
      title: "Recording",
      icon: <Video className="h-12 w-12 mb-4 text-red-500" />,
      description: "Record your meditation sessions and manage recordings",
      path: "/recording"
    },
    {
      title: "Reflection",
      icon: <BarChart3 className="h-12 w-12 mb-4 text-green-500" />,
      description: "View your practice history and statistics",
      path: "/reflection"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-10 flex flex-col items-center">
      <div className="text-center mb-12">
        <Logo className="h-24 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-2">Welcome to KASINA</h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto">
          Deepen your concentration using traditional kasina practices rendered as dynamic 3D visual orbs
        </p>
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
