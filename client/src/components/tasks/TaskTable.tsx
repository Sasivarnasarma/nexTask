import React from 'react';
import { Task, Project } from '@nextask/types';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mapStatusToFrontend, mapPriorityToFrontend } from '@/api/tasks.api';

interface TaskTableProps {
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({ tasks, projects, onTaskClick }) => {
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

  const getStatusBadgeStyle = (s: string) => {
    switch (s) {
      case 'TODO':
        return 'bg-slate-850 text-slate-400 border-slate-700';
      case 'IN_PROGRESS':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'DONE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-800 text-slate-350 border-slate-700';
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-950/40 border-b border-slate-800/60">
          <TableRow>
            <TableHead className="text-slate-350 text-xs font-bold pl-6">Task Title</TableHead>
            <TableHead className="text-slate-350 text-xs font-bold">Project</TableHead>
            <TableHead className="text-slate-350 text-xs font-bold">Priority</TableHead>
            <TableHead className="text-slate-350 text-xs font-bold">Status</TableHead>
            <TableHead className="text-slate-350 text-xs font-bold">Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-slate-550 text-xs italic">
                No tasks found matching criteria.
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((t) => {
              const proj = projects.find((p) => p.id === t.projectId);
              return (
                <TableRow
                  key={t.id}
                  onClick={() => onTaskClick(t)}
                  className="hover:bg-slate-855/20 border-b border-slate-800/60 cursor-pointer transition-colors"
                >
                  <TableCell className="font-semibold text-slate-100 pl-6 py-4">{t.title}</TableCell>
                  <TableCell className="text-slate-350 text-xs">{proj?.name || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge className={`${getPriorityBadgeStyle(t.priority)} text-[9px] uppercase tracking-wider border`}>
                      {mapPriorityToFrontend(t.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadgeStyle(t.status)} border text-[10px]`}>
                      {mapStatusToFrontend(t.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No Target Date'}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
