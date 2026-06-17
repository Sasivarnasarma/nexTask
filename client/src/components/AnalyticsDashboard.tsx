import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Task {
  id: string;
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
}

interface AnalyticsDashboardProps {
  tasks: Task[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ tasks }) => {
  // 1. Calculations for completion metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 2. Format data specifically for the Pie Chart (Status Distribution)
  const statusData = [
    { name: 'To Do', value: tasks.filter(t => t.status === 'TODO').length },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'IN_PROGRESS').length },
    { name: 'Completed', value: completedTasks },
  ];

  // 3. Format data specifically for the Bar Chart (Priority Distribution)
  const priorityData = [
    { name: 'Low', count: tasks.filter(t => t.priority === 'LOW').length },
    { name: 'Medium', count: tasks.filter(t => t.priority === 'MEDIUM').length },
    { name: 'High', count: tasks.filter(t => t.priority === 'HIGH').length },
  ];

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981']; // Orange, Blue, Green colors for charts

  return (
    <div className="space-y-6 my-6">
      {/* Visual Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-sm text-zinc-400 font-medium">Total Tasks</p>
          <h3 className="text-3xl font-bold mt-1 text-white">{totalTasks}</h3>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-sm text-zinc-400 font-medium">Completed Tasks</p>
          <h3 className="text-3xl font-bold mt-1 text-emerald-400">{completedTasks}</h3>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-sm text-zinc-400 font-medium">Project Progress</p>
          <h3 className="text-3xl font-bold mt-1 text-blue-400">{completionRate}%</h3>
          <div className="w-full bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${completionRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* Visual Graphical Charts Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h4 className="text-base font-semibold mb-4 text-white">Status Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h4 className="text-base font-semibold mb-4 text-white">Task Priority Metrics</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#a1a1aa" />
                <YAxis allowDecimals={false} stroke="#a1a1aa" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
                <Legend />
                <Bar dataKey="count" fill="#6366f1" name="Number of Tasks" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};