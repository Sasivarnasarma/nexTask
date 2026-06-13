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
import { Task, UpdateTaskRequest } from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  Filter,
  Folder,
  LayoutGrid,
  List,
  MessageSquare,
  Moon,
  Paperclip,
  Plus,
  Search,
  Send,
  Sun,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  createTaskAttachment,
  deleteAttachment,
  getPresignedUploadUrl,
  uploadFileToS3,
} from '../api/attachments.api';
import { deleteComment, fetchComments, postComment } from '../api/comments.api';
import { fetchUserProjects } from '../api/profile.api';
import {
  addProjectMember,
  assignTaskUser,
  fetchProjectMembers,
  fetchTeamMembersAutocomplete,
  removeProjectMember,
  unassignTaskUser,
  updateProjectMemberRole,
} from '../api/projects.api';
import {
  createTask,
  deleteTask,
  fetchTaskById,
  fetchTasks,
  mapPriorityToBackend,
  mapPriorityToFrontend,
  mapStatusToBackend,
  mapStatusToFrontend,
  updateTask,
} from '../api/tasks.api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/auth.store';
import { useProjectStore } from '../store/project.store';
import { useToastStore } from '../store/toast.store';

export interface FrontendTask extends Omit<Task, 'priority' | 'status'> {
  priority: string;
  status: string;
}

// ─── Kanban Column Component ──────────────────────────────────────────────────

function KanbanColumn({
  title,
  status,
  children,
}: {
  title: string;
  status: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const bgClass = isOver
    ? 'bg-muted border-2 border-primary border-dashed'
    : 'bg-muted/50 border-2 border-transparent';
  const headerColor =
    status === 'To Do'
      ? 'text-muted-foreground'
      : status === 'In Progress'
        ? 'text-blue-500'
        : 'text-emerald-500';

  return (
    <div
      ref={setNodeRef}
      className={`w-80 shrink-0 rounded-xl p-4 flex flex-col transition-all ${bgClass}`}
    >
      <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${headerColor}`}>{title}</h2>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 pr-4 min-h-[200px]">{children}</div>
      </ScrollArea>
    </div>
  );
}

// ─── Task Card Component ───────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: FrontendTask; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        onClick={onClick}
        className="bg-card border-border text-card-foreground cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm"
      >
        <CardHeader className="p-4">
          <div className="flex justify-between items-start mb-2">
            <Badge
              variant={
                task.priority === 'High'
                  ? 'destructive'
                  : task.priority === 'Medium'
                    ? 'default'
                    : 'secondary'
              }
            >
              {task.priority}
            </Badge>
            <span className="text-muted-foreground text-xs">
              #{task.id.substring(0, 8) || task.id}
            </span>
          </div>
          <CardTitle className="text-sm font-medium leading-snug">{task.title}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

// ─── Main Dashboard Page ───────────────────────────────────────────────────────

export function Dashboard() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const user = useAuthStore((s) => s.user);
  const [activeTask, setActiveTask] = useState<FrontendTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<FrontendTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
  });
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Global Project Switcher store
  const { activeProjectId, setActiveProjectId } = useProjectStore();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Project Members management console states
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedAutocompleteUser, setSelectedAutocompleteUser] = useState<any | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<'PROJECT_MANAGER' | 'COLLABORATOR'>(
    'COLLABORATOR',
  );

  // ─── Project & Task Queries ────────────────────────────────────────────────

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchUserProjects,
  });

  const activeProjectIdResolved = activeProjectId || projects[0]?.id || null;

  React.useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  }, [activeProjectId, projects, setActiveProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectIdResolved);

  // Fetch project members list
  const { data: projectMembers = [], refetch: refetchMembers } = useQuery({
    queryKey: ['project-members', activeProjectIdResolved],
    queryFn: () => fetchProjectMembers(activeProjectIdResolved!),
    enabled: !!activeProjectIdResolved,
  });

  // Autocomplete team members search
  const { data: autocompleteUsers = [] } = useQuery({
    queryKey: ['autocomplete-users', activeProjectIdResolved, memberSearch],
    queryFn: () => fetchTeamMembersAutocomplete(activeProjectIdResolved!, memberSearch),
    enabled: !!activeProjectIdResolved && memberSearch.trim().length > 0,
  });

  const currentUserMembership = projectMembers.find((m: any) => m.userId === user?.id);
  const isProjectManager =
    user?.role === 'ADMIN' ||
    activeProject?.ownerId === user?.id ||
    currentUserMembership?.role === 'PROJECT_MANAGER';

  const { data: serverTasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: [
      'tasks',
      activeProjectIdResolved,
      debouncedSearchQuery,
      statusFilter,
      priorityFilter,
    ],
    queryFn: () =>
      fetchTasks(activeProjectIdResolved!, {
        search: debouncedSearchQuery || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      }),
    enabled: !!activeProjectIdResolved,
  });

  const isLoading = isProjectsLoading || (!!activeProjectIdResolved && isTasksLoading);

  const tasks = serverTasks.map((t) => ({
    ...t,
    status: mapStatusToFrontend(t.status),
    priority: mapPriorityToFrontend(t.priority),
  }));

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateModalOpen(false);
      setNewTaskForm({ title: '', description: '', priority: 'Medium' });
      useToastStore.getState().showSuccess('Task created successfully!');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskRequest }) =>
      updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTask(null);
      useToastStore.getState().showSuccess('Task deleted successfully.');
    },
  });

  // Project Members mutations
  const addMemberMutation = useMutation({
    mutationFn: (body: { userId: string; role: 'PROJECT_MANAGER' | 'COLLABORATOR' }) =>
      addProjectMember(activeProjectIdResolved!, body),
    onSuccess: () => {
      refetchMembers();
      setSelectedAutocompleteUser(null);
      setMemberSearch('');
      useToastStore.getState().showSuccess('Member added to project workspace!');
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'PROJECT_MANAGER' | 'COLLABORATOR' }) =>
      updateProjectMemberRole(activeProjectIdResolved!, userId, { role }),
    onSuccess: () => {
      refetchMembers();
      useToastStore.getState().showSuccess('Member role updated.');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeProjectMember(activeProjectIdResolved!, userId),
    onSuccess: () => {
      refetchMembers();
      useToastStore.getState().showSuccess('Member removed from project.');
    },
  });

  // Task Assignee mutations
  const assignUserMutation = useMutation({
    mutationFn: (userId: string) => assignTaskUser(selectedTask!.id, userId),
    onSuccess: () => {
      refetchTaskDetails();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      useToastStore.getState().showSuccess('Task assignee added.');
    },
  });

  const unassignUserMutation = useMutation({
    mutationFn: (userId: string) => unassignTaskUser(selectedTask!.id, userId),
    onSuccess: () => {
      refetchTaskDetails();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      useToastStore.getState().showSuccess('Task assignee removed.');
    },
  });

  // ─── Selected Task Detail Query ─────────────────────────────────────────────

  const { data: taskDetails, refetch: refetchTaskDetails } = useQuery({
    queryKey: ['task', selectedTask?.id],
    queryFn: () => fetchTaskById(selectedTask!.id),
    enabled: !!selectedTask?.id,
  });

  const mappedSelectedTask = taskDetails
    ? {
        ...taskDetails,
        status: mapStatusToFrontend(taskDetails.status),
        priority: mapPriorityToFrontend(taskDetails.priority),
      }
    : null;

  // ─── Comment Queries & Mutations ────────────────────────────────────────────

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', selectedTask?.id],
    queryFn: () => fetchComments(selectedTask!.id),
    enabled: !!selectedTask?.id,
  });

  const postCommentMutation = useMutation({
    mutationFn: (payload: { content: string }) => postComment(selectedTask!.id, payload),
    onSuccess: () => {
      refetchComments();
      setCommentText('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      refetchComments();
    },
  });

  // ─── Attachment Mutations ───────────────────────────────────────────────────

  const deleteAttachmentMutation = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      refetchTaskDetails();
    },
  });

  // ─── Event Handlers ──────────────────────────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === event.active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = mapStatusToBackend(over.id as string);
    const current = tasks.find((t) => t.id === taskId);
    if (current && mapStatusToBackend(current.status) === newStatus) return;

    updateTaskMutation.mutate({
      id: taskId,
      payload: { status: newStatus },
    });
  };

  const handleCreateTask = () => {
    if (!newTaskForm.title.trim() || !activeProjectIdResolved) return;
    createTaskMutation.mutate({
      title: newTaskForm.title.trim(),
      description: newTaskForm.description.trim() || undefined,
      priority: mapPriorityToBackend(newTaskForm.priority),
      status: 'TODO',
      projectId: activeProjectIdResolved,
    });
  };

  const handleDeleteTask = () => {
    if (!selectedTask?.id) return;
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(selectedTask.id);
    }
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    postCommentMutation.mutate({ content: commentText.trim() });
  };

  const handleDeleteComment = (id: string) => {
    if (window.confirm('Delete this comment?')) {
      deleteCommentMutation.mutate(id);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask?.id) return;

    setIsUploading(true);
    try {
      // 1. Fetch Presigned PUT Upload URL
      const { uploadUrl, fileKey } = await getPresignedUploadUrl({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });

      // 2. Upload Binary Directly to S3 (No JWT Headers)
      await uploadFileToS3(uploadUrl, file);

      // 3. Register Attachment Metadata in DB
      await createTaskAttachment(selectedTask.id, {
        filename: file.name,
        fileKey,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });

      refetchTaskDetails();
    } catch (err) {
      console.error('File upload flow failed:', err);
      alert('Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteAttachment = (id: string) => {
    if (window.confirm('Delete this attachment?')) {
      deleteAttachmentMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ─── Filter Tasks ────────────────────────────────────────────────────────────

  const filteredTasks = tasks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <p className="text-muted-foreground animate-pulse">Loading board...</p>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col bg-background text-foreground min-h-screen transition-colors duration-300">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">Project Board</h1>
            {projects.length > 0 && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 border-border bg-background hover:bg-muted text-foreground text-sm font-semibold h-9 px-3"
                    >
                      <Folder className="h-4 w-4 text-primary" />
                      <span>
                        {projects.find((p) => p.id === activeProjectIdResolved)?.name ||
                          'Select Project'}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border text-popover-foreground w-56">
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => setActiveProjectId(project.id)}
                        className={
                          project.id === activeProjectIdResolved
                            ? 'bg-primary/10 text-primary font-medium'
                            : ''
                        }
                      >
                        {project.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {activeProjectIdResolved && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-border bg-background hover:bg-muted text-foreground text-sm font-semibold h-9 px-3"
                    onClick={() => setIsMembersModalOpen(true)}
                  >
                    <Users className="h-4 w-4 text-primary" />
                    <span>Members ({projectMembers.length})</span>
                  </Button>
                )}
              </div>
            )}
          </div>
          <p className="text-muted-foreground">Manage and track your project tasks in real time.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('board')}
              className={
                viewMode === 'board'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              <LayoutGrid className="h-4 w-4 mr-2" /> Board
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={
                viewMode === 'table'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              <List className="h-4 w-4 mr-2" /> List
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="bg-background border-border text-foreground hover:bg-muted mr-2"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Task
          </Button>
        </div>
      </div>

      {/* Unified Filters Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 bg-muted/20 p-3 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9 bg-background border-border text-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-background border-border text-foreground hover:bg-muted"
            >
              <Filter className="mr-2 h-4 w-4 text-primary" />
              <span>Status: {statusFilter || 'All'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground">
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>All Statuses</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('To Do')}>To Do</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('In Progress')}>
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('Done')}>Done</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-background border-border text-foreground hover:bg-muted"
            >
              <Filter className="mr-2 h-4 w-4 text-primary" />
              <span>Priority: {priorityFilter || 'All'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground">
            <DropdownMenuItem onClick={() => setPriorityFilter(null)}>
              All Priorities
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPriorityFilter('Low')}>Low</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPriorityFilter('Medium')}>Medium</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPriorityFilter('High')}>High</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {(searchQuery || statusFilter || priorityFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter(null);
              setPriorityFilter(null);
            }}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {viewMode === 'board' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
            <KanbanColumn title="To Do" status="To Do">
              {tasks
                .filter((t) => t.status === 'To Do')
                .map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
            </KanbanColumn>
            <KanbanColumn title="In Progress" status="In Progress">
              {tasks
                .filter((t) => t.status === 'In Progress')
                .map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
            </KanbanColumn>
            <KanbanColumn title="Done" status="Done">
              {tasks
                .filter((t) => t.status === 'Done')
                .map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
            </KanbanColumn>
          </div>
          <DragOverlay>
            {activeTask ? (
              <Card className="bg-card border-primary text-card-foreground shadow-2xl cursor-grabbing opacity-90 w-72">
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge
                      variant={
                        activeTask.priority === 'High'
                          ? 'destructive'
                          : activeTask.priority === 'Medium'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {activeTask.priority}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      #{activeTask.id.substring(0, 8) || activeTask.id}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-medium leading-snug">
                    {activeTask.title}
                  </CardTitle>
                </CardHeader>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium w-[100px]">ID</TableHead>
                <TableHead className="text-muted-foreground font-medium">Task Name</TableHead>
                <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  Priority
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTask(task)}
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      #{task.id.substring(0, 8) || task.id}
                    </TableCell>
                    <TableCell className="text-foreground font-medium">{task.title}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${
                          task.status === 'Done'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : task.status === 'In Progress'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {task.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          task.priority === 'High'
                            ? 'destructive'
                            : task.priority === 'Medium'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {task.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    No tasks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── MODAL 1: VIEW TASK DETAILS ────────────────────────────────────────── */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-4xl bg-background border-border text-foreground p-0 overflow-hidden">
          <div className="flex h-[600px]">
            {/* Modal Left: Task & Attachments Details */}
            <div className="flex-1 p-8 border-r border-border space-y-6 overflow-y-auto">
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <Badge
                    className="w-fit mb-2"
                    variant={mappedSelectedTask?.priority === 'High' ? 'destructive' : 'default'}
                  >
                    {mappedSelectedTask?.priority} Priority
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive text-xs hover:bg-destructive/10"
                    onClick={handleDeleteTask}
                    disabled={deleteTaskMutation.isPending}
                  >
                    <Trash2 size={14} className="mr-1" /> Delete Task
                  </Button>
                </div>
                <DialogTitle className="text-2xl font-bold">
                  {mappedSelectedTask?.title}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-4 text-base leading-relaxed">
                  {mappedSelectedTask?.description || 'No description provided.'}
                </DialogDescription>
              </DialogHeader>

              {/* Task Assignees Box */}
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Assignees
                  </h4>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5"
                      >
                        <UserPlus size={14} />
                        <span>Manage Assignees</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border-border text-popover-foreground w-64 max-h-60 overflow-y-auto">
                      {projectMembers.map((member) => {
                        const isAssigned = mappedSelectedTask?.assignees?.some(
                          (a) => a.userId === member.userId,
                        );
                        return (
                          <DropdownMenuItem
                            key={member.userId}
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => {
                              if (isAssigned) {
                                unassignUserMutation.mutate(member.userId);
                              } else {
                                assignUserMutation.mutate(member.userId);
                              }
                            }}
                          >
                            <span className="truncate">
                              {member.user?.name || member.user?.email || 'Unknown User'}
                            </span>
                            {isAssigned && (
                              <Check size={14} className="text-primary shrink-0 ml-2" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                      {projectMembers.length === 0 && (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          No project members to assign.
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap gap-2">
                  {mappedSelectedTask?.assignees && mappedSelectedTask.assignees.length > 0 ? (
                    mappedSelectedTask.assignees.map((assignee) => (
                      <div
                        key={assignee.userId}
                        className="flex items-center gap-2 bg-muted border border-border px-2.5 py-1.5 rounded-full text-xs text-foreground max-w-[180px] truncate"
                      >
                        <span className="truncate font-medium">
                          {assignee.name || assignee.email}
                        </span>
                        <button
                          type="button"
                          className="hover:text-destructive text-muted-foreground transition-colors shrink-0"
                          onClick={() => unassignUserMutation.mutate(assignee.userId)}
                          title="Remove Assignee"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No assignees assigned to this task.
                    </p>
                  )}
                </div>
              </div>

              {/* Task S3 Attachments Box */}
              <div className="space-y-4 pt-4 mt-8 border-t border-border/50">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Attachments
                </h4>

                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />

                <div
                  onClick={() => !isUploading && document.getElementById('file-upload')?.click()}
                  className={`border-2 border-dashed border-border bg-muted/30 rounded-xl p-6 text-center hover:border-primary hover:bg-primary/5 transition-all ${
                    isUploading ? 'cursor-not-allowed' : 'cursor-pointer'
                  } group`}
                >
                  {isUploading ? (
                    <p className="text-sm animate-pulse text-primary font-semibold">
                      Uploading to R2/S3...
                    </p>
                  ) : (
                    <>
                      <Paperclip className="mx-auto mb-2 h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="text-sm text-foreground font-medium">Click to upload files</p>
                    </>
                  )}
                </div>

                {/* Attachments List */}
                {mappedSelectedTask?.attachments && mappedSelectedTask.attachments.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {mappedSelectedTask.attachments.map((att) => {
                      const isImage = att.mimeType.startsWith('image/');
                      return (
                        <div
                          key={att.id}
                          className="relative group border border-border rounded-xl p-3 bg-muted/20 flex items-center gap-3"
                        >
                          {isImage && att.presignedUrl ? (
                            <img
                              src={att.presignedUrl}
                              alt={att.filename}
                              className="w-12 h-12 rounded-lg object-cover bg-background border border-border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center border border-border">
                              <Paperclip className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate text-foreground pr-4">
                              {att.filename}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {(att.fileSize / 1024).toFixed(1)} KB
                            </p>
                            {att.presignedUrl && (
                              <a
                                href={att.presignedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary hover:underline font-semibold mt-1 inline-block"
                              >
                                Download
                              </a>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Right: Comments Side Panel */}
            <div className="w-80 bg-muted/20 flex flex-col h-full border-l border-border">
              <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/40">
                <MessageSquare size={18} className="text-primary" />
                <h4 className="font-bold text-sm tracking-wide">Activity Feed</h4>
              </div>

              <ScrollArea className="flex-1 p-4">
                {comments.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-card border border-border p-3 rounded-lg text-sm shadow-sm relative group"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-primary text-xs truncate max-w-[150px]">
                            {comment.author?.name || comment.author?.email || 'A teammate'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </p>
                        </div>
                        <p className="text-foreground leading-relaxed text-xs wrap-break-word">
                          {comment.content}
                        </p>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="absolute bottom-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No comments yet. Start the conversation!
                  </div>
                )}
              </ScrollArea>

              {/* Comment TextBox & Submit */}
              <div className="p-4 border-t border-border bg-muted/40 space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="bg-background border-border resize-none h-16 text-xs focus-visible:ring-primary"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSendComment}
                    disabled={postCommentMutation.isPending || !commentText.trim()}
                  >
                    <Send size={12} className="mr-1.5" /> Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: CREATE NEW TASK ────────────────────────────────────────── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Fill out the details below to add a new task to the board.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Task Title</label>
              <Input
                placeholder="e.g. Update user profile UI"
                className="bg-background border-border focus-visible:ring-primary"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={newTaskForm.priority}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                placeholder="Briefly describe the task requirements..."
                className="bg-background border-border focus-visible:ring-primary resize-none"
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
              className="hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending || !newTaskForm.title.trim()}
            >
              Save Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: PROJECT MEMBERS MANAGEMENT CONSOLE ────────────────────────── */}
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Members</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manage the members and roles for this project workspace.
            </DialogDescription>
          </DialogHeader>

          {/* Autocomplete Input to Add Member */}
          {isProjectManager && (
            <div className="space-y-3 border-b border-border/50 pb-4 mb-4">
              <label className="text-sm font-semibold text-foreground">Add New Member</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      if (selectedAutocompleteUser) setSelectedAutocompleteUser(null);
                    }}
                    className="pl-9 bg-background border-border"
                  />
                  {/* Autocomplete Dropdown list */}
                  {autocompleteUsers.length > 0 &&
                    memberSearch.trim().length > 0 &&
                    !selectedAutocompleteUser && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {autocompleteUsers.map((u: any) => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedAutocompleteUser(u);
                              setMemberSearch(u.email);
                            }}
                            className="p-2.5 hover:bg-muted text-sm text-foreground cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-medium">{u.name || u.email}</span>
                            {u.name && (
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="flex h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="COLLABORATOR">Collaborator</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                </select>

                <Button
                  onClick={() => {
                    if (selectedAutocompleteUser) {
                      addMemberMutation.mutate({
                        userId: selectedAutocompleteUser.id,
                        role: newMemberRole,
                      });
                    }
                  }}
                  disabled={!selectedAutocompleteUser || addMemberMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Current Members ({projectMembers.length})
            </h4>
            <div className="space-y-2">
              {projectMembers.map((member: any) => {
                const isOwner = member.userId === activeProject?.ownerId;
                const isSelf = member.userId === user?.id;
                return (
                  <div
                    key={member.userId}
                    className="flex justify-between items-center border border-border rounded-xl p-3 bg-muted/20"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {member.user?.name || member.user?.email || 'Teammate'}
                        {isSelf && (
                          <span className="ml-1.5 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner ? (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Project Owner
                        </span>
                      ) : isProjectManager && !isSelf ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) =>
                              updateMemberRoleMutation.mutate({
                                userId: member.userId,
                                role: e.target.value as any,
                              })
                            }
                            className="flex h-8 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none"
                            disabled={updateMemberRoleMutation.isPending}
                          >
                            <option value="COLLABORATOR">Collaborator</option>
                            <option value="PROJECT_MANAGER">Project Manager</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove ${member.user?.name || member.user?.email} from project?`,
                                )
                              ) {
                                removeMemberMutation.mutate(member.userId);
                              }
                            }}
                            disabled={removeMemberMutation.isPending}
                          >
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <span className="text-[10px] bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {member.role === 'PROJECT_MANAGER' ? 'Project Manager' : 'Collaborator'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {projectMembers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No members in this project workspace.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
