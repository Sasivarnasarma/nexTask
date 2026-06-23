import { Task } from '@nextask/types';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  Tag,
} from 'lucide-react';
import { useState } from 'react';

import { fetchTasks, mapPriorityToFrontend, mapStatusToFrontend } from '@/api/tasks.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectStore } from '@/store/project.store';

export function Calendar() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  // Calendar Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Selected task state for preview panel
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks for active project
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['calendar-tasks', activeProjectId],
    queryFn: () => (activeProjectId ? fetchTasks(activeProjectId) : Promise.resolve([])),
    enabled: !!activeProjectId,
  });

  // Calendar Helpers
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Day of week (0 = Sun)

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedTask(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedTask(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedTask(null);
  };

  // Generate calendar days grid (including padding from prev/next months)
  const calendarDays: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];

  // Padding from previous month
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(currentYear, currentMonth - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: new Date(currentYear, currentMonth, i),
      isCurrentMonth: true,
    });
  }

  // Padding for next month to complete the grid row (6 rows * 7 days = 42 cells)
  const totalCells = 42;
  const remainingCells = totalCells - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      date: new Date(currentYear, currentMonth + 1, i),
      isCurrentMonth: false,
    });
  }

  // Get tasks for a specific date cell
  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Priority color styling helper
  const getPriorityBadgeClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'LOW':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  // Status badge styling helper
  const getStatusBadgeClass = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 border-blue-500/30';
      case 'TODO':
      default:
        return 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/10 border-slate-500/30';
    }
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background text-foreground h-[80vh]">
        <div className="max-w-md space-y-4 p-8 border border-border rounded-xl bg-card shadow-sm">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
          <h2 className="text-xl font-bold">No Workspace Selected</h2>
          <p className="text-muted-foreground text-sm">
            Please select a project from the sidebar to visualize and schedule tasks on the
            interactive calendar scheduler.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-8 max-w-7xl mx-auto w-full text-foreground bg-background overflow-y-auto min-h-0">
      {/* Calendar Grid Container */}
      <div className="flex-1 flex flex-col space-y-4 min-w-0">
        {/* Calendar Header Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" /> Schedule Visualizer
            </h1>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Plotting tasks on their due dates for the current project.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              className="h-8 w-8 bg-background border-border hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-bold text-sm min-w-[120px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8 bg-background border-border hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 bg-background border-border hover:bg-muted ml-2 text-xs font-semibold"
            >
              Today
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading project scheduler...</span>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm flex-1 flex flex-col min-h-[500px]">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 bg-muted/50 border-b border-border text-center py-2 text-xs font-bold tracking-wider text-muted-foreground">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border border-l-0 border-t-0">
              {calendarDays.map((cell, index) => {
                const dayTasks = cell.date ? getTasksForDate(cell.date) : [];
                const isToday =
                  cell.date?.getDate() === new Date().getDate() &&
                  cell.date?.getMonth() === new Date().getMonth() &&
                  cell.date?.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={index}
                    className={`min-h-[90px] p-2 flex flex-col gap-1 transition-colors relative ${
                      cell.isCurrentMonth
                        ? 'bg-card hover:bg-muted/10'
                        : 'bg-muted/10 text-muted-foreground/40'
                    } ${isToday ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                  >
                    {/* Day Number */}
                    <span
                      className={`text-xs font-extrabold h-5 w-5 flex items-center justify-center rounded-full self-end ${
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : cell.isCurrentMonth
                            ? 'text-foreground'
                            : 'text-muted-foreground/30'
                      }`}
                    >
                      {cell.date ? cell.date.getDate() : ''}
                    </span>

                    {/* Day Tasks List */}
                    <div className="flex-1 overflow-y-auto space-y-1 max-h-[80px] custom-scrollbar">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => setSelectedTask(task)}
                          className={`w-full text-left truncate text-[10px] font-bold px-1.5 py-0.5 rounded border transition-transform hover:scale-[1.02] ${getPriorityBadgeClass(
                            task.priority,
                          )}`}
                          title={task.title}
                        >
                          {task.title}
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[9px] font-extrabold text-muted-foreground pl-1.5">
                          + {dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Task Preview Panel (Side panel) */}
      <div className="w-full lg:w-80 shrink-0">
        {selectedTask ? (
          <Card className="border-border bg-card shadow-sm sticky top-6 h-fit">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between gap-2">
                <Badge className={getPriorityBadgeClass(selectedTask.priority)}>
                  {mapPriorityToFrontend(selectedTask.priority)} Priority
                </Badge>
                <Badge variant="outline" className={getStatusBadgeClass(selectedTask.status)}>
                  {mapStatusToFrontend(selectedTask.status)}
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold mt-3 leading-tight">
                {selectedTask.title}
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-1 mt-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Due:{' '}
                {selectedTask.dueDate
                  ? new Date(selectedTask.dueDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'No due date'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4 text-sm">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Description
                </span>
                <p className="text-foreground text-xs leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                  {selectedTask.description || (
                    <span className="italic text-muted-foreground">No description provided.</span>
                  )}
                </p>
              </div>

              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Labels
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedTask.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-muted text-foreground border border-border/40 text-[10px] py-0.5 px-1.5 font-semibold"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.assignees && selectedTask.assignees.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Assignees ({selectedTask.assignees.length})
                  </span>
                  <div className="space-y-1.5">
                    {selectedTask.assignees.map((assignee) => (
                      <div
                        key={assignee.userId}
                        className="flex items-center gap-2 bg-muted/10 p-2 rounded-lg border border-border/30"
                      >
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-extrabold">
                          {(assignee.name || assignee.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">
                            {assignee.name || assignee.email}
                          </p>
                          {assignee.name && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {assignee.email}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={() => setSelectedTask(null)}
                className="w-full text-xs hover:bg-muted text-muted-foreground hover:text-foreground mt-2 border border-border/30"
              >
                Close Preview
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card shadow-sm text-center p-8 h-64 flex flex-col items-center justify-center gap-2 sticky top-6">
            <Info className="h-8 w-8 text-muted-foreground/60" />
            <CardTitle className="text-sm font-bold text-muted-foreground">Task Preview</CardTitle>
            <CardDescription className="text-xs max-w-[200px] mx-auto">
              Select any task card from the calendar grid to view description, assignees, and label
              details.
            </CardDescription>
          </Card>
        )}
      </div>
    </div>
  );
}
