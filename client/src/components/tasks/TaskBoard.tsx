import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@nextask/types';
import { Clock } from 'lucide-react';
import React from 'react';

import { mapPriorityToFrontend, mapStatusToFrontend } from '@/api/tasks.api';
import { Badge } from '@/components/ui/badge';

// ─── DND KANBAN COLUMN COMPONENT ──────────────────────────────────────────────
interface KanbanColumnProps {
  title: string;
  status: string;
  children: React.ReactNode;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, status, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col h-[calc(100vh-280px)] min-h-[450px] transition-colors duration-200 ${
        isOver ? 'bg-slate-850/60 border-blue-500/20' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase">{title}</h4>
      </div>
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">{children}</div>
    </div>
  );
};

// ─── DND KANBAN CARD COMPONENT ────────────────────────────────────────────────
interface KanbanCardProps {
  task: Task;
  onClick: () => void;
  readOnly?: boolean;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ task, onClick, readOnly }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: readOnly,
  });

  const style: React.CSSProperties = {
    transform: transform && !isDragging ? CSS.Transform.toString(transform) : undefined,
    opacity: isDragging ? 0.3 : 1,
  };

  const getPriorityBadgeStyle = (p: string) => {
    switch (p) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'MEDIUM':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-slate-800 text-slate-350 border-slate-700';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(readOnly ? {} : attributes)}
      {...(readOnly ? {} : listeners)}
      onClick={onClick}
      className={`bg-slate-950 border border-slate-855/80 p-4 rounded-xl shadow-sm hover:border-slate-800 transition-all select-none group ${
        readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      <div className="flex justify-between items-start mb-2.5">
        <Badge
          className={`${getPriorityBadgeStyle(task.priority)} text-[9px] font-bold border uppercase tracking-wider`}
        >
          {mapPriorityToFrontend(task.priority)}
        </Badge>
      </div>
      <h5 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-relaxed mb-3">
        {task.title}
      </h5>
      <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Target Date'}
        </span>
      </div>
    </div>
  );
};

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
  readOnly?: boolean;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onTaskClick,
  onStatusChange,
  readOnly = false,
}) => {
  const [activeTaskDrag, setActiveTaskDrag] = React.useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (e: DragStartEvent) => {
    if (readOnly) return;
    setActiveTaskDrag(tasks.find((t) => t.id === e.active.id) || null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTaskDrag(null);
    if (readOnly) return;
    const { active, over } = e;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as 'TODO' | 'IN_PROGRESS' | 'DONE';
    const taskObj = tasks.find((t) => t.id === taskId);

    if (taskObj && taskObj.status === newStatus) return;

    if (onStatusChange) {
      onStatusChange(taskId, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4">
        {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((status) => {
          const title = mapStatusToFrontend(status);
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <KanbanColumn key={status} title={title} status={status}>
              {columnTasks.map((t) => (
                <KanbanCard
                  key={t.id}
                  task={t}
                  onClick={() => onTaskClick(t)}
                  readOnly={readOnly || !t.permissions?.canEdit}
                />
              ))}
              {columnTasks.length === 0 && (
                <div className="text-center py-10 text-slate-600 text-xs italic">
                  No tasks in this lane.
                </div>
              )}
            </KanbanColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeTaskDrag ? (
          <div className="bg-slate-900 border border-blue-500/40 p-4 rounded-xl shadow-2xl opacity-90 w-72">
            <h5 className="text-xs font-semibold text-slate-200">{activeTaskDrag.title}</h5>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
