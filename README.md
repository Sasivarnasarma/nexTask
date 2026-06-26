# 🚀 nexTask — Collaborative Task Management System

> A full-stack, real-time, type-safe Task Management System built with a modern TypeScript monorepo architecture.  
> Developed as part of **INTE 21323 — Web Application Development Group Project**.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Tech Stack](#-tech-stack)
- [Architecture & Request Flows](#-architecture--request-flows)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Setup & Installation](#-setup--installation)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Docker Orchestration](#-docker-orchestration)
- [API Usage & Swagger Documentation](#-api-usage--swagger-documentation)
- [Database Design](#-database-design)
- [Security Model](#-security-model)
- [Testing Suite](#-testing-suite)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Team Member Contributions](#-team-member-contributions)
- [Project Deliverables & Documentation](#-project-deliverables--documentation)

---

## 🎯 Overview

**nexTask** is a professional, full-stack, real-time task management platform designed for teams to plan, organize, track, and complete work collaboratively. It features secure Role-Based Access Control (RBAC), real-time WebSocket-driven notifications, a live project chat system, and cloud-based file attachments — all assembled inside a **pnpm monorepo workspace** with a fully type-safe TypeScript codebase shared across the frontend and backend.

### Key Architectural Highlights

- **Shared Type Contracts** via a `@nextask/types` workspace package — ensuring zero duplication of schemas and interfaces between the client and server.
- **TSOA Integration** to automatically generate OpenAPI/Swagger routing and documentation directly from controller TypeScript decorators.
- **Prisma ORM** with PostgreSQL for a strongly-typed, migrateable, and secure data access layer.
- **Socket.IO** for low-latency task updates, live chat, and push notifications.
- **AWS S3 Presigned URLs** allowing secure, direct-to-storage file uploads from the browser.

---

## 🌐 Live Demo

| Service                  | URL                                                                           |
| :----------------------- | :---------------------------------------------------------------------------- |
| **Frontend Application** | [https://nextask.sasivarnasarma.me/login](https://nextask.sasivarnasarma.me/) |

---

## 🛠 Tech Stack

### Frontend (`client/`)

| Technology                                             | Purpose                                                           |
| :----------------------------------------------------- | :---------------------------------------------------------------- |
| **[React 19](https://react.dev/)**                     | UI library for building responsive interfaces                     |
| **[Vite 8](https://vitejs.dev/)**                      | Fast build tool and development server                            |
| **[TypeScript 6](https://www.typescriptlang.org/)**    | Type-safety and compilation checks                                |
| **[Tailwind CSS 4](https://tailwindcss.com/)**         | Utility-first CSS framework for clean, modern styling             |
| **[Radix UI](https://www.radix-ui.com/)**              | Accessible, headless UI primitives (Dialog, Dropdown, ScrollArea) |
| **[TanStack React Query](https://tanstack.com/query)** | Server state management, caching, and optimistic UI updates       |
| **[Zustand](https://zustand.docs.pmnd.rs/)**           | Lightweight client-side global state management                   |
| **[React Router 7](https://reactrouter.com/)**         | Client-side routing with route protection guards                  |
| **[Axios](https://axios-http.com/)**                   | HTTP client with automatic JWT injection and error interceptors   |
| **[Recharts](https://recharts.org/)**                  | Interactive charting library for analytics dashboards             |
| **[Lucide React](https://lucide.dev/)**                | Clean and consistent modern vector icon set                       |
| **[@dnd-kit](https://dndkit.com/)**                    | Flexible drag-and-drop primitives for the Kanban board            |
| **[Socket.IO Client](https://socket.io/)**             | Real-time WebSocket connection to the server                      |

### Backend (`server/`)

| Technology                                                                  | Purpose                                                                |
| :-------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **[Node.js](https://nodejs.org/)**                                          | JavaScript runtime environment                                         |
| **[Express 5](https://expressjs.com/)**                                     | Web application framework for REST APIs                                |
| **[TypeScript 6](https://www.typescriptlang.org/)**                         | Strong static typing for robust backend code                           |
| **[PostgreSQL](https://www.postgresql.org/)**                               | High-performance relational database                                   |
| **[Prisma ORM](https://www.prisma.io/)**                                    | Type-safe database client and automated migration tool                 |
| **[TSOA](https://tsoa-community.github.io/docs/)**                          | Controller-based routing and automatic Swagger/OpenAPI generation      |
| **[Zod 4](https://zod.dev/)**                                               | Runtime request body, query, and path parameter validation             |
| **[JSON Web Tokens](https://jwt.io/)**                                      | Stateless, secure user authentication and authorization                |
| **[Argon2](https://github.com/ranisalt/node-argon2)**                       | Industry-standard password hashing algorithm                           |
| **[Socket.IO](https://socket.io/)**                                         | WebSocket server for real-time notifications and chat messaging        |
| **[Nodemailer](https://nodemailer.com/)**                                   | Transactional SMTP email delivery for onboarding and alerts            |
| **[web-push](https://github.com/web-push-libs/web-push)**                   | VAPID-based browser push notification delivery                         |
| **[AWS SDK (S3)](https://aws.amazon.com/sdk-for-javascript/)**              | Secure S3-compatible cloud storage (AWS, R2, MinIO) via presigned URLs |
| **[Helmet](https://helmetjs.github.io/)**                                   | Security-related HTTP headers setup                                    |
| **[Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)** | Embedded interactive API sandbox documentation                         |

### Shared Contracts (`types/`)

| Technology           | Purpose                                                                              |
| :------------------- | :----------------------------------------------------------------------------------- |
| **`@nextask/types`** | Monorepo-internal workspace package housing shared interfaces, enums, and validators |

### DevOps & Infrastructure

| Technology                                             | Purpose                                                            |
| :----------------------------------------------------- | :----------------------------------------------------------------- |
| **[pnpm Workspaces](https://pnpm.io/workspaces)**      | High-performance monorepo dependency management                    |
| **[Docker & Docker Compose](https://www.docker.com/)** | Containerization and multi-service local environment orchestration |
| **[ESLint](https://eslint.org/)**                      | Strict code linting and code quality checks                        |
| **[Prettier](https://prettier.io/)**                   | Automated code formatter                                           |

---

## 🏗 Architecture & Request Flows

nexTask is built upon a **clean, layered architecture** ensuring strict separation of concerns across a modular monorepo.

### Structural Architecture Block Diagram

```
Browser
  │
  │  React UI · Zustand stores · React Query · Axios Interceptors
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
                    ├──  MailService  →  SMTP Email
                    ├──  S3Service    →  AWS S3 Bucket
                    └──  PushService  →  Web Push API
```

### HTTP Request Lifecycle Flow

```
HTTP Request
  → Express middleware (helmet, CORS, JSON parser)
  → TSOA generated route mapping
  → Authentication middleware (JWT decryption & RBAC check)
  → Controller handler
  → Service method (encapsulated business logic)
  → Prisma query compilation
  → PostgreSQL Database
  → Standardized ApiResponse JSON
```

### Real-Time Notification Flow

```
Business event (task assigned, status changed, comment added)
  → NotificationService.createNotification()
  → Writes Notification row to DB
  → Emits Socket.IO event to target user's private socket room
  → Triggers Web Push API for offline/unconnected users
```

---

## 🎨 Features

### Feature Summary Table

| Feature                         | Description                                                                                                                    |
| :------------------------------ | :----------------------------------------------------------------------------------------------------------------------------- |
| **Authentication & Onboarding** | JWT-based auth with Argon2 password hashing, first-login forced password reset, and forgot-password email flow                 |
| **Role-Based Access Control**   | Hybrid authorization with global roles (Admin/PM) and project-level membership roles                                           |
| **Project Management**          | Create, update, complete, archive, and delete projects with member management                                                  |
| **Task Management**             | Full CRUD with priority levels (Low/Medium/High), status tracking (Todo/In Progress/Done), tags, and drag-and-drop positioning |
| **Kanban Board**                | Interactive drag-and-drop board with real-time updates across connected clients                                                |
| **Multi-Assignee Tasks**        | Assign, unassign, and bulk-assign team members to tasks                                                                        |
| **Comments & Attachments**      | Threaded comment system with S3-based file upload/download (presigned URLs)                                                    |
| **Real-Time Updates**           | Socket.IO integration with project-scoped rooms for live task/comment/assignment events                                        |
| **Email Notifications**         | SMTP-based templated HTML emails for onboarding, password resets, task assignments, and membership changes                     |
| **Web Push Notifications**      | VAPID-based browser push notifications for task events                                                                         |
| **Admin Dashboard**             | User management, role assignment, user activation/deactivation, and audit activity logs                                        |
| **Analytics & Reporting**       | Project status charts, priority/status distribution metrics, and productivity insights                                         |
| **Search & Filtering**          | Full-text task search, filtering by status/priority/tags, and team member autocomplete                                         |
| **Calendar View**               | Visual calendar displaying tasks by due date                                                                                   |
| **Validation**                  | Dual-layer validation with Zod schemas (backend) and real-time form validation (frontend)                                      |

### Detailed Feature Breakdown

#### 🔐 Authentication & Session Management

- Secure email/password login using state-of-the-art **Argon2** hashing.
- Stateless session management with dual-token JWT (Access Token & Refresh Token).
- Axios interceptors automatically inject access tokens and handle token refreshment or redirection upon expiry.
- First-login forced password reset ensuring newly onboarded users change temporary passwords.
- Secure, email-based password recovery flow (Forgot Password).

#### 🛡️ Role-Based Access Control (RBAC)

- Hybrid authorization model combining Global Roles (Admin, Project Manager, Collaborator) with Project-Specific Roles (Project Manager, Collaborator).
- Access control enforced at the controller layer via TSOA `@Security` decorators and route guards on the frontend.
- API endpoints respond with correct HTTP codes (`401 Unauthorized` or `403 Forbidden`) upon privilege violation.

#### 👥 User Management _(Admin Only)_

- Dedicated Admin Dashboard to create, read, update, activate/deactivate, and delete users.
- New user onboarding via automated email containing their temporary password.
- Password complexity policy validation on both frontend and backend.
- Full system audit logs showing admin and user actions.

#### 📁 Project & Task Management

- Create, view, update, complete, archive, and delete projects.
- Manage project members and assign project-level roles dynamically.
- Full task CRUD (Title, Description, Assignees, Due Date, Priority, Status, Tags, Position).
- Multiple visual representations of tasks: Interactive Kanban Board, Filterable Data Table, and Due-Date Calendar.
- Fluid drag-and-drop card movement on the Kanban board (powered by `dnd-kit`).
- Task activity logs tracking history of modifications made to any given task.

#### 💬 Real-Time Collaboration & Communication

- Project-scoped live chat rooms allowing team members to communicate in real-time.
- Socket.IO authenticated connections using JWTs.
- In-app notification panel displaying alerts for status changes, comments, and assignments.
- Integration with the browser's Web Push API allowing offline users to receive browser push notifications.

#### ☁️ Cloud File Management

- S3-compatible cloud storage integration (AWS S3, Cloudflare R2, MinIO).
- Secure client-to-cloud file uploads via S3 Presigned URLs, preventing file streaming through the application server and optimizing backend performance.
- Attachment records tracked database-side and linked to tasks and chat messages.

---

## 📁 Project Structure

```text
nexTask/
├── client/                          # Frontend React application
│   ├── public/                      # Static assets (logo, icons, service worker)
│   │   └── sw.js                    # Service worker for Web Push notifications
│   ├── src/
│   │   ├── api/                     # API client modules (one per resource)
│   │   │   ├── client.ts            # Axios instance with JWT & error interceptors
│   │   │   ├── auth.api.ts          # Login, reset password, forgot password
│   │   │   ├── projects.api.ts      # Project CRUD operations
│   │   │   ├── tasks.api.ts         # Task CRUD operations
│   │   │   ├── comments.api.ts      # Comment operations
│   │   │   ├── attachments.api.ts   # File upload/download
│   │   │   ├── users.api.ts         # User management (admin)
│   │   │   ├── profile.api.ts       # User profile operations
│   │   │   ├── notifications.api.ts # Notification operations
│   │   │   └── messages.api.ts      # Project chat messages
│   │   ├── components/              # Reusable UI components
│   │   │   ├── auth/                # Authentication guards (RouteGuard)
│   │   │   ├── tasks/               # Task views (Board, Table, Calendar)
│   │   │   └── ui/                  # Base UI primitives (Button, Input, Toast, Dialog, etc.)
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── usePasswordStrength.ts
│   │   │   ├── useTheme.ts
│   │   │   └── useWebPush.ts
│   │   ├── lib/                     # Utility functions
│   │   │   ├── apiError.ts          # API error message extraction
│   │   │   └── utils.ts             # Class name utilities (cn)
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── auth/                # Login, ForceReset, ForgotPassword, ResetPassword
│   │   │   ├── admin/               # Admin dashboard, user management, reports
│   │   │   ├── pm/                  # Project Manager views (projects, tasks)
│   │   │   ├── collaborator/        # Collaborator views (tasks, projects)
│   │   │   └── profile/             # User profile page
│   │   ├── store/                   # Zustand state stores
│   │   │   ├── auth.store.ts        # Authentication state & JWT
│   │   │   ├── project.store.ts     # Active project context
│   │   │   └── toast.store.ts       # Toast notification queue
│   │   ├── App.tsx                  # Root component with routing
│   │   ├── main.tsx                 # Application entry point
│   │   └── index.css                # Global styles & design tokens
│   ├── index.html                   # HTML entry point
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   ├── vite.config.ts               # Vite build configuration
│   └── package.json
│
├── server/                          # Backend Express API
│   ├── prisma/
│   │   └── schema.prisma            # Database schema definition
│   ├── src/
│   │   ├── controllers/             # TSOA route controllers (one per resource)
│   │   │   ├── auth.controller.ts   # Login, password reset, forgot password
│   │   │   ├── project.controller.ts
│   │   │   ├── project-member.controller.ts
│   │   │   ├── task.controller.ts
│   │   │   ├── task-assignment.controller.ts
│   │   │   ├── comment.controller.ts
│   │   │   ├── attachment.controller.ts
│   │   │   ├── attachment-upload.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── notification.controller.ts
│   │   │   ├── message.controller.ts
│   │   │   ├── push.controller.ts
│   │   │   ├── admin.controller.ts
│   │   │   └── system.controller.ts
│   │   ├── services/                # Business logic layer
│   │   │   ├── auth.service.ts      # Authentication & password management
│   │   │   ├── project.service.ts
│   │   │   ├── project-member.service.ts
│   │   │   ├── task.service.ts
│   │   │   ├── task-assignment.service.ts
│   │   │   ├── comment.service.ts
│   │   │   ├── attachment.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── message.service.ts
│   │   │   ├── mail.service.ts      # SMTP email delivery
│   │   │   ├── push.service.ts      # Web push notification delivery
│   │   │   ├── s3.service.ts        # S3-compatible object storage
│   │   │   └── permission.service.ts # RBAC permission checks
│   │   ├── schemas/                 # Zod validation schemas
│   │   │   ├── user.schema.ts
│   │   │   ├── project.schema.ts
│   │   │   ├── task.schema.ts
│   │   │   ├── comment.schema.ts
│   │   │   ├── attachment.schema.ts
│   │   │   ├── membership.schema.ts
│   │   │   └── task-assignment.schema.ts
│   │   ├── middlewares/             # Express middleware
│   │   │   ├── authentication.ts    # JWT verification & RBAC scope checks
│   │   │   └── validate.middleware.ts # Zod request validation
│   │   ├── utils/                   # Utility functions
│   │   │   ├── apiError.util.ts     # Custom ApiError class
│   │   │   ├── response.util.ts     # Standardized API response helpers
│   │   │   ├── hash.util.ts         # Argon2 password hashing
│   │   │   └── jwt.util.ts          # JWT generation & verification
│   │   ├── lib/                     # Core library modules
│   │   │   ├── prisma.ts            # Prisma client singleton
│   │   │   └── socket.ts            # Socket.IO server & room management
│   │   ├── templates/               # HTML email templates
│   │   ├── scripts/                 # Utility scripts
│   │   │   ├── seed.ts              # Database seeder (Admin, PM, Test users)
│   │   │   ├── generate-vapid.ts    # VAPID key pair generator
│   │   │   └── copy-templates.js    # Build script for email templates
│   │   ├── index.ts                 # Server entry point & global error handler
│   │   ├── routes.ts                # TSOA auto-generated routes
│   │   └── swagger.json             # TSOA auto-generated OpenAPI spec
│   ├── tsoa.json                    # TSOA configuration
│   ├── Dockerfile
│   └── package.json
│
├── types/                           # Shared TypeScript type definitions
│   └── index.ts                     # Interfaces, enums, API response wrappers
│
├── _project-plan/                   # Project planning documents
│   ├── Project SRS.md               # Software Requirements Specification
│   ├── Project Tasks.md             # Task distribution & roadmap
│   └── API Specification.md         # API endpoint specification
│
├── docker-compose.yml               # Multi-service Docker orchestration
├── pnpm-workspace.yaml              # Monorepo workspace configuration
├── package.json                     # Root scripts (dev, build, prod, lint, format)
├── tsconfig.json                    # Root TypeScript configuration
├── .prettierrc                      # Prettier formatting rules
├── .editorconfig                    # Editor configuration
├── CONTRIBUTING.md                  # Development & contribution guide
└── README.md                        # Merged readme file
```

---

## 📦 Prerequisites

Before installing the application, ensure the following are installed:

- **[Node.js](https://nodejs.org/)** v18 or higher.
- **[pnpm](https://pnpm.io/installation)** (v8+) — install globally: `npm install -g pnpm`.
- **[PostgreSQL](https://www.postgresql.org/)** — running database instance (local, Docker container, or cloud database like Supabase).
- **AWS S3-compatible bucket** (for storing task and chat attachments).
- **SMTP Credentials** (Gmail App Password, Resend, Sendgrid, etc., for system emails).

---

## ⚙️ Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Sasivarnasarma/nexTask.git
cd nexTask
```

### 2. Install Workspace Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

#### Backend configuration (`server/.env`)

Create the server env file:

```bash
cp server/.env.sample server/.env
```

Open `server/.env` and edit with your custom settings (see the [Environment Variables](#-environment-variables) section below).

> **Tip:** To generate your required VAPID keys for push notifications, run the key generator script:
>
> ```bash
> pnpm --filter @nextask/server exec ts-node src/scripts/generate-vapid.ts
> ```

#### Frontend configuration (`client/.env`)

Create the client env file:

```bash
cp client/.env.sample client/.env
```

Ensure the API endpoint points to your active backend instance:

```env
VITE_API_URL="http://localhost:3000"
```

### 4. Initialize Database Schemas

Generate the Prisma client and push the migrations to your active database:

```bash
cd server
pnpm prisma generate
npx prisma db push
```

### 5. Seed the Database

Seed the database with standard, out-of-the-box user accounts (Admin, PM, Collaborator):

```bash
# Run from the root directory
pnpm seed
```

#### Seeding Credentials:

| Role                | Email               | Temporary Password |
| :------------------ | :------------------ | :----------------- |
| **Admin**           | `admin@example.com` | `ChangeMe!123`     |
| **Project Manager** | `pm@example.com`    | `Password123!`     |
| **Collaborator**    | `test@example.com`  | `Temporary!1`      |

> **Note:** Seeded accounts are flagged with `mustResetPassword=true` and will trigger a forced password change upon their first successful login.

---

## 🔑 Environment Variables

Create `server/.env` using the template below:

```env
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/nextask?schema=public"

# Server Execution Config
PORT=3000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"

# JWT Auth Secrets
JWT_SECRET="your_jwt_access_secret_min_32_characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_min_32_characters"
JWT_REFRESH_EXPIRES_IN="7d"

# SMTP Transactional Mail (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
SMTP_SECURE=true
MAIL_FROM="\"nexTask Notifications\" <your-email@gmail.com>"

# Frontend URL (for email links)
CLIENT_URL="http://localhost:5173"

# AWS S3 / Cloud Storage Config
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your_aws_s3_access_key_id"
AWS_SECRET_ACCESS_KEY="your_aws_s3_secret_access_key"
S3_BUCKET_NAME="your-s3-bucket-name"

# VAPID Web Push Keys
VAPID_PUBLIC_KEY="your_generated_vapid_public_key"
VAPID_PRIVATE_KEY="your_generated_vapid_private_key"
VAPID_SUBJECT="mailto:your-email@gmail.com"
```

---

## 💻 Running the Application

All execution scripts should be run from the **root directory** of the monorepo.

### Running in Development Mode

Starts both the Vite frontend dev server and Express backend concurrently with hot-reloads:

```bash
pnpm dev
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:3000](http://localhost:3000)
- **Swagger Documentation Sandbox**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### Running in Production Mode

Builds all packages and starts the production-ready build:

```bash
pnpm prod
```

### Additional Monorepo Utility Scripts

- **Typecheck codebases**: `pnpm typecheck`
- **Lint files**: `pnpm lint`
- **Auto-format code**: `pnpm format`

---

## 🐳 Docker Orchestration

To run the entire stack (PostgreSQL, Express API, and Nginx hosting the React bundle) in containerized environments:

```bash
# Build and launch containers
docker-compose up --build
```

### Container Services Mapping

| Container / Service           | Container Port | Exposed Host Port  |
| :---------------------------- | :------------- | :----------------- |
| **`postgres-db`**             | `5432`         | `5432`             |
| **`backend-api`**             | `3000`         | `3000`             |
| **`frontend-client` (Nginx)** | `80`           | `8888` (or `8080`) |

### Teardown Commands

```bash
# Stop containers
docker-compose down

# Stop and wipe databases (cleans volumes)
docker-compose down -v
```

---

## 📡 API Usage & Swagger Documentation

TSOA automatically generates the OpenAPI schema directly from the backend TypeScript controllers. The live, interactive Swagger UI sandbox is hosted at:

### 👉 [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### API Response Format

Every API endpoint responds using a unified JSON wrapper:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {
    "id": "task-uuid",
    "title": "Launch Website"
  },
  "errors": null
}
```

When validation fails or an exception occurs, the response matches the following format:

```json
{
  "success": false,
  "message": "Validation failed.",
  "data": null,
  "errors": {
    "body.email": "Invalid email format.",
    "body.password": "Password must be at least 8 characters."
  }
}
```

### Authentication Header

To query protected API endpoints, obtain a token via `POST /auth/login` and include it as a Bearer token in the request header:

```http
Authorization: Bearer <your-jwt-token>
```

### Key API Endpoint Groups

| Group             | Base Path                 | Description                                                |
| :---------------- | :------------------------ | :--------------------------------------------------------- |
| **Auth**          | `/auth`                   | Handles logins, password resets, and forgot-password flows |
| **Users**         | `/users`                  | Profile updates, admin-level CRUD, and activity logs       |
| **Projects**      | `/projects`               | Project CRUD, members management, and status updates       |
| **Tasks**         | `/tasks`                  | Task CRUD, Kanban drag-and-drop positions, and filtering   |
| **Comments**      | `/tasks/:taskId/comments` | Task-specific comment threads                              |
| **Attachments**   | `/attachments`            | Storage uploads, downloads, and presigned S3 URLs          |
| **Notifications** | `/notifications`          | Query and mark in-app notifications as read                |
| **Messages**      | `/messages`               | Project-scoped live chat messaging                         |
| **Push**          | `/push`                   | VAPID push notification subscription registrations         |

---

## 🗄️ Database Design

The relational PostgreSQL database is designed and maintained through Prisma.

### Core Database Entities

| Table                   | Description                                                                      |
| :---------------------- | :------------------------------------------------------------------------------- |
| **`User`**              | Houses user details, global system roles, and status fields.                     |
| **`Project`**           | Represents top-level project containers.                                         |
| **`ProjectMember`**     | Many-to-many junction mapping users to projects with custom project-level roles. |
| **`Task`**              | Individual task records belonging to projects.                                   |
| **`TaskAssignment`**    | Many-to-many junction mapping users to tasks.                                    |
| **`TaskActivity`**      | Read-only audit log capturing every edit, assignment, or movement of a task.     |
| **`Comment`**           | User comments left on tasks.                                                     |
| **`Attachment`**        | S3 metadata records referencing uploaded files.                                  |
| **`Message`**           | Message records representing project-scoped chat.                                |
| **`MessageAttachment`** | S3 metadata records referencing files uploaded to chat.                          |
| **`Notification`**      | System notifications pushed to users.                                            |
| **`PushSubscription`**  | Browser endpoints for Web Push notification delivery.                            |

### Entity-Relationship (ER) Diagram

The visual database schema is documented in `ER_Diagram.png`:

![nexTask ER Diagram](./ER_Diagram.png)

---

## 🛡️ Security Model

nexTask is built upon OWASP Top 10 security recommendations to prevent vulnerabilities:

| Threat Category                | Mitigation Strategy                                                                      |
| :----------------------------- | :--------------------------------------------------------------------------------------- |
| **SQL Injection**              | Prisma ORM uses parameterized queries, neutralizing injection vectors.                   |
| **XSS (Cross-Site Scripting)** | Inputs are validated against Zod schemas and sanitized on both client and server.        |
| **Credential Hijacking**       | Argon2 password hashing; JWT tokens expire rapidly; forced reset on first login.         |
| **Sensitive Data Exposure**    | HTTPS enforced in production; WebSockets secure (WSS); secrets loaded via env variables. |
| **Broken Access Control**      | Strictly guarded RBAC checks enforced via TSOA `@Security` and Express middlewares.      |
| **Security Misconfiguration**  | Helmet.js secures headers; custom, restricted CORS policies.                             |
| **Insecure Dependencies**      | Strict dependency lockfiles; regular ESLint code audits.                                 |

### Password Complexity Rules

- Must contain at least **8 characters**.
- Must contain at least one **lowercase letter**, one **uppercase letter**, one **number**, and one **special character**.

---

## 🧪 Testing Suite

The testing suite contains:

- **API Contract Testing**: Verifies that JSON structures match types.
- **Integration Testing**: Confirms seamless flows across database, services, and controllers.
- **Validation Suite**: Asserts that Zod filters invalid schemas.
- **Access Control Verification**: Asserts that unauthorized roles are blocked.
- **Real-Time Testing**: Asserts that WebSocket connections and notifications function correctly.

---

## 🚀 CI/CD Pipeline

The project uses **GitHub Actions** for continuous integration, executing the following steps on every PR or push to `main`:

```yaml
Pipeline Steps: 1. Set up Node.js environment
  2. Install dependencies (pnpm install)
  3. Validate Prisma database schema syntax
  4. Build types and compile shared workspaces
  5. Run TypeScript compiler type checking (pnpm typecheck)
  6. Run linter checks (pnpm lint)
  7. Verify production build compilation (Vite & Express compilation)
  8. Verify Docker image build capability
```

---

## 👥 Team Member Contributions

Development was structured across **5 phases** with tasks distributed among team members:

### Member A — Infrastructure & Real-Time Systems

| Phase       | Task ID     | Description                                                                                                                   |
| :---------- | :---------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **Phase 0** | T0.1 – T0.5 | **System Initialization** — Monorepo scaffolding, backend/API config, database schema, frontend foundations, containerization |
| **Phase 1** | T1.1        | **Authentication Engine** — Argon2 hashing, JWT generation/verification, login & registration endpoints                       |
| **Phase 2** | T2.1        | **Web Push System** — VAPID key generation, push subscription management, service worker integration                          |
| **Phase 3** | T3.1        | **Multi-Assignee Task APIs** — Assign, unassign, bulk assign, and list assignees                                              |
| **Phase 4** | T4.1        | **WebSocket Integration** — Socket.IO with project-scoped rooms, real-time Kanban updates                                     |

### Member B — Data Services & Collaboration

| Phase       | Task ID | Description                                                                                  |
| :---------- | :------ | :------------------------------------------------------------------------------------------- |
| **Phase 1** | T1.2    | **Task Services** — Prisma-based CRUD services, TSOA controllers with standardized responses |
| **Phase 2** | T2.2    | **Collaboration & S3 Upload** — Comment system, presigned S3 URLs, cascade deletion          |
| **Phase 3** | T3.2    | **Data Integrity & Validation** — Zod schemas, XSS prevention, strict type enforcement       |
| **Phase 4** | T4.2    | **Onboarding Mail Service** — SMTP setup, HTML email templates, welcome emails               |

### Member C — UI/UX & Security

| Phase       | Task ID | Description                                                                              |
| :---------- | :------ | :--------------------------------------------------------------------------------------- |
| **Phase 1** | T1.3    | **Base Layout UI** — Dashboard shell, sidebar, navigation bar, routing, protected routes |
| **Phase 2** | T2.3    | **Task Visualization** — Kanban board, task cards, list/table views, task detail modals  |
| **Phase 3** | T3.3    | **RBAC Enforcement** — Hybrid authorization middleware (global + project-level roles)    |
| **Phase 4** | T4.3    | **Task Assignment Mail Service** — Email notifications for task assignment events        |

### Member D — Project Management & Admin

| Phase       | Task ID | Description                                                                                             |
| :---------- | :------ | :------------------------------------------------------------------------------------------------------ |
| **Phase 1** | T1.4    | **User Onboarding Flows** — First-login password reset, profile editing, password complexity validation |
| **Phase 2** | T2.4    | **Project Management APIs** — Project CRUD, complete, archive endpoints                                 |
| **Phase 3** | T3.4    | **Backend Search & Filter APIs** — Text search, task filtering, team member autocomplete                |
| **Phase 4** | T4.4    | **Admin Management** — User management dashboard, role assignment, deactivation, audit logs             |

### Member E — Frontend Features & Analytics

| Phase       | Task ID | Description                                                                                        |
| :---------- | :------ | :------------------------------------------------------------------------------------------------- |
| **Phase 1** | T1.5    | **Error Infrastructure** — Toast notification system, API error mapping                            |
| **Phase 2** | T2.5    | **Project Membership APIs** — Membership endpoints, project-specific role assignments              |
| **Phase 3** | T3.5    | **Frontend Search & Filter UI** — Project switcher, member management, search/filter controls      |
| **Phase 4** | T4.5    | **Analytics & Reporting** — Project status dashboard, priority/status charts, productivity metrics |

---

## 📦 Project Deliverables & Documentation

All project deliverables and diagrams are organized across the repository:

| Deliverable                     | Location                                                                      | Description                                                           |
| :------------------------------ | :---------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Source Code**                 | [`/client`](client/), [`/server`](server/), [`/types`](types/)                | Full-stack TypeScript monorepo source code                            |
| **API Documentation (Swagger)** | [http://localhost:3000/api-docs](http://localhost:3000/api-docs)              | Live sandbox Swagger UI documentation                                 |
| **API Documentation (Offline)** | [`/docs/api-documentation.md`](docs/api-documentation.md)                     | Complete endpoint and WebSocket events reference                      |
| **ER Diagram & DB Design**      | [`/docs/database-design.md`](docs/database-design.md)                         | Database model schema, tables, indexes, and relations                 |
| **Class Diagram**               | [`/docs/class-diagram.md`](docs/class-diagram.md)                             | UML class diagram of the backend system architecture                  |
| **Deployment Diagram**          | [`/docs/deployment-diagram.md`](docs/deployment-diagram.md)                   | System deployment model, Docker configurations, security architecture |
| **Prisma Schema**               | [`/server/prisma/schema.prisma`](server/prisma/schema.prisma)                 | Declarative Prisma schema model definitions                           |
| **Project SRS**                 | [`/_project-plan/Project SRS.md`](_project-plan/Project%20SRS.md)             | Software Requirements Specification document                          |
| **API Specification Draft**     | [`/_project-plan/API Specification.md`](_project-plan/API%20Specification.md) | Pre-development endpoint design specification                         |
| **Task Distribution Plan**      | [`/_project-plan/Project Tasks.md`](_project-plan/Project%20Tasks.md)         | Project roadmap, phases, and task mapping                             |
| **Contributing Guidelines**     | [`/CONTRIBUTING.md`](CONTRIBUTING.md)                                         | Development workflows and styling rules                               |

---

## 📄 License

This project is developed solely for academic purposes as part of a web application development group project. All rights reserved.
