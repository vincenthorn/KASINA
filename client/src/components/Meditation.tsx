import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

// Introduction video data
const introVideos = [
  {
    id: "video1",
    title: "Introduction to Kasina",
    description: "Watch the basics of kasina meditation practice",
    embedId: "UkQIh3XYzIw", // Example ID, replace with actual YouTube video IDs
  },
  {
    id: "video2",
    title: "History of Kasina Practice",
    description: "Explore the ancient origins of kasina meditation",
    embedId: "Q7GUwIwvIxM", // Example ID
  },
  {
    id: "video3",
    title: "Benefits of Kasina",
    description: "Discover the transformative effects of kasina practice",
    embedId: "FX7mMRpSwLY", // Example ID
  },
];

// Guided meditation data
const guidedVideos = [
  {
    id: "guided1",
    title: "Blue Kasina Guided Meditation",
    duration: "20 min",
    embedId: "xfNnF7j-VRs", // Example ID
  },
  {
    id: "guided2",
    title: "Fire Kasina Practice",
    duration: "15 min",
    embedId: "eZX38UVkS5k", // Example ID
  },
  {
    id: "guided3",
    title: "Earth Kasina for Grounding",
    duration: "30 min",
    embedId: "7H9BOA_tIhM", // Example ID
  },
];

// Community meditation data
const communityVideos = [
  {
    id: "community1",
    title: "Water Kasina Experience",
    author: "Meditator123",
    date: "2023-04-15",
    embedId: "_7i9TS-8HUY", // Example ID
  },
  {
    id: "community2",
    title: "Space Kasina Journey",
    author: "ZenPractitioner",
    date: "2023-05-22",
    embedId: "9NaDAv3Cg3U", // Example ID
  },
];

const Meditation = () => {
  const [activeTab, setActiveTab] = useState("introduction");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Meditation Resources</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="introduction">Introduction</TabsTrigger>
          <TabsTrigger value="guided">Guided Meditations</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>
        
        <TabsContent value="introduction" className="mt-0">
          <h2 className="text-2xl font-semibold mb-6">Introduction to Kasina Practice</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {introVideos.map((video) => (
              <Card key={video.id} className="bg-gray-800 text-white border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{video.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video mb-4">
                    <iframe
                      className="w-full h-full rounded"
                      src={`https://www.youtube.com/embed/${video.embedId}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <p className="text-sm text-gray-300">{video.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="guided" className="mt-0">
          <h2 className="text-2xl font-semibold mb-6">Curated Guided Meditations</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {guidedVideos.map((video) => (
              <Card key={video.id} className="bg-gray-800 text-white border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between">
                    <span>{video.title}</span>
                    <span className="text-sm text-gray-400">{video.duration}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video">
                    <iframe
                      className="w-full h-full rounded"
                      src={`https://www.youtube.com/embed/${video.embedId}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="community" className="mt-0">
          <h2 className="text-2xl font-semibold mb-6">Community Generated Meditations</h2>
          {communityVideos.length === 0 ? (
            <Card className="bg-gray-800 text-white border-gray-700 p-8 text-center">
              <p>No community meditations available yet. Record your own session to share!</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {communityVideos.map((video) => (
                <Card key={video.id} className="bg-gray-800 text-white border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{video.title}</CardTitle>
                    <div className="text-sm text-gray-400">
                      By {video.author} • {new Date(video.date).toLocaleDateString()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video">
                      <iframe
                        className="w-full h-full rounded"
                        src={`https://www.youtube.com/embed/${video.embedId}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Meditation;
