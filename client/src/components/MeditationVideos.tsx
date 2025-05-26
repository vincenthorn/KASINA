import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { YoutubeIcon } from "lucide-react";
import { apiRequest } from "../lib/api";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface Video {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

interface CommunitySubmission {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  embedId: string;
  createdAt: string;
  submittedBy: string;
}

const YouTubeEmbed: React.FC<{ embedId: string; title: string }> = ({ embedId, title }) => {
  return (
    <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${embedId}`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

// Introduction videos
const introductionVideos = [
  {
    id: "1",
    embedId: "E4a7FzJDjbk",
    title: "Introduction to Kasina Meditation",
    description: "Watch the basics of kasina meditation practice and its origins."
  },
  {
    id: "2",
    embedId: "syKikRHpZmw",
    title: "Benefits of Visual Meditation",
    description: "Discover how visual meditation can improve concentration and clarity."
  }
];

// Guided meditation videos
const guidedVideos = [
  {
    id: "1",
    embedId: "O-6f5wQXSu8",
    title: "20 Minute Guided Kasina Meditation",
    channelTitle: "Meditation Masters"
  },
  {
    id: "2",
    embedId: "tZVThPKiVMY",
    title: "Elemental Kasina Practice Guide",
    channelTitle: "Dharma Wisdom"
  },
  {
    id: "3",
    embedId: "M4GX2XZ1NxQ",
    title: "Fire Kasina Visualization",
    channelTitle: "Meditation Techniques"
  }
];

const MeditationVideos: React.FC = () => {
  const [communityVideos, setCommunityVideos] = useState<CommunitySubmission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submission, setSubmission] = useState({
    title: "",
    description: "",
    youtubeUrl: "",
  });

  useEffect(() => {
    // Fetch community videos when component mounts
    const fetchCommunityVideos = async () => {
      try {
        const response = await apiRequest("GET", "/api/community-videos", undefined);
        const data = await response.json();
        setCommunityVideos(data);
      } catch (error) {
        console.error("Failed to fetch community videos:", error);
        // Use sample data as fallback
        setCommunityVideos([
          {
            id: "1",
            title: "My Fire Kasina Experience",
            description: "A 15-minute journey with the fire kasina.",
            youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            embedId: "dQw4w9WgXcQ",
            createdAt: new Date().toISOString(),
            submittedBy: "user@example.com"
          },
          {
            id: "2",
            title: "Water Kasina Meditation",
            description: "Calming water visualization practice.",
            youtubeUrl: "https://www.youtube.com/watch?v=0ZNIQOO2sfA",
            embedId: "0ZNIQOO2sfA",
            createdAt: new Date().toISOString(),
            submittedBy: "meditator@example.com"
          },
          {
            id: "3",
            title: "Light Kasina Session",
            description: "Experience the brightness of light kasina practice.",
            youtubeUrl: "https://www.youtube.com/watch?v=VJrm8V5Ah3I",
            embedId: "VJrm8V5Ah3I",
            createdAt: new Date().toISOString(),
            submittedBy: "practitioner@example.com"
          },
          {
            id: "4",
            title: "Earth Kasina Daily Practice",
            description: "Finding stability through earth element meditation.",
            youtubeUrl: "https://www.youtube.com/watch?v=6h_BARSvBGw",
            embedId: "6h_BARSvBGw",
            createdAt: new Date().toISOString(),
            submittedBy: "grounded@example.com"
          }
        ]);
      }
    };

    fetchCommunityVideos();
  }, []);

  const extractYouTubeID = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate YouTube URL
    const embedId = extractYouTubeID(submission.youtubeUrl);
    if (!embedId) {
      toast.error("Please enter a valid YouTube URL");
      setIsSubmitting(false);
      return;
    }

    try {
      // Submit the video to the backend
      await apiRequest("POST", "/api/community-videos", {
        ...submission,
        embedId,
      });

      // Optimistically update the UI
      const newSubmission: CommunitySubmission = {
        id: Date.now().toString(),
        title: submission.title,
        description: submission.description,
        youtubeUrl: submission.youtubeUrl,
        embedId,
        createdAt: new Date().toISOString(),
        submittedBy: "You", // Will be replaced by actual user data on the server
      };

      setCommunityVideos([newSubmission, ...communityVideos]);
      
      // Reset form
      setSubmission({
        title: "",
        description: "",
        youtubeUrl: "",
      });
      setShowSubmissionForm(false);
      toast.success("Your meditation video has been submitted!");
    } catch (error) {
      console.error("Failed to submit video:", error);
      toast.error("Failed to submit video. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Meditation Resources</h2>
      
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Introduction to Kasina Practice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {introductionVideos.map((video) => (
              <Card key={video.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 space-y-4">
                  <YouTubeEmbed embedId={video.embedId} title={video.title} />
                  <h3 className="text-white font-semibold">{video.title}</h3>
                  <p className="text-gray-400 text-sm">{video.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Guided Meditations */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Guided Meditations</h2>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {guidedVideos.map((video) => (
                <Card key={video.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 space-y-4">
                    <YouTubeEmbed embedId={video.embedId} title={video.title} />
                    <div>
                      <h3 className="text-white font-semibold">{video.title}</h3>
                      <p className="text-gray-400 text-sm">{video.channelTitle}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Community Meditations */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Community Meditations</h2>
          
          {!showSubmissionForm && (
            <Button 
              onClick={() => setShowSubmissionForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <YoutubeIcon className="mr-2 h-4 w-4" />
              Submit Your Meditation
            </Button>
          )}
        </div>
        
        {showSubmissionForm && (
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Submit Your Meditation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm text-gray-400">Title</label>
                  <Input
                    id="title"
                    value={submission.title}
                    onChange={(e) => setSubmission({...submission, title: e.target.value})}
                    required
                    placeholder="Enter a title for your meditation"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="youtubeUrl" className="text-sm text-gray-400">YouTube URL</label>
                  <Input
                    id="youtubeUrl"
                    value={submission.youtubeUrl}
                    onChange={(e) => setSubmission({...submission, youtubeUrl: e.target.value})}
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm text-gray-400">Description</label>
                  <Textarea
                    id="description"
                    value={submission.description}
                    onChange={(e) => setSubmission({...submission, description: e.target.value})}
                    required
                    placeholder="Describe your meditation experience..."
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                
                <div className="flex space-x-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowSubmissionForm(false)}
                    className="border-gray-600 text-white"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Meditation"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6 space-y-6">
            {communityVideos.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400">No community meditations yet. Be the first to share yours!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {communityVideos.map((video) => (
                  <Card key={video.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4 space-y-4">
                      <YouTubeEmbed embedId={video.embedId} title={video.title} />
                      <div>
                        <h3 className="text-white font-semibold">{video.title}</h3>
                        <p className="text-gray-400 text-sm">{video.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MeditationVideos;
