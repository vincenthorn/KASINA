import React from "react";
import { Card, CardContent } from "./ui/card";
import { PlayCircle } from "lucide-react";

// The 9 Jhāna videos in order
const jhanaVideos = [
  {
    id: "1",
    embedId: "rP0S2X1z7tk",
    title: "What is Jhāna?",
    description: "Introduction to the practice of Jhāna meditation"
  },
  {
    id: "2",
    embedId: "t_LyYdlbXko",
    title: "Access Concentration",
    description: "Understanding the gateway to deeper states"
  },
  {
    id: "3",
    embedId: "KctjGQCkIgE",
    title: "What is Access Concentration?",
    description: "Detailed exploration of access concentration"
  },
  {
    id: "4",
    embedId: "YnVG2DMPggQ",
    title: "The Jhāna Matrix",
    description: "Mapping the landscape of absorption states"
  },
  {
    id: "5",
    embedId: "jMj-2OJZkL8",
    title: "The Flavors of Jhāna",
    description: "Different qualities and characteristics of Jhānas"
  },
  {
    id: "6",
    embedId: "wxz_6wZsXB8",
    title: "The Vipassana Jhānas",
    description: "Insight meditation and the Jhānas"
  },
  {
    id: "7",
    embedId: "PmUw8bdJzCY",
    title: "The 1st Vipassana Jhāna",
    description: "Deep dive into the first Vipassana Jhāna"
  },
  {
    id: "8",
    embedId: "vcNTTSg6zcg",
    title: "The 9th Jhāna",
    description: "Exploring the highest absorption state"
  },
  {
    id: "9",
    embedId: "im-A6EN-TBo",
    title: "Busting the Jhānas",
    description: "Common misconceptions and clarifications"
  }
];

const YouTubeCard: React.FC<{ video: typeof jhanaVideos[0] }> = ({ video }) => {
  const videoUrl = `https://www.youtube.com/watch?v=${video.embedId}`;
  
  // Use gradient backgrounds for visual variety
  const gradients = [
    "from-purple-600 to-indigo-600",
    "from-indigo-600 to-blue-600",
    "from-blue-600 to-cyan-600",
    "from-cyan-600 to-teal-600",
    "from-teal-600 to-green-600",
    "from-green-600 to-emerald-600",
    "from-emerald-600 to-purple-600",
    "from-purple-600 to-pink-600",
    "from-pink-600 to-purple-600"
  ];
  
  const gradientIndex = parseInt(video.id) - 1;
  const gradient = gradients[gradientIndex % gradients.length];

  return (
    <a 
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="relative overflow-hidden rounded-lg">
        {/* Gradient Background with Play Icon */}
        <div className={`relative aspect-video bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          {/* YouTube Logo/Icon */}
          <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
            YouTube
          </div>
          
          {/* Central Play Button */}
          <div className="flex flex-col items-center justify-center text-white">
            <PlayCircle className="w-20 h-20 mb-3 opacity-90 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-sm font-medium opacity-80">Click to watch</span>
          </div>
          
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`
            }}></div>
          </div>
        </div>
      </div>
    </a>
  );
};

const MeditationVideos: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Watch & Learn
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Explore the depths of Jhāna meditation through these comprehensive teachings
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Click any video to watch on YouTube
        </p>
      </div>

      {/* Video Grid - Responsive: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jhanaVideos.map((video) => (
          <Card 
            key={video.id} 
            className="bg-gray-900 border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300"
          >
            <CardContent className="p-0">
              {/* Video Card */}
              <YouTubeCard video={video} />
              
              {/* Video Info */}
              <div className="p-4">
                <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                  {video.title}
                </h3>
                <p className="text-gray-400 text-sm line-clamp-2">
                  {video.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm">
          These teachings are freely available to support your meditation journey
        </p>
      </div>
    </div>
  );
};

export default MeditationVideos;