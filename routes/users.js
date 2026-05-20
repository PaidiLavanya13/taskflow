const express = require('express');
const { run, get, all } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - list all users (admin only)
router.get('/', auth, adminOnly, (req, res) => {
  const users = all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
  res.json({ users });
});

// GET /api/users/search?q=email - search users (for adding to projects / assignee dropdown)
router.get('/search', auth, (req, res) => {
  const { q } = req.query;
  // If no query or short query, return ALL users (used for assignee dropdown population)
  if (!q || q.length < 1) {
    const users = all('SELECT id, name, email, role FROM users ORDER BY name LIMIT 50');
    return res.json({ users });
  }
  const users = all(
    `SELECT id, name, email, role FROM users 
     WHERE email LIKE ? OR name LIKE ? LIMIT 20`,
    [`%${q}%`, `%${q}%`]
  );
  res.json({ users });
});

// PUT /api/users/:id/role - change role (admin only)
router.put('/:id/role', auth, adminOnly, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or member' });
  }

  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
  res.json({ message: 'Role updated', user: { ...user, role, password: undefined } });
});

// GET /api/users/me/tasks - my assigned tasks
router.get('/me/tasks', auth, (req, res) => {
  const tasks = all(`
    SELECT t.*, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.assignee_id = ?
    ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
  `, [req.user.id]);
  res.json({ tasks });
});

module.exports = router;
