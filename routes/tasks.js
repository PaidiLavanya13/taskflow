const express = require('express');
const { run, get, all } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

function hasProjectAccess(userId, userRole, projectId) {
  if (userRole === 'admin') return true;
  const project = get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) return false;
  if (project.owner_id === userId) return true;
  const member = get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
  return !!member;
}

// GET /api/tasks - get tasks (with filters)
router.get('/', auth, (req, res) => {
  const { project_id, status, assignee_id, priority, overdue } = req.query;
  let sql = `
    SELECT t.*, 
      u1.name as assignee_name, u1.email as assignee_email,
      u2.name as creator_name,
      p.name as project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
  `;
  const conditions = [];
  const params = [];

  // Access control
  if (req.user.role !== 'admin') {
    sql += `
      LEFT JOIN project_members pm ON t.project_id = pm.project_id
      LEFT JOIN projects p2 ON t.project_id = p2.id
    `;
    conditions.push('(p2.owner_id = ? OR pm.user_id = ?)');
    params.push(req.user.id, req.user.id);
  }

  if (project_id) { conditions.push('t.project_id = ?'); params.push(project_id); }
  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (assignee_id) { conditions.push('t.assignee_id = ?'); params.push(assignee_id); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
  if (overdue === 'true') {
    conditions.push("t.due_date < date('now') AND t.status != 'done'");
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' GROUP BY t.id ORDER BY t.created_at DESC';

  const tasks = all(sql, params);
  res.json({ tasks });
});

// GET /api/tasks/dashboard - dashboard stats
router.get('/dashboard', auth, (req, res) => {
  let projectFilter = '';
  let params = [];
  
  if (req.user.role !== 'admin') {
    projectFilter = `AND (p.owner_id = ${req.user.id} OR pm.user_id = ${req.user.id})`;
  }

  const stats = get(`
    SELECT 
      COUNT(DISTINCT t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END) as overdue
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN project_members pm ON t.project_id = pm.project_id
    WHERE 1=1 ${projectFilter}
  `, params);

  const projectStats = all(`
    SELECT p.id, p.name, p.status,
      COUNT(DISTINCT t.id) as task_count,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE 1=1 ${projectFilter}
    GROUP BY p.id
    ORDER BY task_count DESC
    LIMIT 5
  `, params);

  const recentTasks = all(`
    SELECT t.*, u.name as assignee_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN project_members pm ON t.project_id = pm.project_id
    WHERE 1=1 ${projectFilter}
    GROUP BY t.id
    ORDER BY t.updated_at DESC
    LIMIT 5
  `, params);

  const myTasks = all(`
    SELECT t.*, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.assignee_id = ? AND t.status != 'done'
    ORDER BY t.due_date ASC NULLS LAST
    LIMIT 5
  `, [req.user.id]);

  res.json({ stats, projectStats, recentTasks, myTasks });
});

// POST /api/tasks
router.post('/', auth, (req, res) => {
  const { title, description, project_id, assignee_id, priority, due_date, status } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Task title is required' });
  if (!project_id) return res.status(400).json({ error: 'Project ID is required' });

  if (!hasProjectAccess(req.user.id, req.user.role, project_id)) {
    return res.status(403).json({ error: 'Access denied to this project' });
  }

  // Auto-add assignee to project members if not already (admin assigning any user to task)
  if (assignee_id) {
    const assigneeUser = get('SELECT id FROM users WHERE id = ?', [assignee_id]);
    if (!assigneeUser) return res.status(400).json({ error: 'Assignee user not found' });
    run('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [project_id, assignee_id, 'member']);
  }

  run(`INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, priority, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title.trim(), description || '', project_id, assignee_id || null, req.user.id,
     priority || 'medium', due_date || null, status || 'todo']
  );

  const task = get(`
    SELECT t.*, u1.name as assignee_name, u2.name as creator_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.creator_id = ? ORDER BY t.id DESC LIMIT 1
  `, [req.user.id]);

  res.status(201).json({ task });
});

// GET /api/tasks/:id
router.get('/:id', auth, (req, res) => {
  const task = get(`
    SELECT t.*, u1.name as assignee_name, u1.email as assignee_email,
      u2.name as creator_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `, [req.params.id]);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!hasProjectAccess(req.user.id, req.user.role, task.project_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ task });
});

// PUT /api/tasks/:id
router.put('/:id', auth, (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!hasProjectAccess(req.user.id, req.user.role, task.project_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { title, description, status, priority, assignee_id, due_date } = req.body;

  run(`UPDATE tasks SET 
    title = ?, description = ?, status = ?, priority = ?, 
    assignee_id = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      title || task.title,
      description ?? task.description,
      status || task.status,
      priority || task.priority,
      assignee_id !== undefined ? assignee_id : task.assignee_id,
      due_date !== undefined ? due_date : task.due_date,
      req.params.id
    ]
  );

  const updated = get(`
    SELECT t.*, u1.name as assignee_name, u2.name as creator_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `, [req.params.id]);

  res.json({ task: updated });
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const project = get('SELECT * FROM projects WHERE id = ?', [task.project_id]);
  const canDelete = req.user.role === 'admin' ||
    task.creator_id === req.user.id ||
    (project && project.owner_id === req.user.id);

  if (!canDelete) return res.status(403).json({ error: 'Cannot delete this task' });

  run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
