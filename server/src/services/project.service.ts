import { Project } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';

export class ProjectService {
  // 1. CREATE a brand new project
  public async createProject(
    name: string,
    description: string | undefined,
    ownerId: string,
  ): Promise<Project> {
    if (name.trim().length < 3) {
      throw new ApiError(400, 'Project name must be at least 3 characters long.');
    }

    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          ownerId,
          status: 'ACTIVE',
        },
      });

      // Automatically join the owner as a PROJECT_MANAGER project member
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: ownerId,
          role: 'PROJECT_MANAGER',
        },
      });

      return project;
    });
  }

  // 2. VIEW a single project by its ID
  public async getProjectById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id },
    });
  }

  // 3. VIEW all projects in the system (Admins see all; others see their memberships/owned)
  public async getAllProjects(userId: string, userRole: string): Promise<Project[]> {
    if (userRole === 'ADMIN') {
      return prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 4. UPDATE project details (name and description)
  public async updateProject(
    id: string,
    name: string,
    description: string | undefined,
  ): Promise<Project> {
    if (name.trim().length < 3) {
      throw new ApiError(400, 'Project name must be at least 3 characters long.');
    }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Project not found.');

    return prisma.project.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });
  }

  // 5. COMPLETE a project (Updates status to COMPLETED)
  public async completeProject(id: string): Promise<Project> {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Project not found.');

    return prisma.project.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  // 6. ARCHIVE a project (Updates status to ARCHIVED)
  public async archiveProject(id: string): Promise<Project> {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Project not found.');

    return prisma.project.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  // 7. DELETE a project completely from the system
  public async deleteProject(id: string): Promise<Project> {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Project not found.');

    return prisma.project.delete({
      where: { id },
    });
  }
}
