import { Message } from '@nextask/types';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';

import { fetchProjectMessages } from '../api/messages.api';
import { fetchUserProjects } from '../api/profile.api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAuthStore } from '../store/auth.store';
import { useProjectStore } from '../store/project.store';

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { activeProjectId, setActiveProjectId } = useProjectStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch projects list
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchUserProjects,
  });

  const activeProjectIdResolved =
    (activeProjectId && projects.some((p) => p.id === activeProjectId)
      ? activeProjectId
      : projects[0]?.id) || null;

  const activeProject = projects.find((p) => p.id === activeProjectIdResolved);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Fetch message history when project changes
  useEffect(() => {
    if (!activeProjectIdResolved) return;

    fetchProjectMessages(activeProjectIdResolved)
      .then((history) => {
        setMessages(history);
        scrollToBottom();
      })
      .catch((err) => {
        console.error('Failed to fetch message history:', err);
      });

    return () => {
      setMessages([]);
    };
  }, [activeProjectIdResolved]);

  useEffect(() => {
    if (!activeProjectIdResolved) return;

    const socketUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('[WS] Connected to chat room for project:', activeProjectIdResolved);
      newSocket.emit('join-project', activeProjectIdResolved);
    });

    newSocket.on('receive-message', (msg: Message) => {
      if (msg.projectId === activeProjectIdResolved) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      }
    });

    socketRef.current = newSocket;

    return () => {
      console.log('[WS] Cleaning up chat room socket for project:', activeProjectIdResolved);
      newSocket.emit('leave-project', activeProjectIdResolved);
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [activeProjectIdResolved, token]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeProjectIdResolved || !socketRef.current) return;

    socketRef.current.emit('send-message', {
      projectId: activeProjectIdResolved,
      content: newMessage.trim(),
    });
    setNewMessage('');
  };

  return (
    <div className="flex h-[calc(100vh-4.1rem)] bg-background overflow-hidden relative">
      {/* Left Sidebar - Projects Chat List */}
      <div className="w-80 shrink-0 border-r border-border bg-card/40 flex flex-col h-full">
        <div className="p-6 border-b border-border bg-card shrink-0">
          <h2 className="text-lg font-bold text-foreground">Project Chats</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Select a project to chat with the team
          </p>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="flex flex-col gap-1.5">
            {isProjectsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                You don't belong to any projects.
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setActiveProjectId(project.id)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 flex items-center gap-3.5 border ${
                    activeProjectIdResolved === project.id
                      ? 'bg-primary/10 border-primary/20 shadow-sm text-primary'
                      : 'hover:bg-muted/60 border-transparent text-foreground/80'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-sm shrink-0 transition-colors ${
                      activeProjectIdResolved === project.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {project.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h3
                      className={`text-sm font-bold truncate ${
                        activeProjectIdResolved === project.id ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">Team Space</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Area - Active Chat Room */}
      <div className="flex-1 flex flex-col bg-background h-full min-w-0">
        {activeProject ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm border border-primary/20">
                  {activeProject.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{activeProject.name}</h2>
                  <p className="text-[10px] text-muted-foreground">Team Collaboration Channel</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 bg-background/30 px-6 py-6">
              <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send a message to start the team conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    const senderInitial = (msg.sender?.name || 'U').charAt(0).toUpperCase();

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 items-start ${isMine ? 'flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground font-bold text-xs shrink-0 select-none">
                          {senderInitial}
                        </div>

                        {/* Content block */}
                        <div
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[70%]`}
                        >
                          {!isMine && (
                            <span className="text-xs font-semibold text-muted-foreground mb-1 ml-1">
                              {msg.sender?.name || msg.sender?.email}
                            </span>
                          )}
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed border ${
                              isMine
                                ? 'bg-primary text-primary-foreground border-primary rounded-tr-sm'
                                : 'bg-card border-border text-foreground rounded-tl-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1 select-none">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 bg-card border-t border-border shrink-0">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
                <Input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message to broadcast to project team..."
                  className="flex-1 bg-background border-border text-foreground focus-visible:ring-primary h-11 px-4 rounded-xl text-sm outline-none"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="h-11 px-5 rounded-xl font-bold text-sm shrink-0 flex items-center gap-2"
                >
                  <span>Send</span>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Project Channels</h3>
            <p className="text-xs text-muted-foreground max-w-xs text-center">
              Select a project chat channel from the list to view team messages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
