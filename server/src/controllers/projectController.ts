import { Controller, Route, Get, Post, Put, Delete, Body, Path, SuccessResponse } from 'tsoa';
import { ProjectService } from '../services/projectService';

const projectService = new ProjectService();

@Route('api/v1/projects')
export class ProjectController extends Controller {

  // 1. POST api/v1/projects (Create a project)
  @Post('')
  @SuccessResponse('201', 'Created')
  public async create(
    @Body() requestBody: { name: string; description?: string; ownerId: string }
  ): Promise<any> {
    const newProject = await projectService.createProject(
      requestBody.name,
      requestBody.description,
      requestBody.ownerId
    );
    return { success: true, message: "Project created successfully", data: newProject, errors: null };
  }

  // 2. GET api/v1/projects (View all projects)
  @Get('')
  public async getAll(): Promise<any> {
    const projects = await projectService.getAllProjects();
    return { success: true, message: "Projects retrieved successfully", data: projects, errors: null };
  }

  // 3. GET api/v1/projects/{id} (View single project by ID)
  @Get('{id}')
  public async getById(@Path() id: string): Promise<any> {
    const project = await projectService.getProjectById(id);
    if (!project) {
      this.setStatus(404);
      return { success: false, message: "Project not found", data: null, errors: { id: "Not found" } };
    }
    return { success: true, message: "Project retrieved successfully", data: project, errors: null };
  }

  // 4. PUT api/v1/projects/{id} (Update details)
  @Put('{id}')
  public async update(
    @Path() id: string,
    @Body() requestBody: { name: string; description?: string }
  ): Promise<any> {
    const updatedProject = await projectService.updateProject(id, requestBody.name, requestBody.description);
    return { success: true, message: "Project updated successfully", data: updatedProject, errors: null };
  }

  // 5. PUT api/v1/projects/{id}/complete (Complete project)
  @Put('{id}/complete')
  public async complete(@Path() id: string): Promise<any> {
    const completedProject = await projectService.completeProject(id);
    return { success: true, message: "Project marked as completed", data: completedProject, errors: null };
  }

  // 6. PUT api/v1/projects/{id}/archive (Archive project)
  @Put('{id}/archive')
  public async archive(@Path() id: string): Promise<any> {
    const archivedProject = await projectService.archiveProject(id);
    return { success: true, message: "Project archived successfully", data: archivedProject, errors: null };
  }

  // 7. DELETE api/v1/projects/{id} (Delete project)
  @Delete('{id}')
  public async delete(@Path() id: string): Promise<any> {
    await projectService.deleteProject(id);
    return { success: true, message: "Project deleted successfully", data: null, errors: null };
  }
}