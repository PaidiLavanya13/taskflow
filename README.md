# TaskFlow — Team Task Manager

A full-stack web application for managing projects, assigning tasks, and tracking team progress with role-based access control.

## 🌐 Live Demo
> Deploy to Railway and update this with your live URL

## 🚀 Features

### Authentication
- JWT-based authentication (signup/login)
- Passwords hashed with bcrypt
- Token stored in localStorage, auto-refreshed on page load
- First registered user automatically becomes Admin

### Role-Based Access Control
| Feature | Admin | Member |
|---|---|---|
| View all projects | ✅ | ✅ (own/assigned) |
| Create projects | ✅ | ✅ |
| Delete any project | ✅ | Own only |
| Manage team members | ✅ | Project owners |
| Change user roles | ✅ | ❌ |
| View all users | ✅ | ❌ |
| Create/edit tasks | ✅ | Project members |
| Delete any task | ✅ | Own tasks only |

### Projects
- Create, edit, archive, and delete projects
- Add/remove team members by email search
- View project member list with roles
- Kanban board view per project (Todo / In Progress / Done)
- Progress tracking with visual progress bar

### Tasks
- Create tasks with title, description, priority, due date, and assignee
- Assign tasks to project members only
- Update task status (Todo → In Progress → Done)
- Filter by project, status, priority, overdue
- Mark tasks as done with one click

### Dashboard
- Live stats: total tasks, todo, in progress, done, overdue
- Overdue alert banner
- My tasks widget (assigned to me)
- Project progress overview

### Team Management (Admin)
- View all registered users
- Promote/demote users between Admin and Member roles

## 🛠 Tech Stack

- **Backend**: Node.js + Express 5
- **Database**: SQLite (via sql.js — pure JavaScript, no native bindings)
- **Auth**: JWT + bcryptjs
- **Frontend**: Vanilla JS SPA (no framework needed)
- **Fonts**: Syne + DM Sans (Google Fonts)

## 📁 Project Structure

```
taskflow/
├── server.js           # Express app entry point
├── db.js               # Database initialization & helpers
├── middleware/
│   └── auth.js         # JWT auth middleware + adminOnly guard
├── routes/
│   ├── auth.js         # POST /signup, POST /login, GET /me
│   ├── projects.js     # CRUD + member management
│   ├── tasks.js        # CRUD + dashboard stats + filters
│   └── users.js        # List, search, role management
├── public/
│   └── index.html      # Full SPA frontend
├── .env.example
├── railway.toml
├── Procfile
└── package.json
```

## 🔌 REST API Reference

### Auth
```
POST   /api/auth/signup       Register (first user = admin)
POST   /api/auth/login        Login
GET    /api/auth/me           Get current user
```

### Projects
```
GET    /api/projects          List accessible projects
POST   /api/projects          Create project
GET    /api/projects/:id      Get project + members
PUT    /api/projects/:id      Update project
DELETE /api/projects/:id      Delete project (+ all tasks)
POST   /api/projects/:id/members        Add member by email
DELETE /api/projects/:id/members/:uid   Remove member
```

### Tasks
```
GET    /api/tasks             List tasks (filters: project_id, status, priority, assignee_id, overdue)
GET    /api/tasks/dashboard   Dashboard stats
POST   /api/tasks             Create task
GET    /api/tasks/:id         Get task details
PUT    /api/tasks/:id         Update task
DELETE /api/tasks/:id         Delete task
```

### Users (Admin)
```
GET    /api/users             List all users
GET    /api/users/search?q=   Search users
PUT    /api/users/:id/role    Change user role
GET    /api/users/me/tasks    Get my assigned tasks
```

## ⚙️ Local Development

```bash
# Clone the repo
git clone <your-repo-url>
cd taskflow

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env: set JWT_SECRET to a strong random string

# Run the app
npm start
# → http://localhost:3000
```

## 🚂 Deploy to Railway

### Option 1: GitHub Integration (Recommended)
1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variable: `JWT_SECRET=your-random-secret-here`
5. Railway auto-detects Node.js and deploys

### Option 2: Railway CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
railway vars set JWT_SECRET=your-random-secret-here
```

### Environment Variables on Railway
| Variable | Value |
|---|---|
| `JWT_SECRET` | Any long random string (e.g. 64 char hex) |
| `PORT` | Set automatically by Railway |
| `NODE_ENV` | `production` |

### ⚠️ Note on Database Persistence
This app uses SQLite stored in the `/data` directory. Railway's ephemeral filesystem means **data resets on redeploy**. For production use, add a PostgreSQL plugin in Railway and migrate the schema. The sql.js queries are standard SQL and easy to migrate.

For the assignment, this works perfectly — just register your users after deploying.

## 🧪 Quick Test Flow

1. Register as first user → you're automatically Admin
2. Create a project
3. Register a second user (open incognito) → they're a Member
4. In your Admin account, go to the project → Add Member (search by their email)
5. Create tasks and assign them to the member
6. Login as the member → see only their projects/tasks
7. Mark tasks as done, watch the dashboard update

## 🔐 Security Features
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire in 7 days
- Role checks on every protected endpoint
- Project membership verified before task assignment
- XSS protection via HTML escaping in frontend

## 📦 Dependencies
```json
{
  "express": "^5.2.1",
  "sql.js": "^1.12.0",
  "bcryptjs": "^3.0.3",
  "jsonwebtoken": "^9.0.3",
  "cors": "^2.8.6",
  "dotenv": "^17.4.2"
}
```

---
Built with ❤️ for the assignment. Full-stack, role-based, deployed.
