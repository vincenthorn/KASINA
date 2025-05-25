import React, { useState } from 'react';

interface Session {
  id: string;
  kasinaType: string;
  kasinaName: string;
  duration: number;
  timestamp: string;
}

interface PracticeConsistencyCalendarProps {
  sessions: Session[];
}

const PracticeConsistencyCalendar: React.FC<PracticeConsistencyCalendarProps> = ({ sessions }) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const today = now.getDate();
  
  // State for which month to display
  const [displayMonth, setDisplayMonth] = useState({ 
    month: currentMonth, 
    year: currentYear 
  });
  
  // Get first day of the month and number of days in month for display month
  const firstDayOfMonth = new Date(displayMonth.year, displayMonth.month, 1);
  const lastDayOfMonth = new Date(displayMonth.year, displayMonth.month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  
  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Create a map of dates to total practice minutes for the display month
  const practiceByDate = new Map<number, number>();
  
  sessions.forEach(session => {
    const sessionDate = new Date(session.timestamp);
    if (sessionDate.getMonth() === displayMonth.month && sessionDate.getFullYear() === displayMonth.year) {
      const day = sessionDate.getDate();
      const currentMinutes = practiceByDate.get(day) || 0;
      practiceByDate.set(day, currentMinutes + Math.floor(session.duration / 60));
    }
  });

  // Calculate current streak
  const calculateStreak = () => {
    let streak = 0;
    let checkDate = new Date(now);
    
    // Start from today and go backwards
    while (true) {
      const day = checkDate.getDate();
      const month = checkDate.getMonth();
      const year = checkDate.getFullYear();
      
      // Check if this date has practice
      let dayHasPractice = false;
      
      if (month === currentMonth && year === currentYear) {
        // Current month - check our practiceByDate map
        dayHasPractice = (practiceByDate.get(day) || 0) >= 1;
      } else {
        // Different month - check sessions directly
        dayHasPractice = sessions.some(session => {
          const sessionDate = new Date(session.timestamp);
          return sessionDate.getDate() === day && 
                 sessionDate.getMonth() === month && 
                 sessionDate.getFullYear() === year &&
                 Math.floor(session.duration / 60) >= 1;
        });
      }
      
      if (dayHasPractice) {
        streak++;
      } else {
        break;
      }
      
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1);
      
      // Stop if we've gone back too far (reasonable limit)
      if (streak > 365) break;
    }
    
    return streak;
  };
  
  const currentStreak = calculateStreak();
  
  // Generate calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(
      <div key={`empty-${i}`} className="h-10 w-10"></div>
    );
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const practiceMinutes = practiceByDate.get(day) || 0;
    const hasMinimumPractice = practiceMinutes >= 1;
    
    // Check if this day is in the current month/year and compare to today
    const isCurrentMonth = displayMonth.month === currentMonth && displayMonth.year === currentYear;
    const isPastDay = !isCurrentMonth || (isCurrentMonth && day < today);
    const isToday = isCurrentMonth && day === today;
    const isFutureDay = isCurrentMonth && day > today;
    
    let content = null;
    let bgColor = 'bg-gray-700';
    let textColor = 'text-gray-400';
    
    if (isFutureDay) {
      // Future days in current month: no mark, neutral background
      content = day;
      bgColor = 'bg-gray-700';
      textColor = 'text-gray-400';
    } else if (isToday) {
      // Today: show checkmark if they've practiced, otherwise just the number
      if (hasMinimumPractice) {
        content = '✅';
        bgColor = 'bg-green-600';
        textColor = 'text-white';
      } else {
        content = day;
        bgColor = 'bg-gray-700';
        textColor = 'text-gray-300';
      }
    } else {
      // Past days (including all days in past months): checkmark or X with full background colors
      if (hasMinimumPractice) {
        content = '✅';
        bgColor = 'bg-green-600';
        textColor = 'text-white';
      } else {
        content = '❎';
        bgColor = 'bg-red-600';
        textColor = 'text-white';
      }
    }
    
    calendarDays.push(
      <div
        key={day}
        className={`h-12 w-full aspect-square rounded-md flex items-center justify-center text-sm font-medium ${bgColor} ${textColor} transition-colors border border-gray-600`}
        title={
          practiceMinutes > 0 
            ? `${practiceMinutes} minute${practiceMinutes !== 1 ? 's' : ''} practiced`
            : isPastDay 
              ? 'No practice this day'
              : isToday
                ? 'Today'
                : ''
        }
      >
        {content}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Month header - properly centered with extra top spacing */}
      <div className="text-center mb-4 mt-6">
        <div className="flex items-center justify-center space-x-4">
          <button 
            onClick={() => setDisplayMonth(prev => ({ 
              month: prev.month === 0 ? 11 : prev.month - 1, 
              year: prev.month === 0 ? prev.year - 1 : prev.year 
            }))}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            ‹
          </button>
          <h4 className="text-lg font-medium text-white min-w-[140px]">
            {monthNames[displayMonth.month]} {displayMonth.year}
          </h4>
          <button 
            onClick={() => setDisplayMonth(prev => ({ 
              month: prev.month === 11 ? 0 : prev.month + 1, 
              year: prev.month === 11 ? prev.year + 1 : prev.year 
            }))}
            className="text-gray-400 hover:text-white transition-colors p-1"
            disabled={displayMonth.year > currentYear || (displayMonth.year === currentYear && displayMonth.month >= currentMonth)}
          >
            ›
          </button>
        </div>
      </div>
      
      {/* Day names header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays}
      </div>
      
      {/* Bottom cards row */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {/* Streak card */}
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 flex items-center justify-center mb-1">
              <span className="text-orange-400 text-2xl mr-2">🔥</span>
              {currentStreak}
            </div>
            <div className="text-sm text-orange-300">day streak</div>
          </div>
        </div>
        
        {/* Placeholder card 1 */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400 mb-1">-</div>
            <div className="text-sm text-gray-500">Coming Soon</div>
          </div>
        </div>
        
        {/* Placeholder card 2 */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400 mb-1">-</div>
            <div className="text-sm text-gray-500">Coming Soon</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeConsistencyCalendar;