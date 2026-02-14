import { useState, useEffect } from 'react';
import * as api from '../api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setError('');

    try {
      const result = await api.createUser(inviteEmail, inviteRole);
      setTempPassword(result.tempPassword);
      setUsers(prev => [...prev, {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        is_disabled: 0,
        must_change_password: 1,
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCloseInvite = () => {
    setShowInvite(false);
    setInviteEmail('');
    setInviteRole('user');
    setTempPassword(null);
    setError('');
  };

  const handleDisable = async (userId) => {
    try {
      await api.disableUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_disabled: 1 } : u));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEnable = async (userId) => {
    try {
      await api.enableUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_disabled: 0 } : u));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('Reset password for this user? They will need to set a new password on next login.')) {
      return;
    }
    try {
      const result = await api.resetUserPassword(userId);
      alert(`Temporary password: ${result.tempPassword}\n\nPlease share this securely with the user.`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, must_change_password: 1 } : u));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) {
      return;
    }
    try {
      await api.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-management">
      <div className="user-actions">
        <button className="invite-user-btn" onClick={() => setShowInvite(true)}>
          + Invite User
        </button>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="users-list">
        {users.map(user => (
          <div key={user.id} className={`user-item ${user.is_disabled ? 'disabled' : ''}`}>
            <span className="user-email">{user.email}</span>
            <span className={`user-role ${user.role === 'admin' ? 'admin' : ''}`}>
              {user.role}
            </span>
            {user.must_change_password === 1 && (
              <span className="user-role" style={{ background: '#ffecb3', color: '#ff8f00' }}>
                pending
              </span>
            )}
            <div className="user-item-actions">
              {user.is_disabled ? (
                <button onClick={() => handleEnable(user.id)}>Enable</button>
              ) : (
                <button onClick={() => handleDisable(user.id)}>Disable</button>
              )}
              <button onClick={() => handleResetPassword(user.id)}>Reset PW</button>
              <button className="danger" onClick={() => handleDelete(user.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Invite User Modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={handleCloseInvite}>
          <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{tempPassword ? 'User Created' : 'Invite User'}</h2>
              <button className="modal-close" onClick={handleCloseInvite}>×</button>
            </div>
            <div className="modal-body">
              {tempPassword ? (
                <div className="temp-password-display">
                  <h4>User account created successfully!</h4>
                  <p>Share this temporary password securely with the user:</p>
                  <code>{tempPassword}</code>
                  <p>The user will be required to change this password on first login.</p>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="invite-form">
                  <div className="form-group">
                    <label htmlFor="inviteEmail">Email Address</label>
                    <input
                      type="email"
                      id="inviteEmail"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="inviteRole">Role</label>
                    <select
                      id="inviteRole"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {error && <div className="login-error">{error}</div>}

                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={handleCloseInvite}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={inviteLoading}>
                      {inviteLoading ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
