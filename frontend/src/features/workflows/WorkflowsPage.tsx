import { useCallback, useEffect, useState } from "react";
import { Menu, MenuItem } from "@mui/material";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

interface WorkflowItem {
  id: number;
  name: string;
  description: string;
  source: string;
  destination: string;
  schedule: string;
  mappings: number;
  status: string;
  last_run: string;
}

const defaultWorkflows = [
  {
    id: 1,
    name: "Birth Declaration Sync",
    description:
      "Synchronize birth declarations from Civil Registry to DHIS2 tracker",
    source: "Civil Registry DB",
    destination: "National DHIS2",
    schedule: "Every 6 hours",
    mappings: 24,
    status: "active",
    last_run: "Feb 18, 07:00 AM",
  },
  {
    id: 2,
    name: "Lab Results HL7v2",
    description: "Forward lab results from OpenELIS to regional FHIR gateways",
    source: "OpenELIS PostgreSQL",
    destination: "HAPI FHIR R4",
    schedule: "Real-time",
    mappings: 18,
    status: "active",
    last_run: "Feb 19, 09:15 AM",
  },
  {
    id: 3,
    name: "Pharmacy Stock Sync",
    description:
      "Aggregate stock levels from 45 clinic databases into central LMIS",
    source: "Clinic DBs x45",
    destination: "Central LMIS",
    schedule: "Daily 22:00",
    mappings: 12,
    status: "paused",
    last_run: "Feb 18, 10:00 PM",
  },
  {
    id: 4,
    name: "Patient Identity Crosswalk",
    description:
      "Cross-reference and merge patient identities across SHR and OpenMRS",
    source: "OpenMRS Instance",
    destination: "Shared Health Record",
    schedule: "Every 30m",
    mappings: 31,
    status: "error",
    last_run: "Feb 19, 08:45 AM",
  },
  {
    id: 5,
    name: "Insurance Eligibility Batch",
    description:
      "Batch check patient insurance eligibility and update coverage status",
    source: "Insurance Gateway",
    destination: "Coverage DB",
    schedule: "Daily 02:00",
    mappings: 8,
    status: "active",
    last_run: "Feb 19, 02:00 AM",
  },
  {
    id: 6,
    name: "CDC Report Generator",
    description:
      "Generate and submit CDC aggregate reports from monthly DHIS2 data",
    source: "DHIS2 Aggregate",
    destination: "CDC SFTP",
    schedule: "Monthly 1st",
    mappings: 15,
    status: "draft",
    last_run: "Never",
  },
];

const statusStyles: Record<string, string> = {
  active: "bg-[#2563eb]",
  paused: "bg-[#505f76]",
  error: "bg-[#ba1a1a]",
  draft: "bg-[#c3c6d7]",
};

const WorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/workflows");
      setWorkflows(res.data.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const items = workflows.length > 0 ? workflows : defaultWorkflows;
  const filtered = items.filter((wf: WorkflowItem) => {
    const matchSearch =
      wf.name?.toLowerCase().includes(search.toLowerCase()) ||
      wf.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || wf.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="animate-slide-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-on-surface">
            Workflows
          </h2>
          <p className="text-[14px] leading-[20px] text-on-surface-variant">
            Manage data integration workflows and their mappings
          </p>
        </div>
        <button className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-[12px] leading-[16px] tracking-[0.05em] font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-95">
          <span className="material-symbols-outlined">add</span>
          New Workflow
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-[14px] leading-[20px] focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/60"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-surface-container-low border-none rounded-lg px-4 py-2 text-[14px] leading-[20px] focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer min-w-[140px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="error">Error</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading workflows..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((wf: WorkflowItem) => (
            <div
              key={wf.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div
                className={`absolute top-0 left-0 w-1 h-full ${statusStyles[wf.status] || "bg-[#c3c6d7]"}`}
              />
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[16px] leading-[24px] font-bold text-on-surface group-hover:text-primary transition-colors">
                  {wf.name}
                </h3>
                <button
                  onClick={(e) => {
                    setMenuAnchor(e.currentTarget);
                  }}
                  className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded-md"
                >
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
              <p className="text-[14px] leading-[20px] text-on-surface-variant mb-4 line-clamp-2">
                {wf.description}
              </p>
              <div className="flex items-center gap-2 mb-4 p-3 bg-surface-container-low rounded-lg">
                <span className="text-[12px] leading-[16px] text-on-surface-variant">
                  {wf.source}
                </span>
                <span className="material-symbols-outlined text-[16px] text-primary">
                  arrow_forward
                </span>
                <span className="text-[12px] leading-[16px] text-on-surface-variant">
                  {wf.destination}
                </span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                <div className="flex items-center gap-3 text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      schedule
                    </span>
                    {wf.schedule}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      layers
                    </span>
                    {wf.mappings} mappings
                  </span>
                </div>
              </div>
              <div className="mt-3 text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant">
                Last: {wf.last_run}
              </div>
            </div>
          ))}
        </div>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => setMenuAnchor(null)}>Edit</MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>Run Now</MenuItem>
        <MenuItem
          onClick={() => setMenuAnchor(null)}
          sx={{ color: "error.main" }}
        >
          Delete
        </MenuItem>
      </Menu>
    </div>
  );
};

export default WorkflowsPage;
