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
  const thumbnailUrl = `https://img.youtube.com/vi/${video.embedId}/hqdefault.jpg`;
  const videoUrl = `https://www.youtube.com/watch?v=${video.embedId}`;

  return (
    <a 
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="relative overflow-hidden rounded-lg bg-gray-800">
        {/* Thumbnail Image */}
        <div className="relative aspect-video">
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-all duration-300">
            <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
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