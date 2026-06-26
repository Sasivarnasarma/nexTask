# 🚀 nexTask - Collaborative Task Management System

nexTask is a professional, full-stack, real-time Task Management System (TMS) designed for teams to plan, organize, track, and complete tasks efficiently. This application leverages a type-safe TypeScript architecture, a robust Role-Based Access Control (RBAC) system, and is beautifully assembled inside a modern monorepo workspace.

## 🛠 Tech Stack

**Frontend (Client)**

- React via Vite (TypeScript)
- Tailwind CSS & shadcn/ui
- Zustand (State Management)
- React Query (TanStack)

**Backend (Server)**

- Node.js & Express (TypeScript)
- PostgreSQL Database
- Prisma ORM
- TSOA (Auto-generated OpenAPI/Swagger Docs)

**Architecture & Tooling**

- pnpm Workspaces Monorepo
- ESLint & Prettier
- Docker orchestration

---

## 📦 Prerequisites

- **[Node.js](https://nodejs.org/en/)** (v18+)
- **[pnpm](https://pnpm.io/installation)** (`npm install -g pnpm`)
- A running **PostgreSQL** database instance (or rely on the provided `docker-compose.yml`)

---

## ⚙️ Installation & Setup

**1. Clone the repository:**

```bash
git clone https://github.com/Sasivarnasarma/nexTask.git
cd nexTask
```

**2. Install all dependencies:**

```bash
pnpm install
```

**3. Configure Environment Variables:**

- Navigate to the `server/` directory.
- Duplicate the `.env.sample` into a new `.env` file.
- Configure your PostgreSQL `DATABASE_URL`.
- Set the `VITE_API_URL` inside the `client/.env` file.

**4. Initialize the Database Schema:**

```bash
cd server
npx prisma db push
# Alternatively you can track history via: npx prisma migrate dev --name init
```

---

## 💻 Running the Application

### Development Mode

Execute this command from the root directory to spin up both the Vite frontend server and the Express nodemon server concurrently using hot-reloading:

```bash
pnpm dev
```

### Production Mode

Execute this command to compile the backend via TypeScript, bundle the frontend, and run the deployed instances natively:

```bash
pnpm prod
```

### Swagger API Documentation

Once the server is running, the automated OpenAPI specifications generated securely by TSOA are available at:
👉 **`http://localhost:3000/api-docs`**

---

## 🐳 Docker Orchestration

If you want to spin up the entire application stack fully containerized alongside the postgres database layer, execute:

```bash
docker-compose up --build
```
