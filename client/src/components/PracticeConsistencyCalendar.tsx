import React from 'react';

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
  
  // Get first day of the month and number of days in month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  
  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Create a map of dates to total practice minutes for the current month
  const practiceByDate = new Map<number, number>();
  
  sessions.forEach(session => {
    const sessionDate = new Date(session.timestamp);
    if (sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear) {
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
    const isPastDay = day < today;
    const isToday = day === today;
    const isFutureDay = day > today;
    
    let content = null;
    let bgColor = 'bg-gray-700/50';
    let textColor = 'text-gray-400';
    
    if (isFutureDay) {
      // Future days: no mark
      content = day;
      bgColor = 'bg-gray-800/30';
      textColor = 'text-gray-500';
    } else if (isToday) {
      // Today: show checkmark if they've practiced, otherwise just the number
      if (hasMinimumPractice) {
        content = '✅';
        bgColor = 'bg-green-600/20';
        textColor = 'text-green-400';
      } else {
        content = day;
        bgColor = 'bg-gray-700/50';
        textColor = 'text-gray-300';
      }
    } else if (isPastDay) {
      // Past days: checkmark or X
      if (hasMinimumPractice) {
        content = '✅';
        bgColor = 'bg-green-600/20';
        textColor = 'text-green-400';
      } else {
        content = '❌';
        bgColor = 'bg-red-600/20';
        textColor = 'text-red-400';
      }
    }
    
    calendarDays.push(
      <div
        key={day}
        className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-medium ${bgColor} ${textColor} transition-colors`}
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
      {/* Header with month and streak */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-white">
          {monthNames[currentMonth]} {currentYear}
        </h4>
        <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-2 rounded-lg border border-orange-500/30">
          <span className="text-orange-400 text-lg">🔥</span>
          <div className="text-right">
            <div className="text-lg font-bold text-orange-400">{currentStreak}</div>
            <div className="text-xs text-orange-300">day streak</div>
          </div>
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
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-xs text-gray-400 pt-2 border-t border-gray-700/50">
        <div className="flex items-center space-x-2">
          <span>✅</span>
          <span>1+ minute practiced</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>❌</span>
          <span>No practice</span>
        </div>
      </div>
    </div>
  );
};

export default PracticeConsistencyCalendar;