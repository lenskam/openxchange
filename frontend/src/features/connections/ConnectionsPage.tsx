import { useCallback, useEffect, useState } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Button, Alert, Snackbar, Menu,
} from '@mui/material';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const typeMeta: Record<string, { icon: string; color: string }> = {
  dhis2: { icon: 'database', color: '#00529b' },
  openhim: { icon: 'terminal', color: '#f44336' },
  openfn: { icon: 'api', color: '#059669' },
  fhir: { icon: 'health_metrics', color: '#2196f3' },
  hl7: { icon: 'sync_alt', color: '#004ac6' },
  generic: { icon: 'api', color: '#6b7280' },
};

const defaultForm = { name: '', type: 'dhis2', url: '', auth_type: 'basic', credentials: { username: '', password: '' } };

const defaultConnections = [
  { id: 1, name: 'National DHIS2 Instance', type: 'dhis2', url: 'https://dhis2.moh.gov.internal/api', status: 'active', last_sync: '2 mins ago', created_at: '2023-10-24' },
  { id: 2, name: 'HIM Mediator Primary', type: 'openhim', url: 'https://mediator.openhim.org:5001', status: 'active', last_sync: '15 mins ago', created_at: '2023-11-12' },
  { id: 3, name: 'HAPI FHIR R4 Store', type: 'fhir', url: 'https://fhir.internal-repo.v4/', status: 'slow', last_sync: '1 hr ago', created_at: '2024-01-05' },
  { id: 4, name: 'Regional HL7 MLLP', type: 'hl7', url: 'mllp://10.0.4.155:2575', status: 'failed', last_sync: '6 hrs ago', created_at: '2024-02-11' },
  { id: 5, name: 'Logistics DHIS2 Backup', type: 'dhis2', url: 'https://logistics.backup.dhis2/api', status: 'active', last_sync: '45 mins ago', created_at: '2023-12-12' },
  { id: 6, name: 'Lab Results Mediator', type: 'openhim', url: 'https://lab.him.internal:3000', status: 'active', last_sync: 'Yesterday', created_at: '2023-08-30' },
  { id: 7, name: 'Grahame FHIR Test', type: 'fhir', url: 'http://hapi.fhir.org/baseR4', status: 'testing', last_sync: 'Never', created_at: '2024-03-02' },
  { id: 8, name: 'On-Site Clinic ADT', type: 'hl7', url: 'mllp://clinic-vlan.local:2575', status: 'active', last_sync: '5 mins ago', created_at: '2023-12-01' },
];

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-surface-container-high text-on-surface-variant',
    failed: 'bg-red-100 text-red-700',
    error: 'bg-red-100 text-red-700',
    slow: 'bg-yellow-100 text-yellow-700',
    testing: 'bg-blue-100 text-blue-700',
  };
  const dots: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    failed: 'bg-red-500',
    error: 'bg-red-500',
    slow: 'bg-yellow-500',
    testing: 'bg-blue-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[12px] leading-[16px] tracking-[0.05em] font-semibold flex items-center gap-1 w-fit ${styles[status] || styles.inactive}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || dots.inactive}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ConnectionForm({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void; onSave: () => void; initial?: any;
}) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) setForm({ name: initial.name || '', type: initial.type || 'dhis2', url: initial.url || '', auth_type: initial.auth_type || 'basic', credentials: initial.credentials || { username: '', password: '' } });
    else setForm(defaultForm);
  }, [initial, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (initial) await api.put(`/connections/${initial.id}`, form);
      else await api.post('/connections', form);
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
        <DialogTitle sx={{ fontWeight: 600 }}>{initial ? 'Edit Connection' : 'New Connection'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label="Name" fullWidth required margin="normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Type" fullWidth required select margin="normal" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {['dhis2', 'openhim', 'openfn', 'fhir', 'hl7', 'generic'].map((t) => (
              <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>
            ))}
          </TextField>
          <TextField label="URL" fullWidth required margin="normal" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <TextField label="Auth Type" fullWidth required select margin="normal" value={form.auth_type} onChange={(e) => setForm({ ...form, auth_type: e.target.value })}>
            {['basic', 'api_key', 'oauth2'].map((t) => (
              <MenuItem key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</MenuItem>
            ))}
          </TextField>
          {form.auth_type === 'basic' && (
            <>
              <TextField label="Username" fullWidth margin="normal" value={form.credentials.username || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, username: e.target.value } })} />
              <TextField label="Password" type="password" fullWidth margin="normal" value={form.credentials.password || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, password: e.target.value } })} />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

const ConnectionsPage: React.FC = () => {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/connections/${id}`);
      setSnack({ message: 'Connection deleted', severity: 'success' });
      fetchConnections();
    } catch { setSnack({ message: 'Failed to delete connection', severity: 'error' }); }
    setMenuAnchor(null);
  };

  const handleTest = async (id: number) => {
    try {
      const res = await api.post(`/connections/${id}/test`);
      setSnack({ message: res.data.message, severity: res.data.status === 'success' ? 'success' : 'error' });
    } catch { setSnack({ message: 'Connection test failed', severity: 'error' }); }
    setMenuAnchor(null);
  };

  const items = connections.length > 0 ? connections : defaultConnections;

  return (
    <div className="animate-slide-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-on-surface">Connections</h2>
          <p className="text-[14px] leading-[20px] text-on-surface-variant">Manage connections to external data systems</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-[12px] leading-[16px] tracking-[0.05em] font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-95">
          <span className="material-symbols-outlined">add</span>
          New Connection
        </button>
      </div>

      {loading ? <LoadingSpinner message="Loading connections..." /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((conn: any) => {
              const meta = typeMeta[conn.type] || typeMeta.generic;
              return (
                <div key={conn.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}10`, color: meta.color }}>
                      <span className="material-symbols-outlined text-3xl">{meta.icon}</span>
                    </div>
                    <button onClick={(e) => { setMenuAnchor(e.currentTarget); setSelectedConn(conn); }} className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded-md">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                  <h3 className="text-[20px] leading-[28px] font-semibold mb-1 truncate">{conn.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{conn.type.toUpperCase()}</span>
                    {statusBadge(conn.status)}
                  </div>
                  <p className="font-mono text-[12px] leading-[18px] text-on-surface-variant truncate mb-4 opacity-70">{conn.url}</p>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/30">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Last Sync</p>
                      <p className="text-[14px] leading-[20px]">{conn.last_sync || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Created</p>
                      <p className="text-[14px] leading-[20px]">{new Date(conn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-surface-container rounded-2xl p-8 border border-outline-variant">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[20px] leading-[28px] font-semibold">Recent Sync Activity</h4>
                <button className="text-primary text-[12px] leading-[16px] tracking-[0.05em] font-semibold flex items-center gap-1">
                  View All Events <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-2 h-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-[14px] leading-[20px] font-bold">Successfully pushed 450 records to National DHIS2</p>
                      <p className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant">2 mins ago</p>
                    </div>
                    <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">Transaction ID: TX-99420-BA. Latency: 240ms.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-2 h-2 rounded-full bg-red-500" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-[14px] leading-[20px] font-bold">Connection Timeout on Regional HL7 MLLP</p>
                      <p className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant">6 hrs ago</p>
                    </div>
                    <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">Error: Handshake failure at socket layer. Retrying in 15 mins.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-[14px] leading-[20px] font-bold">Updated Metadata for HAPI FHIR Server</p>
                      <p className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant">Yesterday</p>
                    </div>
                    <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">Modified by Admin: Updated TLS certificates for endpoint security.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-primary-container text-on-primary-container rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-20 transform rotate-12">
                <span className="material-symbols-outlined text-[200px]" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_sync</span>
              </div>
              <div>
                <span className="bg-on-primary-container/20 px-3 py-1 rounded-full text-[12px] leading-[16px] tracking-[0.05em] font-semibold mb-4 inline-block">Pro Tip</span>
                <h4 className="text-[20px] leading-[28px] font-semibold mb-2">Automate Connections</h4>
                <p className="text-[14px] leading-[20px] opacity-90">Use our CLI tool to bootstrap secure connections using OAuth2 or Client Certificates directly from your terminal.</p>
              </div>
              <button className="mt-8 bg-on-primary-container text-primary px-6 py-2 rounded-lg font-bold text-[12px] leading-[16px] tracking-[0.05em] font-semibold w-fit hover:bg-on-primary-container/90 transition-all">
                Open Documentation
              </button>
            </div>
          </div>
        </>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setEditing(selectedConn); setModalOpen(true); setMenuAnchor(null); }}>Edit</MenuItem>
        <MenuItem onClick={() => selectedConn && handleTest(selectedConn.id)}>Test</MenuItem>
        <MenuItem onClick={() => selectedConn && handleDelete(selectedConn.id)} sx={{ color: 'error.main' }}>Delete</MenuItem>
      </Menu>

      <ConnectionForm open={modalOpen} onClose={() => setModalOpen(false)} onSave={fetchConnections} initial={editing} />

      {snack && (
        <Snackbar open autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert>
        </Snackbar>
      )}
    </div>
  );
};

export default ConnectionsPage;
