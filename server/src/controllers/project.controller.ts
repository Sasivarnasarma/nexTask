import { Middlewares } from 'tsoa';
import { validateRequest } from '../middlewares/validate.middleware';
import { createProjectSchema } from '../schemas/project.schema';

import { CreateProjectRequest, Project, UpdateProjectRequest } from '@nextask/types';
import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Path,
  Post,
  Put,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import { ProjectService } from '../services/project.service';
import { ApiError } from '../utils/apiError.util';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('projects')
@Tags('Projects')
@Security('jwt')
export class ProjectController extends Controller {
  private projectService: ProjectService;

  constructor() {
    super();
    this.projectService = new ProjectService();
  }

  // 1. POST /projects (Create a project)
  @Post('/')
  @Middlewares(validateRequest(createProjectSchema))
  @SuccessResponse('201', 'Created')
  @Security('jwt')
  public async create(
    @Body() requestBody: CreateProjectRequest,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<Project>> {
    const { userId: requestorId } = (request as any).user;

    const newProject = await this.projectService.createProject(
      requestBody.name,
      requestBody.description,
      requestorId,
    );
    this.setStatus(201);
    return successResponse('Project created successfully.', newProject);
  }

  // 2. GET /projects (View all projects visible to requestor)
  @Get('/')
  public async getAll(@Request() request: ExRequest): Promise<ApiResponse<Project[]>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const projects = await this.projectService.getAllProjects(requestorId, requestorRole);
    return successResponse('Projects retrieved successfully.', projects);
  }

  // 3. GET /projects/{id} (View single project by ID)
  @Get('{id}')
  @Security('jwt', ['project:member'])
  public async getById(@Path() id: string): Promise<ApiResponse<Project>> {
    const project = await this.projectService.getProjectById(id);
    if (!project) throw new ApiError(404, 'Project not found.');
    return successResponse('Project retrieved successfully.', project);
  }

  // 4. PUT /projects/{id} (Update details)
  @Put('{id}')
  @Security('jwt', ['project:manager'])
  public async update(
    @Path() id: string,
    @Body() requestBody: UpdateProjectRequest,
  ): Promise<ApiResponse<Project>> {
    const updatedProject = await this.projectService.updateProject(
      id,
      requestBody.name,
      requestBody.description,
    );
    return successResponse('Project updated successfully.', updatedProject);
  }

  // 5. PATCH /projects/{id}/complete (Complete project)
  @Patch('{id}/complete')
  @Security('jwt', ['project:manager'])
  public async complete(@Path() id: string): Promise<ApiResponse<Project>> {
    const completedProject = await this.projectService.completeProject(id);
    return successResponse('Project marked as completed.', completedProject);
  }

  // 6. PATCH /projects/{id}/archive (Archive project)
  @Patch('{id}/archive')
  @Security('jwt', ['project:manager'])
  public async archive(@Path() id: string): Promise<ApiResponse<Project>> {
    const archivedProject = await this.projectService.archiveProject(id);
    return successResponse('Project archived successfully.', archivedProject);
  }

  // 7. DELETE /projects/{id} (Delete project - Admin Only)
  @Delete('{id}')
  @Security('jwt', ['global:admin'])
  public async delete(@Path() id: string): Promise<ApiResponse<null>> {
    const project = await this.projectService.getProjectById(id);
    if (!project) throw new ApiError(404, 'Project not found.');

    await this.projectService.deleteProject(id);
    return successResponse('Project deleted successfully.', null);
  }
}
