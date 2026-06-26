# nexTask — Collaborative Task Management System

> A full-stack, real-time, type-safe Task Management System built with a modern TypeScript monorepo architecture.  
> Developed as part of **INTE 21323 — Web Application Development Group Project**.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Docker Orchestration](#docker-orchestration)
- [API Documentation](#api-documentation)
- [Database Design](#database-design)
- [Security](#security)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Team Contributions](#team-contributions)

---

## Overview

**nexTask** is a professional, full-stack task management platform designed for teams to plan, organize, track, and complete work collaboratively. It features secure role-based access control (RBAC), real-time WebSocket-driven notifications, a live project chat system, and cloud-based file attachments — all assembled inside a **pnpm monorepo workspace** with a fully type-safe TypeScript codebase shared across the frontend and backend.

Key architectural highlights:

- **Shared type contracts** via a `@nextask/types` package — zero duplication between client and server
- **TSOA** auto-generates OpenAPI/Swagger documentation directly from controller decorators
- **Prisma ORM** with PostgreSQL for a strongly-typed data layer
- **Socket.IO** for real-time task updates, live chat, and push notifications
- **AWS S3 presigned URLs** for secure, direct-to-storage file uploads

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | `https://nextask.sasivarnasarma.me/login` |




---

## Tech Stack

### Frontend (`client/`)

| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework and build tool |
| TypeScript | Type safety |
| Tailwind CSS + shadcn/ui | Styling and UI components |
| Zustand | Global state management |
| TanStack React Query | Server state, caching, and data fetching |
| Axios | HTTP client with JWT interceptors |
| Socket.IO Client | Real-time communication |
| dnd-kit | Drag-and-drop Kanban board |
| Recharts | Dashboard charts and analytics |

### Backend (`server/`)

| Technology | Purpose |
|---|---|
| Node.js + Express 5 | Server runtime and HTTP framework |
| TypeScript | Type safety |
| TSOA | Controller-based routing + auto OpenAPI generation |
| Prisma 7 ORM | Type-safe database access layer |
| PostgreSQL | Relational database |
| Socket.IO | WebSocket server for real-time features |
| Argon2 | Secure password hashing |
| JWT | Stateless authentication |
| Zod | Runtime input validation |
| Nodemailer | Transactional email |
| AWS SDK (S3) | Cloud file storage with presigned URLs |
| Web Push | Browser push notification delivery |

### Shared (`types/`)

| Technology | Purpose |
|---|---|
| `@nextask/types` | Shared TypeScript interfaces across client and server |

### DevOps & Tooling

| Technology | Purpose |
|---|---|
| pnpm Workspaces | Monorepo package management |
| Docker + Docker Compose | Containerization and orchestration |
| ESLint + Prettier | Code linting and formatting |

---

## Architecture

nexTask follows a clean layered architecture across a monorepo:

```
Browser
  │
  │  React UI · Zustand stores · React Query · Axios
  ▼
Client API Layer  ──────────────────────────────┐
  │                                             │
  │  HTTP REST                  Socket.IO       │  Web Push
  ▼                                ▼            ▼
Express Server ──── TSOA Routes ──────────────────────
  │
  ▼
Controllers  →  Services  →  Prisma ORM  →  PostgreSQL
                    │
                    ├──  MailService  →  SMTP
                    ├──  S3Service    →  AWS S3
                    └──  PushService  →  Web Push API
```

**Request lifecycle:**

```
HTTP Request
  → Express middleware (helmet, CORS, JSON)
  → TSOA generated route
  → Authentication middleware (JWT verification)
  → Controller method
  → Service method (business logic)
  → Prisma query
  → PostgreSQL
  → ApiResponse JSON
```

**Real-time notification flow:**

```
Business event (task assigned, status changed, comment added)
  → NotificationService.createNotification()
  → Writes Notification row to DB
  → Emits Socket.IO event to user's private room
  → May trigger Web Push for offline users
```

---

## Features

### Authentication & Session Management
- Email/password login with JWT-based session management
- Secure HTTP-only storage with Axios JWT interceptors for automatic header injection
- Token expiration and refresh mechanism
- Forced password reset on first login
- Forgot password / email-based reset flow

### Role-Based Access Control (RBAC)

| Role | Permissions |
|---|---|
| **Administrator** | Full system access — manage users, assign roles, system configuration |
| **Project Manager** | Create and manage projects/tasks, assign members, monitor progress |
| **Collaborator** | View assigned tasks, update task status, add comments and attachments |

- Protected routes enforce `401 Unauthorized` and `403 Forbidden` responses
- TSOA `@Security` decorators apply role guards at the controller level

### User Management *(Admin only)*
- Create, view, update, activate/deactivate, and delete users
- Role assignment and searchable/filterable user list
- New user onboarding via automated email with temporary password
- Password policy enforcement (length and complexity)
- Secure password storage with **Argon2** hashing

### Project Management
- Create, view, update, complete, archive, and delete projects
- Add and manage project members with project-level roles
- Bulk task assignment within projects

### Task Management
- Full task CRUD with title, description, assigned users, due date, priority, and status
- Priority levels: Low, Medium, High
- Status workflow: To Do → In Progress → Completed
- Task views: table, board, and **Kanban drag-and-drop**
- Filtering and sorting capabilities
- Task activity log tracking all changes

### Collaboration
- Task-level comments with attachment support
- **Live project chat** powered by Socket.IO
- In-app notification panel (role-specific, user-specific)
- Browser **Web Push notifications** for offline users
- Notifications stored and delivered on reconnection

### File Management
- Presigned AWS S3 upload URLs — files upload directly from the browser to S3
- Attachment records managed server-side
- Supports task attachments and chat message attachments

### Real-Time (WebSocket)
- Socket.IO with JWT authentication on connection
- Private user rooms for personal notifications
- Project rooms with DB-verified access checks before joining
- Live task status updates, project changes, and assignment alerts

### Security
- **Argon2** password hashing (never plaintext)
- **Helmet.js** HTTP security headers
- **CORS** configured per environment
- Zod input validation on all API endpoints
- Parameterized queries via Prisma ORM (prevents SQL injection)
- Input sanitization (prevents XSS)
- OWASP Top 10 best practices applied
- HTTPS enforced in production (WSS for WebSocket)
- Role-enforced authorization on every protected route

---

## Project Structure

```text
nexTask/
│
├── client/                        # React frontend
│   ├── public/
│   │   └── sw.js                  # Service worker for Web Push
│   └── src/
│       ├── api/                   # Feature-specific Axios API wrappers
│       │   ├── auth.api.ts
│       │   ├── tasks.api.ts
│       │   ├── projects.api.ts
│       │   ├── users.api.ts
│       │   ├── comments.api.ts
│       │   ├── attachments.api.ts
│       │   ├── messages.api.ts
│       │   ├── notifications.api.ts
│       │   └── profile.api.ts
│       ├── components/            # Shared UI components
│       │   ├── ui/                # Radix/shadcn-style primitives
│       │   ├── auth/              # Route guards
│       │   ├── Navbar.tsx
│       │   ├── Sidebar.tsx
│       │   ├── NotificationPanel.tsx
│       │   └── PushNotificationPrompt.tsx
│       ├── hooks/                 # Reusable React hooks
│       ├── lib/                   # Utility helpers
│       ├── pages/                 # Route-level screens
│       │   ├── auth/              # Login, reset password, forgot password
│       │   ├── Dashboard.tsx      # Main task board
│       │   ├── MessagesPage.tsx   # Live project chat
│       │   └── admin/             # Admin user management
│       ├── store/                 # Zustand global state
│       │   ├── auth.store.ts
│       │   ├── project.store.ts
│       │   └── toast.store.ts
│       ├── App.tsx                # Routing tree, providers, guards
│       └── main.tsx               # React entry point
│
├── server/                        # Express backend
│   ├── prisma/
│   │   └── schema.prisma          # Database schema (source of truth)
│   └── src/
│       ├── controllers/           # TSOA REST controllers
│       │   ├── auth.controller.ts
│       │   ├── user.controller.ts
│       │   ├── project.controller.ts
│       │   ├── project-member.controller.ts
│       │   ├── task.controller.ts
│       │   ├── task-assignment.controller.ts
│       │   ├── comment.controller.ts
│       │   ├── attachment.controller.ts
│       │   ├── message.controller.ts
│       │   ├── notification.controller.ts
│       │   ├── push.controller.ts
│       │   └── system.controller.ts
│       ├── services/              # Business logic and DB access
│       ├── middlewares/           # JWT auth, role guards
│       ├── schemas/               # Zod validation schemas
│       ├── utils/                 # JWT helpers, response wrappers
│       ├── lib/
│       │   ├── prisma.ts          # Prisma client singleton
│       │   └── socket.ts          # Socket.IO server setup
│       ├── templates/             # Email templates (Nodemailer)
│       ├── scripts/               # Seed, VAPID key, template scripts
│       ├── routes.ts              # TSOA generated routes (auto-generated)
│       ├── swagger.json           # TSOA generated OpenAPI spec (auto-generated)
│       └── index.ts               # Server entry point
│
├── types/                         # Shared TypeScript contracts
│   └── index.ts                   # Users, tasks, projects, auth, responses
│
├── _project-plan/                 # Planning and specification documents
│
├── package.json                   # Root monorepo scripts
├── pnpm-workspace.yaml            # Workspace package declarations
├── tsconfig.json                  # Root TypeScript project references
├── docker-compose.yml             # Container orchestration
├── .prettierrc
└── CONTRIBUTING.md
```

---

## Prerequisites

- **[Node.js](https://nodejs.org/en/)** v18 or higher
- **[pnpm](https://pnpm.io/installation)** — install globally: `npm install -g pnpm`
- A running **PostgreSQL** instance (or use the provided `docker-compose.yml`)
- AWS S3-compatible bucket (for file attachments)
- SMTP credentials (for transactional email)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Sasivarnasarma/nexTask.git
cd nexTask
```

### 2. Install all dependencies

From the root directory, pnpm installs dependencies across all workspace packages:

```bash
pnpm install
```

### 3. Configure environment variables

Navigate to `server/` and create a `.env` file from the sample:

```bash
cp server/.env.sample server/.env
```

Edit `server/.env` with your configuration (see [Environment Variables](#environment-variables) below).

Also set the frontend API URL:

```bash
# client/.env
VITE_API_URL=http://localhost:3000
```

### 4. Initialize the database schema

```bash
cd server
npx prisma db push
```

To track migration history instead:

```bash
npx prisma migrate dev --name init
```

### 5. (Optional) Seed the database

```bash
pnpm seed
```

---

## Environment Variables

Create `server/.env` with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nextask

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# SMTP (email)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=noreply@nextask.com

# AWS S3 (file attachments)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=nextask-attachments

# Web Push (VAPID keys — generate with: pnpm generate:vapid)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your_email@example.com

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

## Running the Application

All commands are run from the **root directory** of the monorepo.

### Development mode

Starts both the Vite frontend dev server and the Express backend with nodemon hot-reloading concurrently:

```bash
pnpm dev
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:3000` |
| Swagger UI | `http://localhost:3000/api-docs` |

### Production mode

Compiles the TypeScript backend and bundles the frontend, then runs the production build:

```bash
pnpm prod
```

### Type checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

---

## Docker Orchestration

To spin up the entire application stack (frontend, backend, and PostgreSQL) fully containerized:

```bash
docker-compose up --build
```

| Service | Exposed Port |
|---|---|
| Frontend (nginx) | `8080` |
| Backend (Express) | `3000` |
| PostgreSQL | `5432` |

To stop all services:

```bash
docker-compose down
```

To stop and remove all volumes (wipes the database):

```bash
docker-compose down -v
```

---

## API Documentation

nexTask uses **TSOA** to auto-generate OpenAPI 3.0 documentation directly from TypeScript controller decorators. No manual spec writing required.

Once the server is running, open:

```
http://localhost:3000/api-docs
```

The Swagger UI lists all endpoints with request/response schemas, authentication requirements, and role-based access information.

To regenerate routes and the Swagger spec after modifying controllers:

```bash
cd server
npx tsoa routes
npx tsoa spec
```

---

## Database Design

The PostgreSQL schema is defined in `server/prisma/schema.prisma`.

### Core Entities

| Entity | Description |
|---|---|
| `User` | System users with roles (Admin, Project Manager, Collaborator) |
| `Project` | Top-level work containers with status tracking |
| `ProjectMember` | Many-to-many user↔project membership with project-level roles |
| `Task` | Individual work items with priority, status, and due dates |
| `TaskAssignment` | Many-to-many user↔task assignments |
| `TaskActivity` | Immutable audit log of all task changes |
| `Comment` | Task-level comments with optional attachments |
| `Attachment` | Task file attachments stored on AWS S3 |
| `Message` | Project-scoped live chat messages |
| `MessageAttachment` | File attachments on chat messages |
| `Notification` | In-app notifications (role-specific, user-specific) |
| `PushSubscription` | Browser Web Push subscription records |

### ER Diagram

> 📎 See `ER_Diagram.png` for the full entity relationship diagram.

![nexTask ER Diagram](./ER_Diagram.png)
---

## Security

nexTask applies OWASP Top 10 best practices throughout:

| Threat | Mitigation |
|---|---|
| SQL Injection | Prisma ORM with parameterized queries — no dynamic SQL |
| XSS | Input sanitization and validation via Zod on all endpoints |
| Broken Authentication | Argon2 password hashing, JWT with expiry, forced reset on first login |
| Sensitive Data Exposure | HTTPS in production, WSS for WebSockets, env-based secrets |
| Broken Access Control | RBAC enforced at controller level via TSOA `@Security` + middleware |
| Security Misconfiguration | Helmet.js HTTP headers, environment-specific CORS |
| Insecure Dependencies | pnpm lockfile, ESLint security rules |

Password requirements:
- Minimum 8 characters
- Must include uppercase, lowercase, number, and special character
- Stored exclusively as **Argon2** hashes — plaintext never persisted

---

## Testing

The project includes:

- **API Testing** — endpoint-level validation of request/response contracts
- **Integration Testing** — cross-service and database interaction tests
- **Validation Testing** — Zod schema enforcement on all inputs
- **Security Testing** — RBAC, unauthorized access, injection prevention
- **Edge Case Testing** — boundary conditions, invalid inputs, expired tokens
- **Role-Based Access Testing** — verifying each role's permitted and forbidden actions
- **Real-Time Testing** — Socket.IO event handling and notification delivery

---

## CI/CD Pipeline

The project uses **GitHub Actions** for continuous integration:

```yaml
Triggers: push to main, pull requests

Pipeline steps:
  1. Install dependencies (pnpm install)
  2. Type check all packages (pnpm typecheck)
  3. Lint all packages (pnpm lint)
  4. Prisma schema validation
  5. Build frontend (Vite production build)
  6. Build backend (TypeScript compile)
  7. Docker image build verification
  8. Docker Compose validation
```

---

## Team Contributions

### Role A 
- Monorepo workspace setup (pnpm workspaces, tsconfig project references)
- Shared `@nextask/types` package
- Database schema design (`schema.prisma`) and Prisma setup
- Backend core infrastructure: Express server, middleware stack, error handling
- Task management backend (task CRUD, assignment, activity logging)
- Docker Compose orchestration

### Role B 
- JWT authentication system (login, refresh, token expiry)
- Password reset and first-login forced reset flow
- User management APIs (admin CRUD, role assignment, onboarding email)
- Project management APIs (create, update, status transitions, archive)
- File attachment system (S3 presigned URLs, attachment records)
- Nodemailer integration and email templates

### Role C 
- React frontend architecture (App.tsx, routing, providers, guards)
- Dashboard and Kanban board (drag-and-drop with dnd-kit)
- Project chat UI (MessagesPage with Socket.IO)
- Admin dashboard (user management UI)
- Notification panel and Web Push prompt UI
- shadcn/Radix UI component library

### Role D 
- RBAC enforcement on frontend (RouteGuard, role-conditional rendering)
- Zod validation schemas for all API endpoints
- Password policy enforcement (frontend and backend)
- Axios interceptors (JWT injection, 401 global redirect)
- Security hardening (Helmet.js, CORS, input sanitization)
- Zustand state management (auth.store, project.store, toast.store)

### Role E 
- Socket.IO server setup (authentication, private rooms, project rooms)
- Real-time notification delivery and in-app notification system
- Web Push subscription management and push delivery (VAPID)
- Live project chat (broadcast, history, message attachments)
- API testing, integration testing, security testing
- Swagger/TSOA documentation review and final README

---

## License

This project was developed for academic purposes as part of **INTE 21323 — Web Application Development Group Project**.