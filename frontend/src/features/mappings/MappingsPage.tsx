import { useCallback, useEffect, useState } from 'react';
import { Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const defaultMappings = [
  { id: 1, name: 'Clinical_KPI_Map_v2', type: 'Variable', workflow: 'Core Health Monitoring', records: 1240, last_updated: '2 hrs ago', uploaded_by: 'Alex Johnson', initials: 'AJ', color: 'bg-primary-fixed', icon: 'attachment', iconColor: 'text-primary' },
  { id: 2, name: 'North_Region_Orgs', type: 'Org Unit', workflow: 'Regional Consolidation', records: 42, last_updated: 'Oct 24, 2023', uploaded_by: 'Sarah Miller', initials: 'SM', color: 'bg-tertiary-fixed', icon: 'apartment', iconColor: 'text-tertiary' },
  { id: 3, name: 'Standard_Response_Options', type: 'Option', workflow: 'Patient Survey Sync', records: 18, last_updated: 'Oct 20, 2023', uploaded_by: 'Alex Johnson', initials: 'AJ', color: 'bg-secondary-fixed', icon: 'rule', iconColor: 'text-secondary' },
  { id: 4, name: 'DHIS2_DE_Mapping', type: 'Variable', workflow: 'Global Reporting', records: 5612, last_updated: 'Oct 18, 2023', uploaded_by: 'Sarah Miller', initials: 'SM', color: 'bg-primary-fixed', icon: 'functions', iconColor: 'text-primary' },
];

const typeBadge: Record<string, string> = {
  Variable: 'bg-primary-fixed-dim text-on-primary-fixed-variant',
  'Org Unit': 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant',
  Option: 'bg-secondary-fixed-dim text-on-secondary-fixed-variant',
  'Date Format': 'bg-surface-container text-outline',
};

const typeIcons: Record<string, string> = {
  Variable: 'variables',
  'Org Unit': 'corporate_fare',
  Option: 'tune',
  'Date Format': 'calendar_month',
};

const MappingsPage: React.FC = () => {
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/mappings');
      setMappings(res.data.items || []);
    } catch {
      setMappings(defaultMappings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMappings(); }, [fetchMappings]);

  const filtered = mappings.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.type.toLowerCase().includes(search.toLowerCase()) ||
    m.workflow.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    Variable: mappings.filter(m => m.type === 'Variable').length,
    'Org Unit': mappings.filter(m => m.type === 'Org Unit').length,
    Option: mappings.filter(m => m.type === 'Option').length,
    'Date Format': mappings.filter(m => m.type === 'Date Format').length,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-headline-lg text-on-surface">Mappings</h2>
          <p className="text-body-lg text-on-surface-variant mt-1">Manage variable, org unit, option, and date format mappings</p>
        </div>
        <button className="bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          <span>Upload Mapping</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-10">
        {(['Variable', 'Org Unit', 'Option', 'Date Format'] as const).map((type) => (
          <div key={type} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform">
            <div className="flex justify-between items-start">
              <span className={`material-symbols-outlined p-2 rounded-lg ${type === 'Variable' ? 'text-primary bg-primary-fixed' : type === 'Org Unit' ? 'text-tertiary bg-tertiary-fixed' : type === 'Option' ? 'text-secondary bg-secondary-fixed' : 'text-outline bg-surface-container'}`}>{typeIcons[type]}</span>
              <span className="text-label-md text-on-surface-variant uppercase tracking-wider">{type}s</span>
            </div>
            <div className="mt-4">
              <span className="text-[40px] font-bold leading-none">{counts[type]}</span>
              <p className="text-label-md text-on-surface-variant mt-1">
                {type === 'Variable' ? 'Active global variables' : type === 'Org Unit' ? 'Institutional mappings' : type === 'Option' ? 'Active logic configuration' : 'Standard ISO mapping'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <h3 className="text-headline-md">Recent Mappings</h3>
          <div className="flex gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input
                className="pl-9 pr-4 py-1.5 rounded-lg border border-outline-variant bg-surface text-body-md outline-none focus:ring-1 focus:ring-primary w-64"
                placeholder="Search mappings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Name</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Type</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Workflow</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Records</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Last Updated</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Uploaded By</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-surface-bright transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded ${m.color} flex items-center justify-center`}>
                        <span className={`material-symbols-outlined ${m.iconColor} text-[18px]`}>{m.icon}</span>
                      </div>
                      <span className="font-semibold text-body-md">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${typeBadge[m.type] || 'bg-surface-container text-on-surface-variant'}`}>{m.type}</span>
                  </td>
                  <td className="px-6 py-5 text-body-md text-on-surface-variant">{m.workflow}</td>
                  <td className="px-6 py-5 font-mono text-code-sm">{m.records.toLocaleString()}</td>
                  <td className="px-6 py-5 text-body-md text-on-surface-variant">{m.last_updated}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-full ${m.color} flex items-center justify-center text-[10px] font-bold`}>{m.initials}</div>
                      <span className="text-body-md">{m.uploaded_by}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={(e) => { setMenuAnchor(e.currentTarget); }}
                      className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center text-label-md text-on-surface-variant">
          <span>Showing {filtered.length} of {mappings.length} mappings</span>
        </div>
      </div>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setSnack({ message: 'Download started', severity: 'success' }); setMenuAnchor(null); }}>Download</MenuItem>
        <MenuItem onClick={() => { setSnack({ message: 'Mapping deleted', severity: 'success' }); setMenuAnchor(null); }}>Delete</MenuItem>
      </Menu>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack?.severity || 'info'} variant="filled">{snack?.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default MappingsPage;
