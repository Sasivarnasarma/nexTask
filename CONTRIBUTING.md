# 🚀 nexTask Development & Contribution Guide

Welcome to the **nexTask** development workspace! This guide is designed to get you and your team up and running quickly. It contains two distinct workflows: **Style 1: One-Time Local Setup** (getting the project running for the first time) and **Style 2: Every-Time Iterative Workflow** (how to build features and contribute code systematically).

---

## 💻 Style 1: One-Time Local Setup (First-time only)

Follow these steps when setting up the repository on your local computer for the first time.

### Step 1: Clone the Repository

Clone the repository using Git and navigate into the project root:

```bash
git clone https://github.com/Sasivarnasarma/nexTask.git
cd nexTask
```

### Step 2: Install PNPM (Package Manager)

nexTask uses a `pnpm` monorepo configuration. If you do not have `pnpm` installed globally, install it using NPM:

```bash
npm install -g pnpm
```

### Step 3: Install Workspace Dependencies

Install all package dependencies across the entire monorepo workspace (client, server, and shared types):

```bash
pnpm install
```

### Step 4: Environment Configurations (`.env`)

Both the backend server and frontend client require environment files to operate:

#### 1. Backend Config (`/server/.env`)

Create a `.env` file inside the `server/` directory:

```bash
# Copy the sample template
cp server/.env.sample server/.env
```

Open `server/.env` and update the values:

```env
# Connection string to your PostgreSQL instance (e.g., Supabase or Local PostgreSQL)
DATABASE_URL="postgresql://username:password@hostname:port/database?schema=nextask"
PORT=3000
JWT_SECRET="generate_a_secure_long_random_string_here"
ALLOW_PUBLIC_REGISTRATION="true"
```

#### 2. Frontend Config (`/client/.env`)

Create a `.env` file inside the `client/` directory:

```bash
# Copy the sample template
cp client/.env.sample client/.env
```

Ensure your API URL points to the backend server:

```env
VITE_API_URL="http://localhost:3000"
```

### Step 5: Database Setup & Prisma Migrations

You must generate the type-safe Prisma client and apply database migrations to align your database schema:

```bash
# 1. Generate the Prisma Client
cd server
pnpm prisma generate

# 2. Run Database Migrations to create tables in PostgreSQL
pnpm prisma migrate dev --name init
```

### Step 6: Launch the Development Server

From the root directory, run the parallel development startup command:

```bash
# Return to the root directory
cd ..

# Start the Node.js backend and React client simultaneously
pnpm dev
```

- **Backend Server**: http://localhost:3000 (Swagger docs available at http://localhost:3000/api-docs)
- **React Frontend**: http://localhost:5173

---

## 🔄 Style 2: Every-Time Iterative Workflow (Daily Coding & Contributing)

Follow this workflow every time you start working on a new task or feature to maintain database synchronicity, code standardizations, and merge conflict-free development.

### Step 1: Get the Latest Updates

Before writing any code, always pull the latest changes from GitHub into your local `main` branch to avoid branch divergence:

```bash
# 1. Switch to the main branch
git checkout main

# 2. Pull the latest commits
git pull
```

### Step 2: Create a Feature Branch

Create a new branch dedicated to the specific task you are working on. Use our standard branch naming conventions:

| Category           | Prefix      | Example Branch Name           |
| :----------------- | :---------- | :---------------------------- |
| **New Features**   | `feature/`  | `feature/task-crud-endpoints` |
| **Bug Fixes**      | `bugfix/`   | `bugfix/session-expiry-fix`   |
| **Refactoring**    | `refactor/` | `refactor/user-validation`    |
| **Chores/Configs** | `chore/`    | `chore/add-eslint-rules`      |

Command:

```bash
git checkout -b feature/your-feature-name
```

### Step 3: Write Code & Format

Implement your changes.

- You can run `pnpm format` in the root directory at any time to format all files in the codebase manually.

### Step 4: Write Meaningful Commits

Keep commits granular and write meaningful, conventional commit messages:

- ❌ _Avoid generic messages_: `git commit -m "done"` or `git commit -m "fixed stuff"`
- ✔️ _Use structured labels_:
  - `feat(auth): add password reset validation rules`
  - `fix(task): resolve null date input crash on database update`
  - `chore(configs): optimize nodemon build watch list`

Command:

```bash
git add .
git commit -m "feat(domain): descriptive commit message here"
```

### Step 5: Publish the Branch to GitHub

Push your local branch to the remote repository:

```bash
git push -u origin feature/your-feature-name
```

### Step 6: Collaborate & Notify Team

Share your progress! Notify your team members in the group chat so that collaborators can:

1.  Review your code directly on GitHub.
2.  Pull your branch locally (`git checkout feature/your-feature-name`) to run local tests or build supplementary frontend/backend changes.

### Step 7: Create a Pull Request (PR)

Once the code has been reviewed by the team and everyone is satisfied:

1.  Go to the GitHub repository online.
2.  Click **Compare & Pull Request**.

### Step 8: Start Your Next Task!

Now that your task is completed and merged, reset your workspace and repeat from **Step 1**:

```bash
git checkout main
git pull
pnpm install
git checkout -b feature/my-next-feature-name
```
