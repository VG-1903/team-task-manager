# Team Task Manager

A small full-stack app for teams to run projects, hand out tasks, and keep an eye on what's overdue. Two roles per project — Admin and Member — with sensible permissions.

Built with Express + Prisma + Postgres on the back, React + Vite on the front. JWT auth.

## What it does

- Sign up / log in (passwords hashed with bcrypt, JWT sessions)
- Create projects, add teammates by email, promote them to Admin or keep them as Member
- Create tasks with title, description, status, priority, due date, and assignee
- Kanban-style board per project (To Do / In Progress / Done)
- Cross-project dashboard with totals, overdue count, "assigned to me", and "due this week"
- Server-side validation (Zod), proper error responses, rate-limiting on auth

## Roles

- **Admin** — manages members, edits project settings, can reassign or delete any task, can delete the project.
- **Member** — creates tasks, edits tasks they created or are assigned to. Can't reassign others' tasks or change project settings.

The last Admin can't be demoted or removed, and the project owner can't be kicked out — just guardrails so you can't lock yourself out.

## Stack

- **Backend** — Node.js, Express, Prisma ORM, PostgreSQL, JWT, Zod, Helmet, express-rate-limit
- **Frontend** — React 18, React Router, Vite (no UI framework, just hand-rolled CSS)
- **DB** — PostgreSQL

## Project layout

```
team-task-manager/
├── server/                       # Express API + Prisma
│   ├── prisma/schema.prisma      # User, Project, ProjectMember, Task
│   └── src/
│       ├── server.js
│       ├── controllers/          # auth, projects, tasks, dashboard
│       ├── routes/
│       ├── middleware/           # JWT auth, project RBAC, error handler
│       └── utils/                # jwt, asyncHandler, seed
└── client/                       # React + Vite
    └── src/
        ├── App.jsx               # routes + auth guards
        ├── pages/                # Login, Signup, Dashboard, Projects, ProjectDetail
        ├── components/           # Navbar, Modal, TaskCard, TaskForm
        ├── context/AuthContext.jsx
        └── api/client.js
```

## Run it locally

You'll need Node 18+ and a Postgres instance. Easiest Postgres for dev:

```bash
docker run -d --name ttm-postgres -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ttm postgres:16
```

Then:

```bash
# 1. Env
cp server/.env.example server/.env
# Edit server/.env — set DATABASE_URL and JWT_SECRET

# 2. Install
npm run install:all
npm install                              # for the dev runner (concurrently)

# 3. Migrate
npm --prefix server run migrate:dev -- --name init

# 4. (Optional) seed demo accounts
npm --prefix server run seed
#   admin@example.com / admin123
#   member@example.com / member123

# 5. Go
npm run dev
```

Frontend at http://localhost:5173, API at http://localhost:4000. Vite proxies `/api/*` to the API in dev.

## API at a glance

All routes under `/api`. Auth header: `Authorization: Bearer <jwt>`.

**Auth**
- `POST /auth/signup` — `{ email, name, password }`
- `POST /auth/login` — `{ email, password }`
- `GET  /auth/me`

**Projects**
- `GET    /projects` — your projects
- `POST   /projects` — create (you become Admin)
- `GET    /projects/:id` — detail + members
- `PATCH  /projects/:id` *(admin)*
- `DELETE /projects/:id` *(admin)*
- `POST   /projects/:id/members` *(admin)* — `{ email, role }`
- `PATCH  /projects/:id/members/:memberId` *(admin)* — `{ role }`
- `DELETE /projects/:id/members/:memberId` *(admin)*

**Tasks** (scoped under a project)
- `GET    /projects/:id/tasks?status=&assigneeId=`
- `POST   /projects/:id/tasks`
- `GET    /projects/:id/tasks/:taskId`
- `PATCH  /projects/:id/tasks/:taskId` — admin or task creator/assignee; only admin can reassign
- `DELETE /projects/:id/tasks/:taskId` — admin or creator

**Dashboard**
- `GET /dashboard` — counts + lists (assigned to me, overdue, due soon, recently completed)

## Notes

- The Express server also serves the built React app from `client/dist/` in production, so it's a single deployable service.
- Migrations live in `server/prisma/migrations/`. Run `npm --prefix server run studio` to poke around the DB visually.
- All API errors come back as `{ "error": "...", "details": ... }` with appropriate HTTP status codes.

## License

MIT.
