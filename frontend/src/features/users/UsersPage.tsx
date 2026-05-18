import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const defaultUser = {
  email: '',
  full_name: '',
  role: 'viewer',
  password: '',
};

const InviteUserDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}> = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState(defaultUser);
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
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Sending...' : 'Invite'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const EditUserDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  user: any;
}> = ({ open, onClose, onSave, user }) => {
  const [form, setForm] = useState({ full_name: '', role: 'viewer', is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name || '', role: user.role || 'viewer', is_active: user.is_active ?? true });
    }
  }, [user, open]);

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
          <TextField label="Full Name" fullWidth margin="normal" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <TextField label="Role" fullWidth select margin="normal" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {['admin', 'analyst', 'editor', 'viewer'].map((r) => (
              <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
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
      setSnack({ message: 'Failed to load users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const activeCount = users.filter((u) => u.is_active).length;
  const pendingCount = users.filter((u) => !u.is_active).length;

  const filtered = users.filter((u) => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="h4">User Management</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage platform users, roles, and permissions
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setInviteOpen(true)}>
          Invite User
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ py: 1 }}>
          Total: <strong>{users.length}</strong> &middot; Active: <strong>{activeCount}</strong> &middot; Pending: <strong>{pendingCount}</strong>
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search users by name or email..."
          size="small"
          sx={{ flex: 1 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField select size="small" sx={{ width: 160 }} value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)} label="All Roles">
          <MenuItem value="">All Roles</MenuItem>
          {['admin', 'analyst', 'editor', 'viewer'].map((r) => (
            <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <LoadingSpinner message="Loading users..." />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No users found</TableCell></TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{u.full_name || 'N/A'}</Typography>
                    <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.role} label={u.role?.charAt(0).toUpperCase() + u.role?.slice(1)} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(u.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={(e) => { setMenuAnchor(e.currentTarget); setSelectedUser(u); }}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setEditUser(selectedUser); setMenuAnchor(null); }}>Edit</MenuItem>
        <MenuItem onClick={() => selectedUser && handleResendInvite(selectedUser.id)}>Resend Invite</MenuItem>
        <MenuItem onClick={() => selectedUser && handleDelete(selectedUser.id)} sx={{ color: 'error.main' }}>Disable</MenuItem>
      </Menu>

      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onSave={fetchUsers} />
      <EditUserDialog open={Boolean(editUser)} onClose={() => setEditUser(null)} onSave={fetchUsers} user={editUser} />

      {snack && (
        <Snackbar open autoHideDuration={4000} onClose={() => setSnack(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default UsersPage;
