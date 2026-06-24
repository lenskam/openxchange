import { useCallback, useEffect, useState } from "react";
import { Drawer, Typography, IconButton } from "@mui/material";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

interface TransactionData {
  id: string;
  workflow: string;
  status: string;
  processed?: number;
  processed_count?: number;
  failed?: number;
  failed_count?: number;
  duration?: string;
  time?: string;
  started_at?: string;
}

const defaultTransactions: TransactionData[] = [
  {
    id: "txn-001",
    workflow: "Clinical Data Sync",
    status: "completed",
    processed: 342,
    failed: 0,
    duration: "3m 24s",
    time: "Feb 18, 2026, 07:00 AM",
  },
  {
    id: "txn-002",
    workflow: "Birth Declaration Sync",
    status: "success",
    processed: 1200,
    failed: 3,
    duration: "8m 12s",
    time: "Feb 18, 2026, 06:00 AM",
  },
  {
    id: "txn-003",
    workflow: "Lab Results Webhook",
    status: "processing",
    processed: 18,
    failed: 0,
    duration: "0m 45s",
    time: "Feb 19, 2026, 09:15 AM",
  },
  {
    id: "txn-004",
    workflow: "Patient Billing Export",
    status: "failed",
    processed: 1243,
    failed: 1243,
    duration: "5m 42s",
    time: "Feb 18, 2026, 10:00 PM",
  },
  {
    id: "txn-005",
    workflow: "Pharmacy Stock API",
    status: "completed",
    processed: 890,
    failed: 2,
    duration: "2m 18s",
    time: "Feb 19, 2026, 08:00 AM",
  },
  {
    id: "txn-006",
    workflow: "Insurance Eligibility Batch",
    status: "completed",
    processed: 560,
    failed: 0,
    duration: "1m 55s",
    time: "Feb 19, 2026, 02:00 AM",
  },
];

const statusBadge: Record<string, { bg: string; text: string }> = {
  completed: { bg: "bg-primary-fixed", text: "text-primary" },
  success: { bg: "bg-primary-fixed", text: "text-primary" },
  failed: { bg: "bg-error-container", text: "text-error" },
  processing: { bg: "bg-tertiary-fixed", text: "text-tertiary" },
  pending: { bg: "bg-surface-container-high", text: "text-on-surface-variant" },
};

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<TransactionData | null>(null);

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/transactions");
      setTransactions(res.data.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTxns();
  }, [fetchTxns]);

  const items = transactions.length > 0 ? transactions : defaultTransactions;
  const total = items.length;
  const success = items.filter(
    (t: TransactionData) => t.status === "completed" || t.status === "success",
  ).length;
  const failed = items.filter(
    (t: TransactionData) => t.status === "failed",
  ).length;
  const inProgress = items.filter(
    (t: TransactionData) => t.status === "processing",
  ).length;

  const filtered = items.filter(
    (t: TransactionData) =>
      t.id?.toLowerCase().includes(search.toLowerCase()) ||
      t.workflow?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="animate-slide-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-on-surface">
            Transactions
          </h2>
          <p className="text-[14px] leading-[20px] text-on-surface-variant">
            Monitor and audit all data exchange transactions
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        {[
          {
            label: "Total",
            value: total,
            color: "bg-surface-container-low text-on-surface",
          },
          {
            label: "Success",
            value: success,
            color: "bg-primary-fixed text-primary",
          },
          {
            label: "Failed",
            value: failed,
            color: "bg-error-container text-error",
          },
          {
            label: "In Progress",
            value: inProgress,
            color: "bg-tertiary-fixed text-tertiary",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`px-4 py-2 rounded-full ${s.color} text-[12px] leading-[16px] tracking-[0.05em] font-semibold flex items-center gap-2`}
          >
            {s.label}: <span className="font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="relative max-w-md mb-6">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-[14px] leading-[20px] focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/60"
          placeholder="Search by ID or workflow..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner message="Loading transactions..." />
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider">
                  <th className="px-6 py-4 text-[12px] leading-[16px] tracking-[0.05em] font-semibold">
                    Transaction ID
                  </th>
                  <th className="px-6 py-4 text-[12px] leading-[16px] tracking-[0.05em] font-semibold">
                    Workflow
                  </th>
                  <th className="px-6 py-4 text-[12px] leading-[16px] tracking-[0.05em] font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[12px] leading-[16px] tracking-[0.05em] font-semibold">
                    Processed / Failed
                  </th>
                  <th className="px-6 py-4 text-[12px] leading-[16px] tracking-[0.05em] font-semibold">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-[12px] leading-[16px] tracking-[0.05em] font-semibold">
                    Time
                  </th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((txn: TransactionData) => (
                  <tr
                    key={txn.id}
                    className="hover:bg-surface-container-low transition-colors cursor-pointer"
                    onClick={() => setSelectedTxn(txn)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-[12px] leading-[18px] text-primary font-semibold">
                        {txn.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[14px] leading-[20px]">
                      {txn.workflow}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[12px] leading-[16px] tracking-[0.05em] font-bold ${statusBadge[txn.status]?.bg || "bg-surface-container-high"} ${statusBadge[txn.status]?.text || "text-on-surface-variant"}`}
                      >
                        {txn.status.charAt(0).toUpperCase() +
                          txn.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
                      {txn.processed || txn.processed_count || 0} /{" "}
                      {txn.failed || txn.failed_count || 0}
                    </td>
                    <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant font-mono">
                      {txn.duration || "-"}
                    </td>
                    <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
                      {txn.time || txn.started_at || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="text-on-surface-variant hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTxn(txn);
                        }}
                      >
                        <span className="material-symbols-outlined">info</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Drawer
        anchor="right"
        open={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
      >
        <div className="w-[400px] p-8">
          <div className="flex justify-between items-center mb-6">
            <Typography variant="h6" fontWeight={600}>
              Transaction Details
            </Typography>
            <IconButton onClick={() => setSelectedTxn(null)}>
              <span className="material-symbols-outlined">close</span>
            </IconButton>
          </div>
          {selectedTxn && (
            <div className="space-y-4">
              <div>
                <Typography variant="caption" color="text.secondary">
                  ID
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  fontFamily="monospace"
                >
                  {selectedTxn.id}
                </Typography>
              </div>
              <div>
                <Typography variant="caption" color="text.secondary">
                  Workflow
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedTxn.workflow}
                </Typography>
              </div>
              <div>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedTxn.status}
                </Typography>
              </div>
              <div>
                <Typography variant="caption" color="text.secondary">
                  Processed / Failed
                </Typography>
                <Typography variant="body2">
                  {selectedTxn.processed || selectedTxn.processed_count || 0} /{" "}
                  {selectedTxn.failed || selectedTxn.failed_count || 0}
                </Typography>
              </div>
              <div>
                <Typography variant="caption" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body2">
                  {selectedTxn.duration || "-"}
                </Typography>
              </div>
              <div>
                <Typography variant="caption" color="text.secondary">
                  Time
                </Typography>
                <Typography variant="body2">
                  {selectedTxn.time || selectedTxn.started_at || "-"}
                </Typography>
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default TransactionsPage;
