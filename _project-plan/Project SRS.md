# **nexTask \- Collaborative Task Management System**

nexTask is a professional, full-stack, real-time Task Management System (TMS) designed for teams to plan, organize, track, and complete tasks efficiently. This application leverages a type-safe TypeScript architecture, real-time communication via WebSockets, and a robust Role-Based Access Control (RBAC) system.

## **🚀 Project Overview**

The nexTask system provides a structured environment for managing the project lifecycle. By centralizing task details, updates, and communication, it enhances collaboration, improves accountability, and reduces confusion within the team.

### **Key Capabilities:**

- **Real-Time Collaboration:** Instant updates for task assignments, status changes, and comments via WebSockets (Socket.io).
- **Web Push Notifications:** Cross-device browser notifications that reach users even when the application is not actively open.
- **Role-Based Access Control (RBAC):** Tiered permissions for Administrators, Project Managers, and Collaborators.
- **Automated Workflows:** Email onboarding via SMTP and mandatory password resets for new users.
- **Secure Architecture:** JWT-based session management, Argon2 password hashing, and SQL injection prevention.

## **🛠 Tech Stack**

### **Frontend**

- **Framework:** React with Vite (TypeScript)
- **Styling:** Tailwind CSS \+ shadcn/ui
- **State Management:**
  - **React Query (TanStack):** For server-state synchronization and caching.
  - **Zustand:** For lightweight client-side state (Auth & UI).
- **Notifications:** Service Workers & Push API
- **Communication:** Axios & Socket.io-client

### **Backend**

- **Architecture:** MVC (Model-View-Controller) Pattern
- **Runtime:** Node.js (TypeScript)
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL (Storing user profiles, tasks, and push subscriptions)
- **Real-Time:** Socket.io (WSS) & **Web-Push** (VAPID protocol)
- **Storage:** S3-Compatible Object Storage (AWS S3, Cloudflare R2, MinIO) via presigned URLs
- **Mailing:** SMTP (Nodemailer)
- **Documentation:** tsoa (Auto-generated OpenAPI/Swagger)

### **DevOps & Tooling**

- **Package Manager:** pnpm (Workspaces Monorepo)
- **Containerization:** Docker & Docker Compose
- **CI/CD:** Automated pipelines for cloud deployment (AWS/Azure/GCP)

## **📂 Project Structure**

The project follows a clean, modular folder structure using pnpm workspaces as per SRS requirements.

/nexTask  
├── /server \# Express API \+ Prisma \+ WebSockets  
│ ├── /src  
│ │ ├── /controllers \# tsoa-decorated controllers (Handling requests)  
│ │ ├── /services \# Business logic (Task, User, & Push services)  
│ │ ├── /middlewares \# JWT Auth, RBAC, & Validation  
│ │ ├── /sockets \# WebSocket event handlers  
│ │ ├── /mail \# SMTP/Nodemailer templates  
│ │ ├── /utils \# Hashing (Argon2), Validators, & VAPID keys  
│ │ └── index.ts \# Server entry point  
│ ├── prisma/ \# Schema including PushSubscription model  
│ ├── Dockerfile \# Backend containerization  
│ └── tsoa.json \# Swagger generation configuration  
│  
├── /client \# Vite \+ React \+ shadcn/ui  
│ ├── /public  
│ │ └── sw.js \# Service Worker for Push Notifications  
│ ├── /src  
│ │ ├── /api \# React Query & Axios configuration  
│ │ ├── /components \# shadcn/ui & reusable UI components  
│ │ ├── /hooks \# Socket.io & Web Push subscription hooks  
│ │ ├── /store \# Zustand state management  
│ │ └── /pages \# Application views (Dashboard, Tasks, Auth)  
│ ├── Dockerfile \# Frontend containerization  
│ └── tailwind.config.js  
│  
├── /types \# Shared TypeScript Interfaces  
│ ├── index.ts \# Source of truth for Client & Server  
│ └── package.json  
│  
├── /docs \# Project Documentation Artifacts  
│ ├── diagrams/ \# ER, Class, DB Design & Deployment diagrams  
│ └── specifications/ \# SRS references  
├── docker-compose.yml \# Orchestrates Server, Client, & PostgreSQL  
├── pnpm-workspace.yaml \# Monorepo configuration  
└── README.md

## **⚙️ Functional Requirements**

### **1\. User Authentication & Session Management**

- **JWT-Based Session:** Generates a signed JWT containing User ID, Role, and Expiration.
- **Onboarding Workflow:** Admin creates user \-\> System sends email with temporary password \-\> **Mandatory password reset** on first login.
- **Security:** **Argon2** hashing for credentials; plain-text passwords are never stored.

### **2\. Authorization & RBAC**

- **Administrator (Admin):** Full user management and searchable/filterable user lists.
- **Project Manager:** Create/manage projects/tasks, assign users, and monitor progress.
- **Collaborator:** View assigned tasks, update status, and add comments/attachments. Forbidden from deleting tasks or modifying restricted fields (403 Forbidden).

### **3\. Task Management**

- **Attributes:** Title (Mandatory), Description, Assigned User(s), Due Date (Future-only), Priority (Low, Medium, High), and Status (To Do, In Progress, Completed).
- **Validation:** Assignment limited to existing users and strict format validation at both layers.
- **Views:** Kanban/Board and Table views with filtering/sorting.

### **4\. Notification Systems**

- **WebSockets (Socket.io):** Instant in-app alerts while the user is active.
- **Web Push Notifications:** \- **Multi-Device Support:** Users can enable notifications on multiple devices.
  - **Subscription Management:** Unique push subscriptions stored per device.
  - **Delivery:** System triggers push messages via the VAPID protocol to all registered devices upon task assignment or urgent updates.
- **Reliability:** Notification storage for offline users and reconnection retry logic using exponential backoff.

### **5\. File Attachments & S3-Compatible Storage**

- **Direct-to-S3 Uploads:** Files are uploaded directly from the client to S3-compatible storage using cryptographically signed PUT URLs, bypassing the Express server to optimize network throughput.
- **Private-by-Default Storage:** The S3 bucket/container is kept private. Short-lived (15-minute expiration) GET presigned URLs are generated in-memory on demand for secure rendering and download.
- **Self-Cleaning Storage:** Deleting tasks, comments, or attachments triggers the physical removal of their associated objects from R2/S3/MinIO before database metadata deletion to prevent orphaned data.
- **Multi-Provider Support:** Configurations support AWS S3, Cloudflare R2, and MinIO storage providers.

### **6\. Security & Error Handling**

- **Sanitization:** Input validation to prevent XSS and SQL Injection (Parameterized queries via Prisma).
- **Encryption:** All communication forced over HTTPS (TLS) and WSS.
- **Standardized Errors:** Structured responses include: Error code, Message, and Detailed Description.

## **🛠 Setup & Installation**

### **Prerequisites**

- Node.js (v18+)
- pnpm (npm install \-g pnpm)
- Docker & Docker Compose

### **Local Development**

1. **Clone & Install:** git clone \<repo\> && pnpm install
2. **VAPID Keys:** Generate VAPID keys for Web Push and add to server .env.
3. **Run Services:** docker-compose up \--build
4. **Migrations:** cd server && pnpm prisma migrate dev

## **🌳 Version Control (Git Flow)**

- **Feature Branches:** All development occurs on dedicated feature branches.
- **Pull Requests:** Mandatory peer reviews before merging.
- **Merge Strategy:** Use **merge commits** for a traceable project history.
- **Commits:** Meaningful, descriptive commit messages are required.

## **📄 Deliverables**

- **Source Code:** GitHub repository link.
- **Documentation:** Swagger UI (/api-docs), ER/Class/Deployment diagrams, and DB Design.
- **Live Demo:** Hosted working URLs for both Frontend and Backend.
