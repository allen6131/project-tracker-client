import React from 'react';
import Calendar from '../components/Calendar';

const CalendarPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h2>
        <p className="text-gray-600 dark:text-gray-400">View tasks organized by due date</p>
      </div>
      <Calendar />
    </div>
  );
};

export default CalendarPage; 