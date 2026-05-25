# **nexTask \- Project Roadmap & Task Distribution**

This document outlines the development phases for the nexTask project. The work is divided into logic-based phases, with each phase consisting of exactly 5 core tasks, organized in the order they need to be completed.

## **🏗 Phase 0: System Initialization & Scaffolding**

_Handled exclusively by **Member A**. This phase establishes the environment, core architecture, and database foundation required for all other members to begin work._

| Task ID | Task Description                                                                                                                                                           | Assigned To | Status    |
| :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- | :-------- |
| T0.1    | **Monorepo Scaffolding** \- Initialize pnpm workspaces. \- Create root pnpm-workspace.yaml. \- Scaffold server, client, and types directories.                             | Member A    | Completed |
| T0.2    | **Backend & API Config** \- Initialize Express with TypeScript. \- Configure tsoa for automated Swagger generation. \- Link shared TypeScript types to the server package. | Member A    | Completed |
| T0.3    | **Database & Schema** \- Initialize PostgreSQL connection. \- Set up Prisma ORM. \- Define base User and Task models in schema.prisma.                                     | Member A    | Completed |
| T0.4    | **Frontend Foundations** \- Initialize React via Vite with TypeScript. \- Install and configure Tailwind CSS. \- Set up shadcn/ui and the global theme.                    | Member A    | Completed |
| T0.5    | **Containerization** \- Create production and development Dockerfiles. \- Configure docker-compose.yml for multi-service orchestration.                                    | Member A    | Completed |

## **🛠 Phase 1: Core Authentication & Logic**

_Focuses on user access, task management foundations, and system infrastructure._

| Task ID | Task Description                                                                                                                                                                                              | Assigned To | Status    |
| :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------- | :-------- |
| T1.1    | **Authentication Engine** \- Implement Argon2 password hashing utilities. \- Build JWT generation and verification logic. \- Create Login and Registration endpoints.                                         | Member A    | Completed |
| T1.2    | **Task Services** \- Create Prisma-based CRUD services for tasks. \- Implement TSOA controllers (must return standardized ApiResponse and throw ApiError).                                                    | Member B    | Pending   |
| T1.3    | **Base Layout UI** \- Design the responsive Dashboard Shell with Sidebar. \- Build the top Navigation bar with user status. \- Implement frontend routing and protected routes.                               | Member C    | Pending   |
| T1.4    | **User Onboarding Flows** \- Build "First Login" password reset logic (enforce via mustResetPassword flag). \- Implement the User Profile edit interface. \- Enforce password complexity frontend validation. | Member D    | Pending   |
| T1.5    | **Error Infrastructure** \- (Backend middleware & ApiError implemented in T1.1) \- Implement frontend toast notification system mapped to standardized API response format.                                   | Member E    | Pending   |

## **🚀 Phase 2: Notifications & UI Features**

_Focuses on multi-device connectivity and essential user interaction tools._

| Task ID | Task Description                                                                                                                                                                                                    | Assigned To | Status  |
| :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------- | :------ |
| T2.1    | **Web Push System** \- Generate VAPID keys and manage server-side subscriptions. \- Build the service to store and manage multi-device push tokens. \- Implement Service Worker logic for background notifications. | Member A    | Pending |
| T2.2    | **Collaboration Logic** \- Implement the database model and services for task comments. \- Build the logic for handling file attachment metadata. \- Create API endpoints for real-time comment posting.            | Member B    | Pending |
| T2.3    | **Task Visualization** \- Build the interactive Kanban Board UI using shadcn. \- Implement Task Cards with priority-based color coding. \- Create a filterable List/Table view for detailed tracking.               | Member C    | Pending |
| T2.4    | **Global Search & Filter** \- Build the search utility for the global Dashboard. \- Implement backend filters for Task Status and Priority. \- Create a team member search component for assignments.               | Member D    | Pending |
| T2.5    | **Mail Integration** \- Configure Nodemailer with SMTP credentials. \- Design HTML templates for Onboarding and Task Assignment. \- Link mail triggers to specific backend event hooks.                             | Member E    | Pending |

## **🔒 Phase 3: Real-Time & Advanced Governance**

_Focuses on live synchronization, security enforcement, and project analytics._

| Task ID | Task Description                                                                                                                                                                                                                                                          | Assigned To | Status  |
| :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------- | :------ |
| T3.1    | **WebSocket Integration** \- Initialize Socket.io server-side for event broadcasting. \- Implement live synchronization for task status changes. \- Ensure real-time notification alerts pop up across active tabs.                                                       | Member A    | Pending |
| T3.2    | **Data Integrity & Validation** \- Implement request body sanitization to prevent XSS. \- Add Zod validation schemas for all incoming API data. \- Ensure strict typing for all PostgreSQL database transactions.                                                         | Member B    | Pending |
| T3.3    | **RBAC Enforcement** \- Implement role-check middlewares (Admin/PM/Collaborator). \- Restrict sensitive task actions based on user permissions. \- Conditionally render UI elements based on the authenticated role.                                                      | Member C    | Pending |
| T3.4    | **Admin Management** \- Build the searchable User Management dashboard. \- Implement role assignment and user deactivation logic. \- Disable and remove the temporary public registration endpoint built in T1.1. \- Create an audit log view for administrative changes. | Member D    | Pending |
| T3.5    | **Analytics & Reporting** \- Implement a Project Status dashboard with completion charts. \- Create a summary view for task distribution by priority. \- Build personal productivity statistics for the individual user.                                                  | Member E    | Pending |

## **📋 Deliverables Tracking**

- \[ \] Source code published to GitHub (with feature branches and merge commits).
- \[ \] Swagger API documentation accessible at /api-docs (Generated via tsoa).
- \[ \] ER, Class, and Deployment diagrams updated in /docs.
- \[ \] Documentation Finalization (Shared responsibility: Setup guides, API manual, and Final Report).
- \[ \] Final deployment on Cloud Platform (AWS/Azure/GCP).
