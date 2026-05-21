import { useCallback, useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const defaultLogs = [
  { id: 1, action: 'Workflow Executed', actionColor: 'bg-green-500', user: 'jane.doe@interx.com', userIcon: 'initials', initials: 'JD', userColor: 'bg-secondary-container', resource: 'WF-PAYROLL-04', details: 'Triggered monthly payroll sync.', ip: '192.168.1.42', timestamp: '2023-10-24 14:22:01' },
  { id: 2, action: 'Mapping Updated', actionColor: 'bg-primary-container', user: 'm.keller@interx.com', userIcon: 'initials', initials: 'MK', userColor: 'bg-primary-fixed', resource: 'MAP-SFDC-INV', details: "Changed field 'tax_id' to required.", ip: '10.0.4.112', timestamp: '2023-10-24 13:45:12' },
  { id: 3, action: 'Login Failed', actionColor: 'bg-error', user: 'unknown_user', userIcon: 'icon', icon: 'no_accounts', resource: 'AUTH-SERVER', details: 'Invalid credentials from remote host.', ip: '45.22.112.9', timestamp: '2023-10-24 13:30:45' },
  { id: 4, action: 'Connection Reset', actionColor: 'bg-secondary', user: 'System', userIcon: 'icon', icon: 'settings_suggest', resource: 'CONN-AWS-S3', details: 'Automated retry after timeout.', ip: 'Internal', timestamp: '2023-10-24 12:05:33' },
  { id: 5, action: 'User Invited', actionColor: 'bg-green-500', user: 'alex.r@interx.com', userIcon: 'initials', initials: 'AR', userColor: 'bg-secondary-container', resource: 'USER-MGMT', details: "Invited 's.chen@interx.com' as Editor.", ip: '192.168.1.10', timestamp: '2023-10-24 11:55:00' },
  { id: 6, action: 'Channel Enabled', actionColor: 'bg-primary', user: 'alex.r@interx.com', userIcon: 'initials', initials: 'AR', userColor: 'bg-secondary-container', resource: 'CHN-WEBHOOK-PRD', details: 'Switched status from Inactive to Active.', ip: '192.168.1.10', timestamp: '2023-10-24 10:12:44' },
];

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs');
      setLogs(res.data.items || []);
    } catch {
      setLogs(defaultLogs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.resource.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in space-y-gutter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface">Audit Log</h1>
          <p className="text-body-lg text-on-surface-variant">Track all platform activities and changes</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md hover:opacity-90 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-fixed rounded-lg">
              <span className="material-symbols-outlined text-primary">visibility</span>
            </div>
            <span className="text-label-md text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
          </div>
          <p className="text-on-surface-variant text-label-md">Total Events (24h)</p>
          <p className="text-headline-md mt-1">12,482</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-tertiary-fixed rounded-lg">
              <span className="material-symbols-outlined text-tertiary">warning</span>
            </div>
            <span className="text-label-md text-error bg-error-container px-2 py-0.5 rounded-full">+2%</span>
          </div>
          <p className="text-on-surface-variant text-label-md">Failed Actions</p>
          <p className="text-headline-md mt-1">143</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-secondary-fixed rounded-lg">
              <span className="material-symbols-outlined text-secondary">security</span>
            </div>
            <span className="text-label-md text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">Stable</span>
          </div>
          <p className="text-on-surface-variant text-label-md">Security Alerts</p>
          <p className="text-headline-md mt-1">0</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-fixed-dim rounded-lg">
              <span className="material-symbols-outlined text-on-primary-fixed-variant">person</span>
            </div>
          </div>
          <p className="text-on-surface-variant text-label-md">Active Users</p>
          <p className="text-headline-md mt-1">58</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-bright">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-body-md"
              placeholder="Search events, users, or resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Action</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">User</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Resource</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Details</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">IP Address</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-surface-container transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${l.actionColor}`}></div>
                      <span className="text-body-md font-bold text-on-surface">{l.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {l.userIcon === 'initials' ? (
                        <div className={`w-6 h-6 rounded-full ${l.userColor} text-[10px] flex items-center justify-center font-bold`}>{l.initials}</div>
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">{l.icon}</span>
                      )}
                      <span className={`text-body-md ${l.user === 'unknown_user' ? 'text-error' : ''}`}>{l.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-code-sm bg-surface-container-high px-2 py-1 rounded">{l.resource}</span>
                  </td>
                  <td className="px-6 py-4 text-body-md text-on-surface-variant">{l.details}</td>
                  <td className="px-6 py-4 text-code-sm text-on-surface-variant">{l.ip}</td>
                  <td className="px-6 py-4 text-body-md text-on-surface-variant">{l.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low flex items-center justify-between">
          <p className="text-body-md text-on-surface-variant">Showing 1 to {filtered.length} of {logs.length} events</p>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-high disabled:opacity-30" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="w-10 h-10 bg-primary text-on-primary rounded-lg font-bold text-body-md">1</button>
            <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-high disabled:opacity-30" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 bg-primary-container/10 border border-primary/20 rounded-lg">
        <span className="material-symbols-outlined text-primary text-[20px]">info</span>
        <p className="text-body-md text-primary">Audit logs are retained for a period of 12 months in accordance with your current Enterprise Compliance tier.</p>
      </div>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack?.severity || 'info'} variant="filled">{snack?.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default AuditLogPage;
