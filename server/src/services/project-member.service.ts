import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';

/**
 * Authorization helper to ensure the user is either:
 * 1. A global system ADMIN.
 * 2. The project owner.
 * 3. A project member with PROJECT_MANAGER role.
 */
async function verifyProjectManagerAccess(
  projectId: string,
  requestorId: string,
  requestorRole: string,
): Promise<void> {
  if (requestorRole === 'ADMIN') return;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ApiError(404, 'Project not found.');

  if (project.ownerId === requestorId) return;

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: requestorId,
      },
    },
  });

  if (!membership || membership.role !== 'PROJECT_MANAGER') {
    throw new ApiError(
      403,
      'Access denied. You must be an Admin, Project Owner, or Project Manager of this project.',
    );
  }
}

/**
 * Authorization helper to ensure the user has read access to the project:
 * 1. A global system ADMIN.
 * 2. The project owner.
 * 3. Any member of the project.
 */
async function verifyProjectMemberAccess(
  projectId: string,
  requestorId: string,
  requestorRole: string,
): Promise<void> {
  if (requestorRole === 'ADMIN') return;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ApiError(404, 'Project not found.');

  if (project.ownerId === requestorId) return;

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: requestorId,
      },
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this project.');
  }
}

export class ProjectMemberService {
  /**
   * Adds a new member to the project.
   */
  public async addMemberToProject(
    projectId: string,
    userId: string,
    role: 'PROJECT_MANAGER' | 'COLLABORATOR',
    requestorId: string,
    requestorRole: string,
  ): Promise<any> {
    await verifyProjectManagerAccess(projectId, requestorId, requestorRole);

    // Verify user exists in the database
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'User not found.');

    // Check if already a member
    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    if (existing) {
      throw new ApiError(409, 'User is already a member of this project.');
    }

    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
    });

    return newMember;
  }

  /**
   * Retrieves all members of the project.
   */
  public async getProjectMembers(
    projectId: string,
    requestorId: string,
    requestorRole: string,
  ): Promise<any[]> {
    await verifyProjectMemberAccess(projectId, requestorId, requestorRole);

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  /**
   * Retrieves details of a specific project member.
   */
  public async getMemberDetails(
    projectId: string,
    userId: string,
    requestorId: string,
    requestorRole: string,
  ): Promise<any> {
    const isSelf = requestorId === userId;
    if (!isSelf) {
      await verifyProjectManagerAccess(projectId, requestorId, requestorRole);
    } else {
      const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
      if (!projectExists) throw new ApiError(404, 'Project not found.');
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!member) throw new ApiError(404, 'Project member not found.');

    return {
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }

  /**
   * Updates the role of a project member.
   */
  public async updateMemberRole(
    projectId: string,
    userId: string,
    newRole: 'PROJECT_MANAGER' | 'COLLABORATOR',
    requestorId: string,
    requestorRole: string,
    adminOnly = false,
  ): Promise<void> {
    if (adminOnly) {
      if (requestorRole !== 'ADMIN') {
        throw new ApiError(403, 'Access denied. Administrator privileges required.');
      }
    } else {
      await verifyProjectManagerAccess(projectId, requestorId, requestorRole);
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new ApiError(404, 'Project not found.');

    // Cannot change the role of the project owner
    if (project.ownerId === userId) {
      throw new ApiError(400, 'Cannot modify the role of the project owner.');
    }

    // Verify member exists
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    if (!member) throw new ApiError(404, 'Project member not found.');

    await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: { role: newRole },
    });
  }

  /**
   * Removes a member from the project.
   * Cleans up any task assignments within the project for the user.
   */
  public async removeMemberFromProject(
    projectId: string,
    userId: string,
    requestorId: string,
    requestorRole: string,
  ): Promise<void> {
    await verifyProjectManagerAccess(projectId, requestorId, requestorRole);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new ApiError(404, 'Project not found.');

    // Cannot remove the project owner
    if (project.ownerId === userId) {
      throw new ApiError(400, 'Cannot remove the project owner.');
    }

    // Verify member exists
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    if (!member) throw new ApiError(404, 'Project member not found.');

    await prisma.$transaction(async (tx) => {
      // Clean up task assignments for tasks under this project
      await tx.taskAssignment.deleteMany({
        where: {
          userId,
          task: {
            projectId,
          },
        },
      });

      // Delete the membership record
      await tx.projectMember.delete({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });
    });
  }
}
