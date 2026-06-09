import { PrismaClient, Project } from '@prisma/client';

const prisma = new PrismaClient();

export class ProjectService {
  
  // 1. CREATE a brand new project
  public async createProject(name: string, description: string | undefined, ownerId: string): Promise<Project> {
    return prisma.project.create({
      data: {
        name,
        description,
        ownerId,
        status: 'ACTIVE'
      }
    });
  }

  // 2. VIEW a single project by its ID
  public async getProjectById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id }
    });
  }

  // 3. VIEW all projects in the system
  public async getAllProjects(): Promise<Project[]> {
    return prisma.project.findMany();
  }

  // 4. UPDATE project details (name and description)
  public async updateProject(id: string, name: string, description: string | undefined): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data: { name, description }
    });
  }

  // 5. COMPLETE a project (Updates status to COMPLETED)
  public async completeProject(id: string): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });
  }

  // 6. ARCHIVE a project (Updates status to ARCHIVED)
  public async archiveProject(id: string): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    });
  }

  // 7. DELETE a project completely from the system
  public async deleteProject(id: string): Promise<Project> {
    return prisma.project.delete({
      where: { id }
    });
  }
}