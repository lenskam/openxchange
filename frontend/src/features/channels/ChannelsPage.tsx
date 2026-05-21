import { useCallback, useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const defaultChannels = [
  { id: 1, name: 'Birth Declaration', description: 'Electronic notification of new births', url_pattern: '/birth-declaration', method: 'POST', protocol: 'HTTP/REST', routes: 3, enabled: true },
  { id: 2, name: 'Patient Lookup', description: 'Master Patient Index cross-referencing', url_pattern: '/mpi-search', method: 'GET', protocol: 'HTTP/REST', routes: 1, enabled: true },
  { id: 3, name: 'Lab Results (Legacy)', description: 'TCP based HL7 receiver', url_pattern: 'tcp://7000', method: 'N/A', protocol: 'HL7 v2.x', routes: 2, enabled: false },
  { id: 4, name: 'Immunization Records', description: 'Global registry sync', url_pattern: '/immunization/update', method: 'POST', protocol: 'HTTP/REST', routes: 2, enabled: true },
  { id: 5, name: 'Prescription Sync', description: 'E-pharmacy integration gateway', url_pattern: '/prescriptions', method: 'POST', protocol: 'HTTP/REST', routes: 1, enabled: true },
  { id: 6, name: 'Emergency Admission', description: 'Real-time trauma unit alerting', url_pattern: '/emergency/admit', method: 'PUT', protocol: 'HTTP/REST', routes: 1, enabled: true },
];

const defaultActivity = [
  { id: 1, user: 'System Admin', action: 'created channel', target: '/emergency/admit', time: '2 hours ago', icon: 'add', color: 'bg-primary' },
  { id: 2, user: 'Automated Hook', action: 'updated routing logic for', target: '/birth-declaration', time: '5 hours ago', icon: 'sync', color: 'bg-tertiary' },
  { id: 3, user: 'Security Module', action: 'disabled legacy channel', target: 'tcp://7000', time: 'Yesterday at 14:45', icon: 'block', color: 'bg-error' },
];

const methodColors: Record<string, string> = {
  POST: 'bg-primary-container/20 text-primary',
  GET: 'bg-surface-container-highest text-on-surface-variant',
  PUT: 'bg-primary-container/20 text-primary',
  DELETE: 'bg-error-container text-error',
  'N/A': 'bg-surface-container-highest text-on-surface-variant',
};

const ChannelsPage: React.FC = () => {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/channels');
      setChannels(res.data.items || []);
    } catch {
      setChannels(defaultChannels);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const handleToggle = async (id: number, enabled: boolean) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, enabled } : c));
    try {
      await api.patch(`/channels/${id}`, { enabled });
    } catch {
      setChannels(prev => prev.map(c => c.id === id ? { ...c, enabled: !enabled } : c));
    }
  };

  const filtered = channels.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.url_pattern.toLowerCase().includes(search.toLowerCase())
  );

  const total = channels.length;
  const enabled = channels.filter(c => c.enabled).length;
  const totalRoutes = channels.reduce((s, c) => s + c.routes, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-gutter">
        <div>
          <h2 className="text-headline-lg text-on-surface">Channels</h2>
          <p className="text-body-lg text-on-surface-variant mt-1">Configure routing channels for data exchange (OpenHIM-compatible)</p>
        </div>
        <div className="flex gap-4">
          <button
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            + New Channel
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined">router</span>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Total Channels</p>
            <h3 className="text-headline-md font-bold">{total}</h3>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Enabled</p>
            <h3 className="text-headline-md font-bold">{enabled}</h3>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed-variant">
            <span className="material-symbols-outlined">alt_route</span>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Total Routes</p>
            <h3 className="text-headline-md font-bold">{totalRoutes}</h3>
          </div>
        </div>
      </section>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-bright flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <span className="material-symbols-outlined text-outline">filter_list</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-body-md w-full outline-none"
              placeholder="Filter channels by name or pattern..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                <th className="px-6 py-3 text-label-md text-on-surface-variant uppercase tracking-wider">Channel Name</th>
                <th className="px-6 py-3 text-label-md text-on-surface-variant uppercase tracking-wider">URL Pattern</th>
                <th className="px-6 py-3 text-label-md text-on-surface-variant uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-label-md text-on-surface-variant uppercase tracking-wider">Protocol</th>
                <th className="px-6 py-3 text-label-md text-on-surface-variant uppercase tracking-wider text-center">Routes</th>
                <th className="px-6 py-3 text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((ch) => (
                <tr key={ch.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">{ch.name}</span>
                      <span className="text-label-md text-on-surface-variant">{ch.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-code-sm bg-surface-container p-1 rounded">{ch.url_pattern}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 font-bold text-xs rounded ${methodColors[ch.method] || 'bg-surface-container-highest text-on-surface-variant'}`}>{ch.method}</span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{ch.protocol}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-body-md font-bold">{ch.routes}</span>
                  </td>
                  <td className="px-6 py-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={ch.enabled}
                        onChange={() => handleToggle(ch.id, !ch.enabled)}
                      />
                      <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      <span className={`ml-3 text-label-md font-bold ${ch.enabled ? 'text-primary' : 'text-on-surface-variant'}`}>{ch.enabled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="p-2 hover:bg-surface-container-high rounded-lg text-outline-variant hover:text-primary transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button className="p-2 hover:bg-surface-container-high rounded-lg text-outline-variant hover:text-error transition-all">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-bright">
          <p className="text-label-md text-on-surface-variant">Showing {filtered.length} of {channels.length} results</p>
        </div>
      </div>

      <section className="mt-margin-desktop">
        <h4 className="text-headline-md font-bold mb-6">Recent Channel Activity</h4>
        <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-outline-variant">
          {defaultActivity.map((a) => (
            <div key={a.id} className="relative group">
              <div className={`absolute -left-8 top-1.5 w-6 h-6 rounded-full ${a.color} flex items-center justify-center ring-4 ring-surface z-10`}>
                <span className="material-symbols-outlined text-[12px] text-white">{a.icon}</span>
              </div>
              <div>
                <p className="text-body-md"><span className="font-bold">{a.user}</span> {a.action} <span className="font-code-sm text-primary">{a.target}</span></p>
                <time className="text-label-md text-on-surface-variant opacity-60">{a.time}</time>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack?.severity || 'info'} variant="filled">{snack?.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default ChannelsPage;
