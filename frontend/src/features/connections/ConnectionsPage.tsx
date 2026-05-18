import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StorageIcon from '@mui/icons-material/Storage';
import RouterIcon from '@mui/icons-material/Router';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import MessageIcon from '@mui/icons-material/Message';
import ApiIcon from '@mui/icons-material/Api';

import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const typeIcons: Record<string, React.ReactNode> = {
  dhis2: <StorageIcon sx={{ fontSize: 40, color: '#2563eb' }} />,
  openhim: <RouterIcon sx={{ fontSize: 40, color: '#7c3aed' }} />,
  openfn: <ApiIcon sx={{ fontSize: 40, color: '#059669' }} />,
  fhir: <MedicalServicesIcon sx={{ fontSize: 40, color: '#dc2626' }} />,
  hl7: <MessageIcon sx={{ fontSize: 40, color: '#d97706' }} />,
  generic: <ApiIcon sx={{ fontSize: 40, color: '#6b7280' }} />,
};

const defaultValues = {
  name: '',
  type: 'dhis2',
  url: '',
  auth_type: 'basic',
  credentials: { username: '', password: '' },
};

const ConnectionForm: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  initial?: any;
}> = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        type: initial.type || 'dhis2',
        url: initial.url || '',
        auth_type: initial.auth_type || 'basic',
        credentials: initial.credentials || { username: '', password: '' },
      });
    } else {
      setForm(defaultValues);
    }
  }, [initial, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (initial) {
        await api.put(`/connections/${initial.id}`, form);
      } else {
        await api.post('/connections', form);
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{initial ? 'Edit Connection' : 'New Connection'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="Name"
            fullWidth
            required
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Type"
            fullWidth
            required
            select
            margin="normal"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {['dhis2', 'openhim', 'openfn', 'fhir', 'hl7', 'generic'].map((t) => (
              <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="URL"
            fullWidth
            required
            margin="normal"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <TextField
            label="Auth Type"
            fullWidth
            required
            select
            margin="normal"
            value={form.auth_type}
            onChange={(e) => setForm({ ...form, auth_type: e.target.value })}
          >
            {['basic', 'api_key', 'oauth2'].map((t) => (
              <MenuItem key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</MenuItem>
            ))}
          </TextField>
          {form.auth_type === 'basic' && (
            <>
              <TextField
                label="Username"
                fullWidth
                margin="normal"
                value={form.credentials.username || ''}
                onChange={(e) =>
                  setForm({ ...form, credentials: { ...form.credentials, username: e.target.value } })
                }
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                margin="normal"
                value={form.credentials.password || ''}
                onChange={(e) =>
                  setForm({ ...form, credentials: { ...form.credentials, password: e.target.value } })
                }
              />
            </>
          )}
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

const ConnectionsPage: React.FC = () => {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedConn, setSelectedConn] = useState<any>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/connections');
      setConnections(res.data.items || []);
    } catch {
      setSnack({ message: 'Failed to load connections', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/connections/${id}`);
      setSnack({ message: 'Connection deleted', severity: 'success' });
      fetchConnections();
    } catch {
      setSnack({ message: 'Failed to delete connection', severity: 'error' });
    }
    setMenuAnchor(null);
  };

  const handleTest = async (id: number) => {
    try {
      const res = await api.post(`/connections/${id}/test`);
      setSnack({ message: res.data.message, severity: res.data.status === 'success' ? 'success' : 'error' });
    } catch {
      setSnack({ message: 'Connection test failed', severity: 'error' });
    }
    setMenuAnchor(null);
  };

  const filtered = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="h4">Connections</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage connections to external data systems
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setModalOpen(true); }}>
          New Connection
        </Button>
      </Box>

      <TextField
        placeholder="Search connections by name or type..."
        size="small"
        fullWidth
        sx={{ mb: 3 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <LoadingSpinner message="Loading connections..." />
      ) : (
        <Grid container spacing={3}>
          {filtered.map((conn) => (
            <Grid item xs={12} sm={6} md={4} key={conn.id}>
              <Card sx={{ position: 'relative' }}>
                <CardContent>
                  <IconButton
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={(e) => { setMenuAnchor(e.currentTarget); setSelectedConn(conn); }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {typeIcons[conn.type] || typeIcons.generic}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6">{conn.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {conn.type.toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, wordBreak: 'break-all' }}>
                    {conn.url}
                  </Typography>
                  <StatusBadge status={conn.status} />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Created: {new Date(conn.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setEditing(selectedConn); setModalOpen(true); setMenuAnchor(null); }}>
          Edit
        </MenuItem>
        <MenuItem onClick={() => selectedConn && handleTest(selectedConn.id)}>
          Test
        </MenuItem>
        <MenuItem onClick={() => selectedConn && handleDelete(selectedConn.id)} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      <ConnectionForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={fetchConnections}
        initial={editing}
      />

      {snack && (
        <Snackbar
          open
          autoHideDuration={4000}
          onClose={() => setSnack(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>
            {snack.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default ConnectionsPage;
