import { Controller, Get, Route, Security, Tags } from 'tsoa';

import { prisma } from '../lib/prisma';
import { successResponse } from '../utils/response.util';

@Route('admin')
@Tags('Admin')
@Security('jwt', ['global:admin'])
export class AdminController extends Controller {
  /**
   * Retrieves system summary analytics for the administrator dashboard.
   * Derived purely on the backend.
   */
  @Get('dashboard/summary')
  public async getDashboardSummary(): Promise<any> {
    const totalUsers = await prisma.user.count();
    const totalProjects = await prisma.project.count();

    // Task status distribution
    const tasks = await prisma.task.findMany({
      select: { status: true },
    });

    const statusDistribution = {
      TODO: tasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      DONE: tasks.filter((t) => t.status === 'DONE').length,
    };

    // Overdue tasks count (dueDate in past and status not DONE)
    const overdueTasksCount = await prisma.task.count({
      where: {
        status: { not: 'DONE' },
        dueDate: { lt: new Date() },
      },
    });

    // System activity logs
    const activityLogs = await prisma.taskActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return successResponse('Admin summary retrieved successfully.', {
      totalUsers,
      totalProjects,
      statusDistribution,
      overdueTasksCount,
      activityLogs,
    });
  }

  /**
   * Retrieves active users and projects counts.
   */
  @Get('metrics/system')
  public async getSystemMetrics(): Promise<any> {
    const activeProjectsCount = await prisma.project.count({
      where: { status: 'ACTIVE' },
    });
    const completedProjectsCount = await prisma.project.count({
      where: { status: 'COMPLETED' },
    });
    const archivedProjectsCount = await prisma.project.count({
      where: { status: 'ARCHIVED' },
    });
    const activeUsersCount = await prisma.user.count({
      where: { isActive: true },
    });

    return successResponse('System metrics retrieved successfully.', {
      projects: {
        active: activeProjectsCount,
        completed: completedProjectsCount,
        archived: archivedProjectsCount,
      },
      users: {
        active: activeUsersCount,
      },
    });
  }

  /**
   * Compiles overview reports for all registered projects.
   */
  @Get('reports/overview')
  public async getReportsOverview(): Promise<any> {
    const tasksCount = await prisma.task.count();
    const doneTasksCount = await prisma.task.count({
      where: { status: 'DONE' },
    });

    const projectStats = await prisma.project.findMany({
      include: {
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    return successResponse('Reports overview retrieved successfully.', {
      overall: {
        totalTasks: tasksCount,
        completedTasks: doneTasksCount,
        completionRate: tasksCount > 0 ? (doneTasksCount / tasksCount) * 100 : 0,
      },
      projects: projectStats.map((p) => ({
        id: p.id,
        name: p.name,
        taskCount: p._count.tasks,
        memberCount: p._count.members,
        status: p.status,
      })),
    });
  }
}
