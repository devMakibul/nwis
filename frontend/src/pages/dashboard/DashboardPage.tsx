/**
 * Dashboard — live data from backend.
 * Shows operational KPIs, event distribution, well status breakdown.
 */
import { useQuery } from "@tanstack/react-query";
import {
  Radio, Map, AlertTriangle, BookOpen, TrendingUp,
  Drill, CheckCircle, Clock, XCircle, Activity, BarChart3, LayoutDashboard,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { dashboardService, wellsService } from "@/services/wellsService";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Color tokens ─────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Drilling: "#2563eb",
  Producing: "#059669",
  Completed: "#7c3aed",
  Testing: "#d97706",
  Suspended: "#6b7280",
  Abandoned: "#374151",
  Planned: "#0891b2",
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626",
  High: "#ea580c",
  Moderate: "#d97706",
  Low: "#059669",
  Information: "#0284c7",
};

const PIE_COLORS = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#0891b2", "#dc2626"];

// ─── Reusable components ──────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, iconColor,
}: { label: string; value: string | number; sub?: string; icon: React.ElementType; iconColor: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconColor + "18" }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-0.5 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
      <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
      <div className="h-7 w-16 bg-gray-100 rounded" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: dashboardService.getOverview,
    staleTime: 30_000,
  });

  const { data: wellStats, isLoading: wsLoading } = useQuery({
    queryKey: ["well-stats"],
    queryFn: wellsService.stats,
    staleTime: 30_000,
  });

  const isLoading = ovLoading || wsLoading;

  // Prepare chart data
  const wellStatusData = wellStats
    ? Object.entries({
        Producing: wellStats.producing,
        Drilling: wellStats.drilling,
        Completed: wellStats.completed,
        Suspended: wellStats.suspended,
        Testing: wellStats.testing,
        Abandoned: wellStats.abandoned,
      }).map(([name, value]) => ({ name, value }))
    : [];

  const severityData = overview
    ? Object.entries(overview.events.by_severity).map(([name, value]) => ({
        name,
        value: value as number,
        color: SEVERITY_COLORS[name] || "#9ca3af",
      }))
    : [];

  const topEventData = overview?.events.top_types?.slice(0, 6) ?? [];

  const purposeData = wellStats
    ? Object.entries(wellStats.by_purpose).map(([name, value], i) => ({
        name,
        value: value as number,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
    : [];

  return (
    <div className="p-6 max-w-[1400px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <LayoutDashboard size={24} className="text-blue-600" />
          Operational Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcome, {user?.name} — {user?.role.name}
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <LoadingCard key={i} />)
        ) : (
          <>
            <KpiCard
              label="Total Wells" value={overview?.wells.total ?? "—"} icon={Drill} iconColor="#2563eb"
              sub={`${overview?.wells.drilling ?? 0} drilling now`}
            />
            <KpiCard
              label="Producing Wells" value={overview?.wells.producing ?? "—"} icon={CheckCircle} iconColor="#059669"
              sub="Active producers"
            />
            <KpiCard
              label="High/Critical Events" value={overview?.events.high_critical ?? "—"} icon={AlertTriangle} iconColor="#dc2626"
              sub={`${overview?.events.total ?? 0} total events`}
            />
            <KpiCard
              label="Total NPT Hours" value={overview?.events.total_npt_hours?.toLocaleString() ?? "—"} icon={Clock} iconColor="#d97706"
              sub={`${overview?.knowledge.lessons_learned ?? 0} lessons learned`}
            />
          </>
        )}
      </div>

      {/* Second row KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <LoadingCard key={i} />)
        ) : (
          <>
            <KpiCard label="Basins" value={overview?.knowledge.basins ?? "—"} icon={Map} iconColor="#7c3aed" />
            <KpiCard label="Fields" value={overview?.knowledge.fields ?? "—"} icon={Activity} iconColor="#0891b2" />
            <KpiCard label="Documents" value={overview?.knowledge.documents ?? 0} icon={BarChart3} iconColor="#6b7280" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Well Status Distribution */}
        <Section title="Well Status Distribution">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            {isLoading ? (
              <div className="h-[280px] bg-gray-50 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={wellStatusData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }}
                    cursor={{ fill: "#f9fafb" }}
                  />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {wellStatusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#9ca3af"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>

        {/* Event Severity Breakdown */}
        <Section title="Event Severity Breakdown">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            {isLoading ? (
              <div className="h-[280px] bg-gray-50 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {severityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>

        {/* Well Purpose Breakdown */}
        <Section title="Well Purpose Distribution">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            {isLoading ? (
              <div className="h-[280px] bg-gray-50 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={purposeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {purposeData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>
      </div>

      {/* Top Drilling Event Types */}
      <Section title="Most Frequent Drilling Events">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          {isLoading ? (
            <div className="h-[280px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topEventData} layout="vertical" barSize={18}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="event_type" type="category" tick={{ fontSize: 11 }} width={140} />
                <Tooltip contentStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }} />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Section>
    </div>
  );
}
