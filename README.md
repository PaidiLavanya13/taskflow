# TaskFlow — Team Task Manager

TaskFlow is a full-stack web application for managing projects, assigning tasks, and tracking team progress with role-based access control (Admin / Member).

## Live Demo

Live URL:

https://web-production-4bd92.up.railway.app

GitHub Repository:

https://github.com/PaidiLavanya13/taskflow

---

## Features

### Authentication

* User signup and login
* JWT-based authentication
* Password hashing using bcrypt
* First registered user becomes **Admin**
* Subsequent users become **Members**
* Invalid login handling

### Role-Based Access Control

Admin users can:

* Create projects
* Delete projects
* Add/remove project members
* Create and assign tasks
* Manage project teams

Member users can:

* View assigned projects/tasks
* Update task status
* Cannot add/remove members
* Cannot delete projects

### Project Management

* Create projects
* Delete projects
* View project members
* Add/remove team members
* Track project tasks

### Task Management

* Create tasks
* Assign tasks to members
* Set:

  * Priority (Low / Medium / High)
  * Due date
  * Assignee
* Update status:

  * Todo
  * In Progress
  * Done

### Dashboard

View:

* Total tasks
* Todo count
* In Progress count
* Done count
* Overdue tasks
* Recent activity

### Deployment

* Deployed on Railway
* Public live URL accessible
* Environment variables configured
* Persistent storage configured

---

## Tech Stack

Frontend:

* HTML
* CSS
* Vanilla JavaScript

Backend:

* Node.js
* Express.js

Database:

* SQLite (`sql.js`)

Authentication:

* JWT
* bcryptjs

Deployment:

* Railway

---

## Local Setup

Clone repository:

```bash
git clone https://github.com/PaidiLavanya13/taskflow.git
cd taskflow
```

Install dependencies:

```bash
npm install
```

Run:

```bash
npm start
```

Open:

```txt
http://localhost:3000
```

---

## Test Flow

1. Register first user → becomes Admin
2. Register second user → becomes Member
3. Admin creates project
4. Admin adds member
5. Admin creates task
6. Assign task to member
7. Update task status
8. Dashboard updates automatically

---

## Submission

Live URL:

https://web-production-4bd92.up.railway.app

GitHub:

https://github.com/PaidiLavanya13/taskflow

---

Built for the **Team Task Manager Full-Stack Assignment** using Node.js, Express, SQLite, JWT authentication, and Railway deployment.
