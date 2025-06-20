import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { format } from "date-fns";
import { useKasina } from "../lib/stores/useKasina";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import ConfirmationDialog from "./ConfirmationDialog";
import { apiRequest } from "../lib/api";
import { toast } from "sonner";

interface Session {
  id: string;
  kasinaType: string;
  kasinaName: string;
  duration: number;
  timestamp: string;
}

interface PracticeLogProps {
  sessions: Session[];
  selectedKasinaType: string | null;
  onSessionDeleted?: () => void;
}

// Initial number of sessions to display
const INITIAL_DISPLAY_COUNT = 12;
// Number of additional sessions to load when "Load More" is clicked
const LOAD_INCREMENT = 6;

const PracticeLog: React.FC<PracticeLogProps> = ({ sessions, selectedKasinaType, onSessionDeleted }) => {
  const { getKasinaEmoji } = useKasina();
  // State to track how many sessions to display
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Sort sessions by timestamp (newest first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Debug logging to compare with chart data
  console.log('📝 Practice Log - Total sessions:', sessions.length);
  console.log('📝 Practice Log - First 5 sessions:', sessions.slice(0, 5).map(s => ({
    id: s.id,
    kasinaType: s.kasinaType,
    kasinaName: s.kasinaName,
    duration: s.duration,
    timestamp: s.timestamp
  })));

  // Function to load more sessions
  const handleLoadMore = () => {
    setDisplayCount(prevCount => prevCount + LOAD_INCREMENT);
  };

  // Handle delete session
  const handleDeleteClick = (session: Session) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await apiRequest("DELETE", `/api/sessions/${sessionToDelete.id}`, undefined);
      
      if (response.ok) {
        toast.success("Session deleted successfully");
        onSessionDeleted?.(); // Trigger refresh of sessions
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  // Prioritize and sort sessions based on selectedKasinaType
  const prioritizedSessions = useMemo(() => {
    if (!selectedKasinaType) {
      // If no kasina type is selected, just return the chronologically sorted sessions
      return sortedSessions;
    }

    // Check if this is a category filter (e.g., 'category:color' or 'category:color+white')
    if (selectedKasinaType.startsWith('category:')) {
      // Define which kasina types belong to each category
      const colorKasinas = ['white', 'blue', 'red', 'yellow', 'custom'];
      const elementalKasinas = ['water', 'air', 'fire', 'earth', 'space', 'light'];
      const vajrayanaKasinas = ['clear_light_thigle', 'om_kasina', 'ah_kasina', 'hum_kasina', 'white_a_kasina', 'rainbow_kasina'];
      const breathKasinas = ['breath'];
      
      // Parse the selection to check for compound format (category + specific type)
      const parts = selectedKasinaType.substring(9).split('+'); // Remove 'category:' prefix and split
      const category = parts[0]; // The first part is always the category
      const specificType = parts.length > 1 ? parts[1] : null; // Check if there's a specific type
      
      // First filter by category
      let categoryFilteredSessions;
      if (category === 'color') {
        categoryFilteredSessions = sortedSessions.filter(session => colorKasinas.includes(session.kasinaType));
      } else if (category === 'elemental') {
        categoryFilteredSessions = sortedSessions.filter(session => elementalKasinas.includes(session.kasinaType));
      } else if (category === 'vajrayana') {
        categoryFilteredSessions = sortedSessions.filter(session => vajrayanaKasinas.includes(session.kasinaType));
      } else if (category === 'breath') {
        categoryFilteredSessions = sortedSessions.filter(session => breathKasinas.includes(session.kasinaType));
      } else {
        // Fallback to all sessions if category doesn't match
        categoryFilteredSessions = sortedSessions;
      }
      
      // If we also have a specific type, prioritize that type within the category
      if (specificType) {
        const matchingSessions = categoryFilteredSessions.filter(
          session => session.kasinaType === specificType
        );
        const nonMatchingSessions = categoryFilteredSessions.filter(
          session => session.kasinaType !== specificType
        );
        
        // Return matching sessions first, followed by other sessions from the same category
        return [...matchingSessions, ...nonMatchingSessions];
      }
      
      // If no specific type, just return the category-filtered sessions
      return categoryFilteredSessions;
    }

    // For specific kasina type selection (not a category)
    // Split the sessions into matching and non-matching groups
    const matchingSessions = sortedSessions.filter(
      session => session.kasinaType === selectedKasinaType
    );
    const nonMatchingSessions = sortedSessions.filter(
      session => session.kasinaType !== selectedKasinaType
    );

    // Return matching sessions first, followed by non-matching sessions
    return [...matchingSessions, ...nonMatchingSessions];
  }, [sortedSessions, selectedKasinaType]);
  
  // Get only the sessions to be displayed
  const sessionsToDisplay = prioritizedSessions.slice(0, displayCount);
  
  // Determine if there are more sessions to load
  const hasMoreSessions = displayCount < prioritizedSessions.length;

  if (prioritizedSessions.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Practice Log</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">No meditation sessions recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700 shadow-xl">
      <CardHeader className="border-b border-gray-700 pb-4">
        <CardTitle className="text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Practice Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* For desktop, use a grid layout to show sessions side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionsToDisplay.map((session) => (
              <div 
                key={session.id} 
                className={`group relative flex items-center p-4 transition-colors rounded-lg border ${
                  // Check if we should highlight this session
                  // 1. Direct match with the kasinaType
                  // 2. Compound selection with this kasinaType
                  (selectedKasinaType === session.kasinaType || 
                   (selectedKasinaType?.includes('+') && 
                    selectedKasinaType.split('+')[1] === session.kasinaType))
                    ? 'bg-gray-700 border-indigo-500 shadow-lg shadow-indigo-900/20'
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                }`}
              >
                {/* Subtle delete button - only visible on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(session);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white"
                  title="Delete session"
                  disabled={isDeleting}
                >
                  <Trash2 size={12} />
                </button>
                <div 
                  className={`text-3xl mr-4 p-2 rounded-full flex items-center justify-center h-12 w-12 flex-shrink-0 transition-all ${
                    (selectedKasinaType === session.kasinaType || 
                     (selectedKasinaType?.includes('+') && 
                      selectedKasinaType.split('+')[1] === session.kasinaType))
                      ? 'bg-indigo-600 scale-110 shadow-lg shadow-indigo-900/30' 
                      : 'bg-gray-700'
                  }`}
                  title={`${session.kasinaType.charAt(0).toUpperCase() + session.kasinaType.slice(1)} Kasina`}
                >
                  {getKasinaEmoji(session.kasinaType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center flex-wrap">
                    <div className="mr-2">
                      <h3 className={`font-semibold text-lg leading-tight truncate ${
                        selectedKasinaType === session.kasinaType 
                          ? 'text-indigo-300' 
                          : 'text-white'
                      }`}>
                        {session.kasinaName || (session.kasinaType === 'clear_light_thigle' 
                          ? 'Clear Light Kasina'
                          : session.kasinaType.includes('kasina')
                            ? session.kasinaType.charAt(0).toUpperCase() + session.kasinaType.slice(1).replace(/_/g, ' ')
                            : session.kasinaType.charAt(0).toUpperCase() + session.kasinaType.slice(1).replace(/_/g, ' ') + ' Kasina'
                        )}
                      </h3>
                      <p className="text-gray-500 text-sm mt-0.5">{format(new Date(session.timestamp), 'PPp')}</p>
                    </div>
                    <div className="mt-1">
                      <span className="text-white font-semibold bg-indigo-700 hover:bg-indigo-600 px-4 py-1 rounded-full text-base inline-flex items-center justify-center shadow-sm transition-colors min-w-[60px]">
                        <span className="font-mono">{Math.round(session.duration / 60)}</span>
                        <span className="ml-0.5">min</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {hasMoreSessions && (
            <div className="pt-4 text-center">
              <Button 
                onClick={handleLoadMore}
                variant="outline"
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600 transition-colors"
              >
                Load More ({sortedSessions.length - displayCount} remaining)
              </Button>
            </div>
          )}
          
          {!hasMoreSessions && sortedSessions.length > INITIAL_DISPLAY_COUNT && (
            <p className="text-center text-gray-500 text-sm pt-4">
              Showing all {sortedSessions.length} sessions
            </p>
          )}
        </div>
      </CardContent>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Session"
        message={`Are you sure you want to delete this ${sessionToDelete?.kasinaName || sessionToDelete?.kasinaType} session from your log? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </Card>
  );
};

export default PracticeLog;
