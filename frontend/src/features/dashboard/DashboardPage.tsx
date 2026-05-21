import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const pieColors = ["#2563eb", "#505f76", "#ba1a1a", "#c3c6d7"];

const defaultStats = {
  connections: { total: 8, active: 6 },
  workflows: { total: 6, active: 3 },
  transactions: { total: 1847, success_rate: 96.3 },
  records: { total: "285K", failed: 1243 },
};

const defaultVolumeData = [
  { month: "Sep", success: 800, failed: 50 },
  { month: "Oct", success: 950, failed: 30 },
  { month: "Nov", success: 1100, failed: 60 },
  { month: "Dec", success: 1200, failed: 40 },
  { month: "Jan", success: 1050, failed: 55 },
  { month: "Feb", success: 980, failed: 35 },
];

const defaultTxns = [
  {
    id: 1,
    workflow: "Clinical Data Sync",
    desc: "HL7 to FHIR Proxy",
    records: 452,
    duration: "1.2s",
    status: "completed",
  },
  {
    id: 2,
    workflow: "Lab Results Webhook",
    desc: "External API Bridge",
    records: 18,
    duration: "0.4s",
    status: "completed",
  },
  {
    id: 3,
    workflow: "Patient Billing Export",
    desc: "Daily CSV Aggregation",
    records: 1243,
    duration: "5.7s",
    status: "failed",
  },
  {
    id: 4,
    workflow: "Pharmacy Stock API",
    desc: "Real-time Inventory",
    records: 52,
    duration: "0.8s",
    status: "processing",
  },
];

const defaultActivity = [
  {
    icon: "update",
    iconBg: "bg-primary-fixed text-primary",
    user: "System",
    action: "updated",
    resource: "Patient Billing Export",
    detail: "Workflow configuration modified",
    time: "2 mins ago",
  },
  {
    icon: "person",
    iconBg: "bg-secondary-fixed text-secondary",
    user: "John Doe",
    action: "added",
    resource: "Azure SQL Endpoint",
    detail: "New connection established",
    time: "45 mins ago",
  },
  {
    icon: "error_outline",
    iconBg: "bg-error-container text-error",
    user: "Clinical Data Sync",
    action: "triggered an alert",
    resource: "",
    detail: "Unauthorized access attempt blocked",
    time: "2 hours ago",
  },
  {
    icon: "rocket_launch",
    iconBg: "bg-surface-container-high text-on-surface-variant",
    user: "System",
    action: "initiated daily backup",
    resource: "",
    detail: "Storage cluster 04 synced",
    time: "4 hours ago",
  },
];

const defaultWorkflows = [
  {
    name: "Clinical Data Sync",
    desc: "Bi-directional synchronization of clinical records between legacy on-prem HL7 systems and modern cloud FHIR endpoints.",
    schedule: "Every 5m",
    lastRun: "2m ago",
  },
  {
    name: "Lab Results Webhook",
    desc: "Real-time HTTP push of validated lab results to the physician dashboard portal for immediate review.",
    schedule: "Real-time",
    lastRun: "14s ago",
  },
  {
    name: "Pharmacy Stock API",
    desc: "Aggregates medication inventory levels across 45 regional pharmacy locations to support centralized procurement.",
    schedule: "Hourly",
    lastRun: "48m ago",
  },
];

function StatCard({
  icon,
  iconBg,
  title,
  value,
  subtitle,
  subtitleClass,
  progress,
  badge,
  trend,
  sparkline,
}: {
  icon: string;
  iconBg: string;
  title: string;
  value: string;
  subtitle: string;
  subtitleClass?: string;
  progress?: number;
  badge?: { text: string; className: string };
  trend?: { icon: string; value: string; className: string };
  sparkline?: number[];
}) {
  return (
    <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {badge && (
          <span
            className={`text-label-md font-label-md ${badge.className} px-2 py-1 rounded`}
          >
            {badge.text}
          </span>
        )}
        {trend && (
          <div className={`flex items-center ${trend.className}`}>
            <span className="material-symbols-outlined text-[16px]">
              {trend.icon}
            </span>
            <span className="text-label-md font-label-md font-bold">
              {trend.value}
            </span>
          </div>
        )}
      </div>
      <div className="text-headline-lg font-headline-lg mb-1">{value}</div>
      <div className="text-label-md font-label-md text-on-surface-variant flex items-center justify-between">
        <span>{title}</span>
        <span className={subtitleClass || "text-on-surface font-bold"}>
          {subtitle}
        </span>
      </div>
      {sparkline && (
        <div className="mt-4 flex gap-1 items-end h-6">
          {sparkline.map((h, i) => (
            <div
              key={i}
              className="w-2 bg-primary rounded-sm"
              style={{ opacity: 0.2 + (i + 1) * 0.15, height: `${h}%` }}
            />
          ))}
        </div>
      )}
      {progress !== undefined && !sparkline && (
        <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, volRes, txnRes, wfRes, actRes] =
        await Promise.allSettled([
          api.get("/dashboard/stats"),
          api.get("/dashboard/transaction-volume?months=6"),
          api.get("/transactions?limit=5"),
          api.get("/workflows?status=active&limit=4"),
          api.get("/audit-logs?limit=5"),
        ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (volRes.status === "fulfilled") setVolumeData(volRes.value.data || []);
      if (txnRes.status === "fulfilled")
        setRecentTxns(txnRes.value.data?.items || []);
      if (wfRes.status === "fulfilled")
        setWorkflows(wfRes.value.data?.items || []);
      if (actRes.status === "fulfilled")
        setActivity(actRes.value.data?.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const s = stats || defaultStats;
  const vol = volumeData.length > 0 ? volumeData : defaultVolumeData;
  const txns = recentTxns.length > 0 ? recentTxns : defaultTxns;
  const feed = activity.length > 0 ? activity : defaultActivity;
  const wfs = workflows.length > 0 ? workflows : defaultWorkflows;

  const workflowPie = [
    { name: "Active", value: s.workflows.active || 3 },
    { name: "Paused", value: 1 },
    { name: "Error", value: 1 },
    { name: "Draft", value: 1 },
  ];

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <div className="animate-slide-in">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">
            System Overview
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Real-time performance monitoring across all data pipelines.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-[18px]">
              calendar_today
            </span>
            Last 30 Days
          </button>
          <button
            onClick={() => navigate("/workflows")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:opacity-90 transition-all shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon="hub"
          iconBg="bg-primary-fixed text-primary"
          title="Connections"
          value={String(s.connections.total)}
          subtitle={`${s.connections.active} Active`}
          progress={75}
          badge={{ text: "Active", className: "text-primary bg-primary-fixed" }}
        />
        <StatCard
          icon="account_tree"
          iconBg="bg-secondary-fixed text-secondary"
          title="Workflows"
          value={String(s.workflows.total)}
          subtitle={`${s.workflows.active} Active`}
          progress={50}
          badge={{
            text: "Scheduled",
            className: "text-on-surface-variant bg-surface-container",
          }}
        />
        <StatCard
          icon="swap_horiz"
          iconBg="bg-tertiary-fixed text-tertiary"
          title="Transactions"
          value={String(s.transactions.total).replace(
            /\B(?=(\d{3})+(?!\d))/g,
            ",",
          )}
          subtitle="96.3% Success"
          subtitleClass="text-on-tertiary-fixed-variant font-bold"
          trend={{
            icon: "arrow_upward",
            value: "12%",
            className: "text-error",
          }}
          sparkline={[30, 50, 80, 40, 100, 70]}
        />
        <StatCard
          icon="storage"
          iconBg="bg-error-container text-error"
          title="Records"
          value={String(s.records.total)}
          subtitle={`${s.records.failed.toLocaleString()} Failed`}
          subtitleClass="text-error font-bold"
          progress={4}
          badge={{
            text: "Attention",
            className: "text-error bg-error-container",
          }}
        />
      </div>

      <div className="bento-grid mb-8">
        <div className="col-span-12 lg:col-span-8 glass-card p-6 rounded-xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-headline-md font-headline-md text-on-surface">
              Transaction Volume
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary-container" />
                <span className="text-label-md font-label-md text-on-surface-variant">
                  Success
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-error" />
                <span className="text-label-md font-label-md text-on-surface-variant">
                  Failed
                </span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={vol}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#c3c6d7"
                opacity={0.3}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#434655" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#434655" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar
                dataKey="success"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="failed"
                fill="#ba1a1a"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-6 rounded-xl flex flex-col">
          <h3 className="text-headline-md font-headline-md text-on-surface mb-8">
            Workflow Status
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workflowPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {workflowPie.map((_, i) => (
                      <Cell key={i} fill={pieColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-headline-lg font-headline-lg">
                  {workflowPie.reduce((a, b) => a + b.value, 0)}
                </span>
                <span className="text-label-md font-label-md text-on-surface-variant">
                  Total
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-container" />
                <span className="text-label-md font-label-md text-on-surface-variant">
                  Active ({workflowPie[0].value})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-label-md font-label-md text-on-surface-variant">
                  Paused ({workflowPie[1].value})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-error" />
                <span className="text-label-md font-label-md text-on-surface-variant">
                  Error ({workflowPie[2].value})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-outline-variant" />
                <span className="text-label-md font-label-md text-on-surface-variant">
                  Draft ({workflowPie[3].value})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bento-grid mb-8">
        <div className="col-span-12 xl:col-span-8 glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-md font-headline-md text-on-surface">
              Recent Transactions
            </h3>
            <button
              onClick={() => navigate("/transactions")}
              className="text-primary text-label-md font-label-md hover:underline"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider">
                  <th className="px-6 py-4 text-label-md font-label-md">
                    Workflow
                  </th>
                  <th className="px-6 py-4 text-label-md font-label-md">
                    Records
                  </th>
                  <th className="px-6 py-4 text-label-md font-label-md">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-label-md font-label-md">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {txns.slice(0, 5).map((txn: any) => (
                  <tr
                    key={txn.id}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-body-md font-bold text-on-surface">
                          {txn.workflow}
                        </span>
                        <span className="text-label-md font-label-md text-on-surface-variant">
                          {txn.desc || txn.workflow}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-md font-body-md text-on-surface-variant">
                      {txn.records || txn.processed_count || 0} records
                    </td>
                    <td className="px-6 py-4 text-body-md font-body-md text-on-surface-variant">
                      {txn.duration ? `${txn.duration}` : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-label-md font-bold ${
                          txn.status === "completed" || txn.status === "success"
                            ? "bg-primary-fixed text-primary"
                            : txn.status === "failed" || txn.status === "error"
                              ? "bg-error-container text-error"
                              : "bg-tertiary-fixed text-tertiary"
                        }`}
                      >
                        {txn.status?.charAt(0).toUpperCase() +
                          txn.status?.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 glass-card p-6 rounded-xl">
          <h3 className="text-headline-md font-headline-md text-on-surface mb-6">
            Activity Feed
          </h3>
          <div className="space-y-6 relative">
            <div className="absolute left-[19px] top-2 bottom-0 w-px bg-outline-variant" />
            {feed.slice(0, 4).map((act: any, i: number) => (
              <div key={i} className="relative flex gap-4">
                <div
                  className={`z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${act.iconBg || "bg-primary-fixed text-primary"}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {act.icon || "update"}
                  </span>
                </div>
                <div>
                  <p className="text-body-md text-on-surface">
                    <span className="font-bold">{act.user || "System"}</span>{" "}
                    {act.action || "updated"}{" "}
                    {act.resource && (
                      <span className="font-bold">{act.resource}</span>
                    )}
                  </p>
                  <p className="text-label-md text-on-surface-variant">
                    {act.detail || act.action}
                  </p>
                  <p className="text-label-md text-outline mt-1">
                    {act.time || act.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/audit-log")}
            className="mt-6 text-primary text-label-md font-label-md hover:underline"
          >
            View all activity
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-headline-md font-headline-md text-on-surface mb-6">
          Active Workflows
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {wfs.slice(0, 3).map((wf: any, i: number) => (
            <div
              key={i}
              className="glass-card p-6 rounded-xl hover:border-primary transition-all group cursor-pointer"
              onClick={() => navigate("/workflows")}
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-body-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                  {wf.name}
                </h4>
                {i === 0 && (
                  <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-on-surface">
                    more_vert
                  </span>
                )}
              </div>
              <p className="text-body-md text-on-surface-variant mb-6 line-clamp-2">
                {wf.desc}
              </p>
              <div className="flex items-center gap-4 py-3 border-t border-outline-variant">
                <div className="flex items-center gap-1 text-label-md font-label-md text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">
                    {wf.schedule === "Real-time" ? "bolt" : "schedule"}
                  </span>
                  {wf.schedule}
                </div>
                <div className="flex items-center gap-1 text-label-md font-label-md text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">
                    history
                  </span>
                  {wf.lastRun || wf.last_run}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => alert("Initiating new data connection wizard...")}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
      >
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
};

export default DashboardPage;
