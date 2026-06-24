import { useCallback, useEffect, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

interface AuditLogEntry {
  id: number;
  action: string;
  user_name: string;
  resource_type: string;
  resource_id: string;
  description: string;
  details: string | Record<string, unknown>;
  ip_address: string;
  timestamp: string;
}

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [snack, setSnack] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const limit = 20;

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const params: Record<string, unknown> = { skip, limit };
      if (debouncedSearch) params.q = debouncedSearch;
      const res = await api.get("/audit-logs", { params });
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setSnack({ message: "Failed to load audit logs", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit) || 1;

  const formatDetail = (details: string | Record<string, unknown>): string => {
    if (!details) return "-";
    if (typeof details === "string") return details;
    return JSON.stringify(details);
  };

  const actionColor = (action: string): string => {
    const a = action.toLowerCase();
    if (a.includes("fail") || a.includes("error") || a.includes("denied"))
      return "bg-error";
    if (a.includes("create") || a.includes("invite") || a.includes("enable"))
      return "bg-green-500";
    if (a.includes("update") || a.includes("change") || a.includes("edit"))
      return "bg-primary-container";
    if (a.includes("login")) return "bg-secondary";
    return "bg-primary";
  };

  const userInitials = (name: string): string => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((s: string) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatTimestamp = (ts: string): string => {
    if (!ts) return "-";
    try {
      return new Date(ts).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in space-y-gutter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface">Audit Log</h1>
          <p className="text-body-lg text-on-surface-variant">
            Track all platform activities and changes
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-[20px]">
              filter_list
            </span>
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md hover:opacity-90 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[20px]">
              download
            </span>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-fixed rounded-lg">
              <span className="material-symbols-outlined text-primary">
                visibility
              </span>
            </div>
            <span className="text-label-md text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              +12%
            </span>
          </div>
          <p className="text-on-surface-variant text-label-md">
            Total Events (24h)
          </p>
          <p className="text-headline-md mt-1">{total.toLocaleString()}</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-tertiary-fixed rounded-lg">
              <span className="material-symbols-outlined text-tertiary">
                warning
              </span>
            </div>
            <span className="text-label-md text-error bg-error-container px-2 py-0.5 rounded-full">
              +2%
            </span>
          </div>
          <p className="text-on-surface-variant text-label-md">
            Failed Actions
          </p>
          <p className="text-headline-md mt-1">
            {logs.filter((l) => l.action.toLowerCase().includes("fail")).length}
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-secondary-fixed rounded-lg">
              <span className="material-symbols-outlined text-secondary">
                security
              </span>
            </div>
            <span className="text-label-md text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
              Stable
            </span>
          </div>
          <p className="text-on-surface-variant text-label-md">
            Security Alerts
          </p>
          <p className="text-headline-md mt-1">0</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-fixed-dim rounded-lg">
              <span className="material-symbols-outlined text-on-primary-fixed-variant">
                person
              </span>
            </div>
          </div>
          <p className="text-on-surface-variant text-label-md">Active Users</p>
          <p className="text-headline-md mt-1">
            {new Set(logs.map((l) => l.user_name)).size}
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-bright">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
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
                <th className="px-6 py-4 text-label-md text-on-surface-variant">
                  Action
                </th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">
                  User
                </th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">
                  Resource
                </th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">
                  Details
                </th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">
                  IP Address
                </th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-body-md text-on-surface-variant"
                  >
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-surface-container transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${actionColor(l.action)}`}
                        ></div>
                        <span className="text-body-md font-bold text-on-surface">
                          {l.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary-container text-[10px] flex items-center justify-center font-bold text-on-secondary-container">
                          {userInitials(l.user_name || "System")}
                        </div>
                        <span className="text-body-md">
                          {l.user_name || "System"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-code-sm bg-surface-container-high px-2 py-1 rounded">
                        {l.resource_type}
                        {l.resource_id ? `-${l.resource_id}` : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant max-w-xs truncate">
                      {l.description || formatDetail(l.details)}
                    </td>
                    <td className="px-6 py-4 text-code-sm text-on-surface-variant">
                      {l.ip_address || "-"}
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant whitespace-nowrap">
                      {formatTimestamp(l.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low flex items-center justify-between">
          <p className="text-body-md text-on-surface-variant">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{" "}
            of {total} events
          </p>
          <div className="flex items-center gap-2">
            <button
              className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-high disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_left
              </span>
            </button>
            {totalPages <= 7 ? (
              Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-lg font-bold text-body-md transition-all ${
                    p === page
                      ? "bg-primary text-on-primary"
                      : "hover:bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {p}
                </button>
              ))
            ) : (
              <>
                {page > 1 && (
                  <button
                    onClick={() => setPage(1)}
                    className="w-10 h-10 rounded-lg hover:bg-surface-container-high text-body-md text-on-surface-variant"
                  >
                    1
                  </button>
                )}
                {page > 3 && (
                  <span className="text-body-md text-on-surface-variant px-1">
                    ...
                  </span>
                )}
                {Array.from({ length: 5 }, (_, i) => Math.max(1, page - 2) + i)
                  .filter((p) => p <= totalPages)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-lg font-bold text-body-md transition-all ${
                        p === page
                          ? "bg-primary text-on-primary"
                          : "hover:bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                {page < totalPages - 2 && (
                  <span className="text-body-md text-on-surface-variant px-1">
                    ...
                  </span>
                )}
                {page < totalPages && (
                  <button
                    onClick={() => setPage(totalPages)}
                    className="w-10 h-10 rounded-lg hover:bg-surface-container-high text-body-md text-on-surface-variant"
                  >
                    {totalPages}
                  </button>
                )}
              </>
            )}
            <button
              className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-high disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 bg-primary-container/10 border border-primary/20 rounded-lg">
        <span className="material-symbols-outlined text-primary text-[20px]">
          info
        </span>
        <p className="text-body-md text-primary">
          Audit logs are retained for a period of 12 months in accordance with
          your current Enterprise Compliance tier.
        </p>
      </div>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack?.severity || "info"} variant="filled">
          {snack?.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AuditLogPage;
