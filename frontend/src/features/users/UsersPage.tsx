import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Button, Alert, Snackbar, Menu } from '@mui/material';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const defaultUsers = [
  { id: 1, full_name: 'Elena Smith', email: 'elena.s@interxchange.io', role: 'Admin', status: 'Active', last_login: '10 mins ago', created: 'Oct 12, 2023', initials: 'ES', avatar: null },
  { id: 2, full_name: 'Marcus Reed', email: 'm.reed@interxchange.io', role: 'Analyst', status: 'Active', last_login: '2 hours ago', created: 'Nov 05, 2023', initials: 'MR', avatar: null },
  { id: 3, full_name: 'Sarah Chen', email: 's.chen@interxchange.io', role: 'Editor', status: 'Pending', last_login: null, created: 'Dec 20, 2023', initials: 'SC', avatar: null },
  { id: 4, full_name: 'David Black', email: 'd.black@partner.io', role: 'Viewer', status: 'Active', last_login: 'Yesterday', created: 'Oct 01, 2023', initials: 'DB', avatar: null },
  { id: 5, full_name: 'Lisa Lowe', email: 'lisa.l@interxchange.io', role: 'Editor', status: 'Active', last_login: '3 days ago', created: 'Sep 15, 2023', initials: 'LL', avatar: null },
];

const defaultForm = { email: '', full_name: '', role: 'viewer', password: '' };

const InviteUserDialog: React.FC<{ open: boolean; onClose: () => void; onSave: () => void }> = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/users', form);
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to invite user');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Invite User</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label="Full Name" fullWidth required margin="normal" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <TextField label="Email" fullWidth required margin="normal" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="Role" fullWidth required select margin="normal" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {['admin', 'analyst', 'editor', 'viewer'].map((r) => (
              <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Sending...' : 'Invite'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const EditUserDialog: React.FC<{ user: any; open: boolean; onClose: () => void; onSave: () => void }> = ({ user, open, onClose, onSave }) => {
  const [form, setForm] = useState({ full_name: '', role: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name || '', role: user.role?.toLowerCase() || 'viewer', is_active: user.status === 'Active' });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/users/${user.id}`, form);
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label="Full Name" fullWidth required margin="normal" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <TextField label="Role" fullWidth required select margin="normal" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {['admin', 'analyst', 'editor', 'viewer'].map((r) => (
              <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
            ))}
          </TextField>
          <TextField label="Status" fullWidth select margin="normal" value={form.is_active ? 'active' : 'disabled'}
            onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.items || []);
    } catch {
      setUsers(defaultUsers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      setSnack({ message: 'User disabled', severity: 'success' });
      fetchUsers();
    } catch {
      setSnack({ message: 'Failed to disable user', severity: 'error' });
    }
    setMenuAnchor(null);
  };

  const handleResendInvite = async (id: number) => {
    try {
      await api.post(`/users/${id}/resend-invite`);
      setSnack({ message: 'Invitation resent', severity: 'success' });
    } catch {
      setSnack({ message: 'Failed to resend invite', severity: 'error' });
    }
    setMenuAnchor(null);
  };

  const filtered = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role?.toLowerCase() === roleFilter.toLowerCase();
    return matchSearch && matchRole;
  });

  const total = users.length;
  const active = users.filter(u => u.status === 'Active').length;
  const pending = users.filter(u => u.status === 'Pending').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-headline-lg text-on-surface mb-1">User Management</h2>
          <p className="text-body-lg text-on-surface-variant">Manage platform users, roles, and permissions.</p>
        </div>
        <button onClick={() => setInviteOpen(true)} className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all">
          <span className="material-symbols-outlined">person_add</span>
          Invite User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-center justify-between overflow-hidden relative">
          <div className="z-10">
            <p className="text-label-md text-on-surface-variant mb-2">Total Users</p>
            <h3 className="text-headline-lg">{total}</h3>
          </div>
          <div className="opacity-10 absolute -right-4 -bottom-4">
            <span className="material-symbols-outlined text-primary scale-[4]">group</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-center justify-between overflow-hidden relative">
          <div className="z-10">
            <p className="text-label-md text-on-surface-variant mb-2">Active</p>
            <h3 className="text-headline-lg text-primary">{active}</h3>
          </div>
          <div className="opacity-10 absolute -right-4 -bottom-4">
            <span className="material-symbols-outlined text-primary scale-[4]">check_circle</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-center justify-between overflow-hidden relative">
          <div className="z-10">
            <p className="text-label-md text-on-surface-variant mb-2">Pending</p>
            <h3 className="text-headline-lg text-tertiary">{pending}</h3>
          </div>
          <div className="opacity-10 absolute -right-4 -bottom-4">
            <span className="material-symbols-outlined text-tertiary scale-[4]">pending</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low p-4 rounded-t-xl border-x border-t border-outline-variant flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-1 focus:ring-primary text-body-md outline-none"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="appearance-none bg-surface border border-outline-variant rounded-lg px-4 py-2 pr-10 text-body-md font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border-x border-b border-outline-variant rounded-b-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low/50">
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((u) => (
                <tr key={u.id} className={`hover:bg-surface-bright transition-colors group ${u.status === 'Pending' ? 'bg-tertiary-container/5' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img className="h-10 w-10 rounded-full border border-outline-variant" src={u.avatar} alt={u.full_name} />
                      ) : u.status === 'Pending' ? (
                        <div className="h-10 w-10 rounded-full border border-dashed border-outline-variant flex items-center justify-center bg-surface-container">
                          <span className="material-symbols-outlined text-on-surface-variant">person</span>
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
                          {u.initials}
                        </div>
                      )}
                      <div>
                        <p className="text-body-md font-bold text-on-surface">{u.full_name}</p>
                        <p className="text-label-md text-on-surface-variant">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-body-md text-on-surface">{u.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-md font-bold ${
                      u.status === 'Active' ? 'bg-primary-container/20 text-primary' :
                      u.status === 'Pending' ? 'bg-tertiary-container/20 text-tertiary' :
                      'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        u.status === 'Active' ? 'bg-primary' :
                        u.status === 'Pending' ? 'bg-tertiary' :
                        'bg-on-surface-variant'
                      }`}></span>
                      {u.status}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-body-md ${u.last_login ? 'text-on-surface-variant' : 'text-on-surface-variant italic'}`}>
                    {u.last_login || 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-body-md text-on-surface-variant">{u.created}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {u.status === 'Pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleResendInvite(u.id)} className="text-primary text-label-md font-bold hover:underline">Resend Invite</button>
                        <button onClick={() => handleDelete(u.id)} className="p-1 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant">
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { setSelectedUser(u); setMenuAnchor(e.currentTarget); }}
                        className="p-1 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-surface-container-low/30 border-t border-outline-variant flex items-center justify-between">
          <p className="text-label-md text-on-surface-variant">Showing 1-{filtered.length} of {users.length} users</p>
        </div>
      </div>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setEditUser(selectedUser); setMenuAnchor(null); }}>Edit</MenuItem>
        {selectedUser?.status === 'Pending' && (
          <MenuItem onClick={() => { handleResendInvite(selectedUser.id); }}>Resend Invite</MenuItem>
        )}
        <MenuItem onClick={() => { handleDelete(selectedUser?.id); }}>Disable</MenuItem>
      </Menu>

      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onSave={() => { setSnack({ message: 'User invited successfully', severity: 'success' }); fetchUsers(); }} />
      {editUser && <EditUserDialog user={editUser} open={!!editUser} onClose={() => setEditUser(null)} onSave={() => { setSnack({ message: 'User updated', severity: 'success' }); fetchUsers(); }} />}

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack?.severity || 'info'} variant="filled">{snack?.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default UsersPage;
