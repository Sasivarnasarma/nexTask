import React, { useState } from 'react';
import { Task } from '@nextask/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TaskCalendarProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const TaskCalendar: React.FC<TaskCalendarProps> = ({ tasks, onTaskClick }) => {
  const [calendarDate, setCalendarDate] = useState(new Date());

  const getDaysInMonth = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  return (
    <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">
          {calendarDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-950 border-slate-850 h-8 text-xs font-semibold rounded-xl text-slate-300 hover:text-white"
            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-950 border-slate-850 h-8 text-xs font-semibold rounded-xl text-slate-300 hover:text-white"
            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase mb-3">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="grid grid-cols-7 gap-2.5">
        {getDaysInMonth().map((day, idx) => {
          const dayTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === day.toDateString());
          return (
            <div
              key={idx}
              className="min-h-24 bg-slate-950 border border-slate-855/50 rounded-xl p-2.5 flex flex-col gap-1.5 transition-colors hover:border-slate-800"
            >
              <span className="text-[10px] font-bold text-slate-500 self-end">{day.getDate()}</span>
              <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-none">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    className="bg-blue-600/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-bold truncate cursor-pointer hover:bg-blue-600/20"
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
