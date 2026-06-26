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
import { ProjectMemberView, Task, UpdateTaskRequest } from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart2,
  Calendar,
  Check,
  ChevronDown,
  Edit,
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
import { io } from 'socket.io-client';

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
  bulkAssignTaskUsers,
  createProject,
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
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
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

// Kanban Column Component
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
      className={`flex-1 min-w-[280px] rounded-xl p-4 flex flex-col transition-all ${bgClass}`}
    >
      <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${headerColor}`}>{title}</h2>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 pr-4 min-h-[200px]">{children}</div>
      </ScrollArea>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, onClick }: { task: FrontendTask; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

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

// Main Dashboard Page
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
    dueDate: '',
    assigneeIds: [] as string[],
  });
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskForm, setEditTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
  });
  const [viewMode, setViewMode] = useState<'board' | 'table' | 'analytics'>('board');
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

  // Project Creation states
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectEndDate, setNewProjectEndDate] = useState('');

  const canCreateProject = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setActiveProjectId(data.id);
      setIsCreateProjectOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectEndDate('');
      useToastStore.getState().showSuccess('Project created successfully!');
    },
    onError: () => {
      useToastStore.getState().showError('Failed to create project.');
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim() || newProjectName.trim().length < 3) return;
    createProjectMutation.mutate({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
      endDate: newProjectEndDate ? new Date(newProjectEndDate).toISOString() : undefined,
    });
  };

  // Project Members management console states
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedAutocompleteUser, setSelectedAutocompleteUser] = useState<{
    id: string;
    name: string | null;
    email: string;
  } | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<'PROJECT_MANAGER' | 'COLLABORATOR'>(
    'COLLABORATOR',
  );

  // Project & Task Queries
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchUserProjects,
  });

  const activeProjectIdResolved =
    (activeProjectId && projects.some((p) => p.id === activeProjectId)
      ? activeProjectId
      : projects[0]?.id) || null;

  React.useEffect(() => {
    if (projects.length === 0) return;
    if (activeProjectIdResolved && activeProjectIdResolved !== activeProjectId) {
      setActiveProjectId(activeProjectIdResolved);
    }
  }, [activeProjectId, activeProjectIdResolved, projects, setActiveProjectId]);

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

  const currentUserMembership = projectMembers.find((m) => m.userId === user?.id);

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
    onSuccess: async (createdTask) => {
      if (newTaskForm.assigneeIds.length > 0 && createdTask?.id) {
        try {
          await bulkAssignTaskUsers(createdTask.id, newTaskForm.assigneeIds);
        } catch (err) {
          console.error('Failed to assign members during task creation:', err);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateModalOpen(false);
      setNewTaskForm({
        title: '',
        description: '',
        priority: 'Medium',
        dueDate: '',
        assigneeIds: [],
      });
      useToastStore.getState().showSuccess('Task created successfully!');
    },
  });

  const editTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskRequest }) =>
      updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', selectedTask?.id] });
      useToastStore.getState().showSuccess('Task updated successfully!');
      setIsEditingTask(false);
    },
    onError: () => {
      useToastStore.getState().showError('Failed to update task.');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskRequest }) =>
      updateTask(id, payload),
    onMutate: async ({ id, payload }) => {
      const queryKey = [
        'tasks',
        activeProjectIdResolved,
        debouncedSearchQuery,
        statusFilter,
        priorityFilter,
      ];
      await queryClient.cancelQueries({ queryKey });
      const previousTasks = queryClient.getQueryData<Task[]>(queryKey);

      if (previousTasks && payload.status) {
        queryClient.setQueryData<Task[]>(
          queryKey,
          previousTasks.map((t) => (t.id === id ? { ...t, status: payload.status! } : t)),
        );
      }
      return { previousTasks, queryKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(context.queryKey, context.previousTasks);
      }
      useToastStore.getState().showError('Failed to move task.');
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
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

  const deleteAttachmentMutation = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      refetchTaskDetails();
    },
  });

  const selectedTaskRef = React.useRef(selectedTask);
  React.useEffect(() => {
    selectedTaskRef.current = selectedTask;
  }, [selectedTask]);

  React.useEffect(() => {
    if (!activeProjectIdResolved) return;

    const socketUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    const token = useAuthStore.getState().token;

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
    });

    newSocket.on('connect_error', (err) => {
      console.error('[WS_ERROR] Dashboard socket connection failed:', err.message);
    });

    newSocket.on('connect', () => {
      console.log('Socket connected, joining project:', activeProjectIdResolved);
      newSocket.emit('join-project', activeProjectIdResolved);
    });

    newSocket.on('task:created', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectIdResolved] });
    });

    newSocket.on('task:updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectIdResolved] });
      if (selectedTaskRef.current && selectedTaskRef.current.id === data.id) {
        refetchTaskDetails();
      }
    });

    newSocket.on('task:deleted', (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectIdResolved] });
      if (selectedTaskRef.current && selectedTaskRef.current.id === data.taskId) {
        setSelectedTask(null);
      }
    });

    newSocket.on('comment:created', (data) => {
      if (selectedTaskRef.current && selectedTaskRef.current.id === data.taskId) {
        refetchComments();
        refetchTaskDetails();
      }
    });

    newSocket.on('comment:deleted', (data) => {
      if (selectedTaskRef.current && selectedTaskRef.current.id === data.taskId) {
        refetchComments();
        refetchTaskDetails();
      }
    });

    newSocket.on('task:assigned', (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectIdResolved] });
      if (selectedTaskRef.current && selectedTaskRef.current.id === data.taskId) {
        refetchTaskDetails();
      }
    });

    newSocket.on('task:unassigned', (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectIdResolved] });
      if (selectedTaskRef.current && selectedTaskRef.current.id === data.taskId) {
        refetchTaskDetails();
      }
    });

    newSocket.on('task:assignments-updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectIdResolved] });
      if (selectedTaskRef.current && selectedTaskRef.current.id === data.taskId) {
        refetchTaskDetails();
      }
    });

    return () => {
      console.log('Cleaning up socket for project:', activeProjectIdResolved);
      newSocket.emit('leave-project', activeProjectIdResolved);
      newSocket.disconnect();
    };
  }, [activeProjectIdResolved, queryClient, refetchComments, refetchTaskDetails]);

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
      dueDate: newTaskForm.dueDate
        ? new Date(newTaskForm.dueDate + 'T12:00:00Z').toISOString()
        : undefined,
    });
  };

  const handleStartEdit = () => {
    if (!selectedTask) return;
    setEditTaskForm({
      title: selectedTask.title,
      description: selectedTask.description || '',
      priority:
        selectedTask.priority === 'HIGH'
          ? 'High'
          : selectedTask.priority === 'MEDIUM'
            ? 'Medium'
            : 'Low',
      dueDate: selectedTask.dueDate
        ? new Date(selectedTask.dueDate).toISOString().split('T')[0]
        : '',
    });
    setIsEditingTask(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTask || !editTaskForm.title.trim()) return;
    editTaskMutation.mutate({
      id: selectedTask.id,
      payload: {
        title: editTaskForm.title.trim(),
        description: editTaskForm.description.trim() || null,
        priority: mapPriorityToBackend(editTaskForm.priority),
        dueDate: editTaskForm.dueDate
          ? new Date(editTaskForm.dueDate + 'T12:00:00Z').toISOString()
          : null,
      } as unknown as UpdateTaskRequest,
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
    if (!file || !selectedTask?.id || !activeProjectIdResolved) return;
    setIsUploading(true);

    try {
      const { uploadUrl, fileKey } = await getPresignedUploadUrl({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        projectId: activeProjectIdResolved,
      });

      await uploadFileToS3(uploadUrl, file);

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

  const filteredTasks = tasks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent text-foreground">
        <p className="text-muted-foreground animate-pulse">Loading board...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    const canCreateProject = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-foreground p-8">
        <div className="text-center space-y-4 max-w-md">
          <Folder className="h-16 w-16 text-muted-foreground mx-auto animate-pulse" />
          <h2 className="text-2xl font-bold tracking-tight">You are not in any project</h2>
          <p className="text-muted-foreground text-sm">
            {canCreateProject
              ? 'Get started by creating a new project workspace using the sidebar selector.'
              : 'Please ask your administrator or project manager to invite you to a project workspace.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col bg-transparent text-foreground min-h-screen transition-colors duration-300 w-full">
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
                    <div className="max-h-60 overflow-y-auto">
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
                    </div>
                    {canCreateProject && (
                      <>
                        <div className="h-px bg-border my-1" />
                        <DropdownMenuItem
                          onClick={() => setIsCreateProjectOpen(true)}
                          className="cursor-pointer text-primary focus:text-primary font-semibold"
                        >
                          + Create New Project
                        </DropdownMenuItem>
                      </>
                    )}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('analytics')}
              className={
                viewMode === 'analytics'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              <BarChart2 className="h-4 w-4 mr-2" /> Analytics
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
      {viewMode !== 'analytics' && (
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
              <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                All Statuses
              </DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => setPriorityFilter('Medium')}>
                Medium
              </DropdownMenuItem>
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
      )}

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
                  </div>
                  <CardTitle className="text-sm font-medium leading-snug">
                    {activeTask.title}
                  </CardTitle>
                </CardHeader>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : viewMode === 'table' ? (
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
                        className={`text-xs px-2 py-1 rounded-full border ${task.status === 'Done'
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
      ) : (
        <AnalyticsDashboard tasks={serverTasks || []} />
      )}

      {/* ─── MODAL 1: VIEW TASK DETAILS ────────────────────────────────────────── */}
      <Dialog
        open={!!selectedTask}
        onOpenChange={() => {
          setSelectedTask(null);
          setIsEditingTask(false);
        }}
      >
        <DialogContent className="max-w-4xl bg-background border-border text-foreground p-0 overflow-hidden">
          <div className="flex h-[80vh]">
            <div className="flex-1 p-8 border-r border-border space-y-6 overflow-y-auto">
              <DialogHeader>
                {isEditingTask ? (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Task Title
                      </label>
                      <Input
                        value={editTaskForm.title}
                        onChange={(e) =>
                          setEditTaskForm({ ...editTaskForm, title: e.target.value })
                        }
                        className="bg-background border-border focus-visible:ring-primary font-bold text-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Priority
                        </label>
                        <select
                          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          value={editTaskForm.priority}
                          onChange={(e) =>
                            setEditTaskForm({ ...editTaskForm, priority: e.target.value })
                          }
                        >
                          <option value="Low">Low Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="High">High Priority</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Due Date (Deadline)
                        </label>
                        <Input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={editTaskForm.dueDate}
                          onChange={(e) =>
                            setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })
                          }
                          className="bg-background border-border focus-visible:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Description
                      </label>
                      <Textarea
                        value={editTaskForm.description}
                        onChange={(e) =>
                          setEditTaskForm({ ...editTaskForm, description: e.target.value })
                        }
                        className="bg-background border-border focus-visible:ring-primary resize-none h-24 text-sm"
                        placeholder="Briefly describe the task requirements..."
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingTask(false)}
                        className="hover:bg-muted text-muted-foreground hover:text-foreground h-9"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={editTaskMutation.isPending || !editTaskForm.title.trim()}
                        className="h-9"
                      >
                        {editTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <Badge
                        className="w-fit mb-2"
                        variant={
                          mappedSelectedTask?.priority === 'High' ? 'destructive' : 'default'
                        }
                      >
                        {mappedSelectedTask?.priority} Priority
                      </Badge>
                      {isProjectManager && (
                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-primary text-xs hover:bg-primary/10"
                            onClick={handleStartEdit}
                          >
                            <Edit size={14} className="mr-1" /> Edit Task
                          </Button>
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
                      )}
                    </div>
                    <DialogTitle className="text-2xl font-bold">
                      {mappedSelectedTask?.title}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-4 text-base leading-relaxed">
                      {mappedSelectedTask?.description || 'No description provided.'}
                    </DialogDescription>
                    {mappedSelectedTask?.dueDate && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4 bg-muted/40 border border-border/40 px-3 py-1.5 rounded-lg w-fit">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span className="font-semibold text-foreground">Deadline:</span>
                        <span>
                          {new Date(mappedSelectedTask.dueDate).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </DialogHeader>

              {/* Task Assignees Box */}
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Assignees
                  </h4>
                  {isProjectManager && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="h-8 border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5"
                        >
                          <UserPlus size={14} /> <span>Manage Assignees</span>
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
                              {isAssigned && <Check size={14} className="text-primary" />}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
                        {isProjectManager && (
                          <button
                            type="button"
                            className="hover:text-destructive text-muted-foreground transition-colors shrink-0"
                            onClick={() => unassignUserMutation.mutate(assignee.userId)}
                            title="Remove Assignee"
                          >
                            <X size={12} />
                          </button>
                        )}
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
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <div
                  onClick={() => !isUploading && document.getElementById('file-upload')?.click()}
                  className={`border-2 border-dashed border-border bg-muted/30 rounded-xl p-6 text-center hover:border-primary hover:bg-primary/5 transition-all ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer'
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
                          {isProjectManager && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAttachment(att.id)}
                            >
                              <X size={12} />
                            </Button>
                          )}
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
                        {isProjectManager && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="absolute bottom-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
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

      {/* ─── MODAL: CREATE NEW PROJECT ────────────────────────────────────────── */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set up a new workspace for your team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Project Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Website Redesign"
                className="bg-background border-border focus-visible:ring-primary w-full"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                placeholder="Briefly describe the project goals..."
                className="bg-background border-border focus-visible:ring-primary resize-none w-full"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">End Date</label>
              <Input
                type="date"
                className="bg-background border-border focus-visible:ring-primary w-full"
                value={newProjectEndDate}
                onChange={(e) => setNewProjectEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateProjectOpen(false)}
              className="hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending || !newProjectName.trim() || newProjectName.trim().length < 3}
            >
              Create Project
            </Button>
          </DialogFooter>
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
              <label className="text-sm font-medium text-foreground">Due Date (Deadline)</label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="bg-background border-border focus-visible:ring-primary w-full"
                value={newTaskForm.dueDate}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assignees</label>
              <div className="border border-border rounded-md p-3 bg-background/50 max-h-32 overflow-y-auto space-y-1.5 focus-within:ring-2 focus-within:ring-primary">
                {projectMembers.map((member) => {
                  const isSelected = newTaskForm.assigneeIds.includes(member.userId);
                  return (
                    <label
                      key={member.userId}
                      className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:bg-muted/40 p-1 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const updated = isSelected
                            ? newTaskForm.assigneeIds.filter((id) => id !== member.userId)
                            : [...newTaskForm.assigneeIds, member.userId];
                          setNewTaskForm({ ...newTaskForm, assigneeIds: updated });
                        }}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 bg-background cursor-pointer"
                      />
                      <span className="truncate">
                        {member.user?.name || member.user?.email || 'Unknown User'}
                      </span>
                    </label>
                  );
                })}
                {projectMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No team members to assign.</p>
                )}
              </div>
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
                        {autocompleteUsers.map((u) => (
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
                  onChange={(e) =>
                    setNewMemberRole(e.target.value as 'PROJECT_MANAGER' | 'COLLABORATOR')
                  }
                  className="flex h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none"
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
              {projectMembers.map((member: ProjectMemberView) => {
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
                                role: e.target.value as 'PROJECT_MANAGER' | 'COLLABORATOR',
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
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (window.confirm('Remove this member from project?')) {
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
