const express = require('express');
const { run, get, all } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - list projects for user
router.get('/', auth, (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    projects = all(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `);
  } else {
    projects = all(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.owner_id = ? OR pm.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.id, req.user.id]);
  }
  res.json({ projects });
});

// POST /api/projects - create project
router.post('/', auth, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  run(
    'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
    [name.trim(), description || '', req.user.id]
  );
  const project = get('SELECT * FROM projects WHERE owner_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);

  // Auto-add creator as admin member
  run('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
    [project.id, req.user.id, 'admin']);

  res.status(201).json({ project });
});

// GET /api/projects/:id
router.get('/:id', auth, (req, res) => {
  const project = get(`
    SELECT p.*, u.name as owner_name
    FROM projects p JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `, [req.params.id]);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Check access
  if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
    const member = get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.user.id]);
    if (!member) return res.status(403).json({ error: 'Access denied' });
  }

  const members = all(`
    SELECT u.id, u.name, u.email, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `, [req.params.id]);

  res.json({ project, members });
});

// PUT /api/projects/:id
router.put('/:id', auth, (req, res) => {
  const project = get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only project owner or admin can edit' });
  }

  const { name, description, status } = req.body;
  run(
    'UPDATE projects SET name = ?, description = ?, status = ? WHERE id = ?',
    [name || project.name, description ?? project.description, status || project.status, req.params.id]
  );

  res.json({ project: get('SELECT * FROM projects WHERE id = ?', [req.params.id]) });
});

// DELETE /api/projects/:id
router.delete('/:id', auth, (req, res) => {
  const project = get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only project owner or admin can delete' });
  }

  run('DELETE FROM tasks WHERE project_id = ?', [req.params.id]);
  run('DELETE FROM project_members WHERE project_id = ?', [req.params.id]);
  run('DELETE FROM projects WHERE id = ?', [req.params.id]);

  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:id/members - add member
router.post('/:id/members', auth, (req, res) => {
  const project = get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only project owner or admin can add members' });
  }

  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [req.params.id, user.id]);
  if (existing) return res.status(400).json({ error: 'User is already a member' });

  run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
    [req.params.id, user.id, role || 'member']);

  res.json({ message: 'Member added', user: { id: user.id, name: user.name, email: user.email } });
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', auth, (req, res) => {
  const project = get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only project owner or admin can remove members' });
  }

  run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
    [req.params.id, req.params.userId]);

  res.json({ message: 'Member removed' });
});

module.exports = router;
