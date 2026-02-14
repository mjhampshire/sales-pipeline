const express = require('express');
const { queries } = require('./db');
const {
  generateToken,
  verifyToken,
  requireAdmin,
  hashPassword,
  comparePassword,
  generateTempPassword
} = require('./auth');

const router = express.Router();

// Check if setup is needed (no users exist)
router.get('/setup-status', async (req, res) => {
  try {
    const userCount = await queries.getUserCount();
    res.json({ needsSetup: userCount === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// First-time admin setup (only works when no users exist)
router.post('/setup', async (req, res) => {
  try {
    const userCount = await queries.getUserCount();
    if (userCount > 0) {
      return res.status(400).json({ error: 'Setup already completed' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await hashPassword(password);
    const result = await queries.createUser(email, passwordHash, 'admin', 0);
    const user = await queries.getUserById(result.lastInsertRowid);

    const token = generateToken(user);
    await queries.updateUserLastLogin(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mustChangePassword: false
      }
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await queries.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_disabled) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    await queries.updateUserLastLogin(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mustChangePassword: !!user.must_change_password
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user (requires token)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await queries.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: !!user.must_change_password
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password (requires token)
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await queries.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user must change password (first login), current password check is optional
    if (!user.must_change_password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required' });
      }

      const validPassword = await comparePassword(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const passwordHash = await hashPassword(newPassword);
    await queries.updateUserPassword(user.id, passwordHash, 0);

    // Generate new token with updated info
    const updatedUser = await queries.getUserById(user.id);
    const token = generateToken(updatedUser);

    res.json({
      success: true,
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        mustChangePassword: false
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ USER MANAGEMENT (Admin Only) ============

// Get all users
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await queries.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user (returns temporary password)
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email, role = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const result = await queries.createUser(email, passwordHash, role, 1); // must_change_password = 1
    const user = await queries.getUserById(result.lastInsertRowid);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mustChangePassword: true,
        isDisabled: false,
        createdAt: user.created_at
      },
      tempPassword
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Disable user
router.put('/users/:id/disable', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Cannot disable yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot disable your own account' });
    }

    const user = await queries.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await queries.disableUser(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enable user
router.put('/users/:id/enable', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await queries.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await queries.enableUser(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password (returns new temp password)
router.post('/users/:id/reset-password', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await queries.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await queries.updateUserPassword(userId, passwordHash, 1); // must_change_password = 1

    res.json({ tempPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Cannot delete yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await queries.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot delete last admin
    if (user.role === 'admin') {
      const adminCount = await queries.getAdminCount();
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin account' });
      }
    }

    await queries.deleteUser(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
