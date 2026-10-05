/**
 * Analytics Dashboard Page
 * KPI overview, event frequency charts, well distribution,
 * NPT trends, basin-level stats, formation risk heatmap.
 */
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  TrendingDown, AlertTriangle, ChartSpline, Globe,
  Layers, BookOpen, Activity,
} from "lucide-react";
import api from "@/services/api";
import { cn } from "@/utils";

// ─── API fetchers ─────────────────────────────────────────────
const fetchOverview   = () => api.get("/api/analytics/overview").then((r) => r.data);
const fetchEvents     = () => api.get("/api/analytics/events").then((r) => r.data);
const fetchWells      = () => api.get("/api/analytics/wells").then((r) => r.data);
const fetchBasins     = () => api.get("/api/analytics/basins").then((r) => r.data);
const fetchNPT        = () => api.get("/api/analytics/npt-trends").then((r) => r.data);

// ─── Color palette ────────────────────────────────────────────
const CHART_COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#ea580c", "#84cc16"];

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626", High: "#ea580c", Moderate: "#d97706", Low: "#059669",
};

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; color: string; trend?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + "15" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend && <p className="text-[10px] text-green-600 mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────
function Section({ title, children, className }: {
  title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl p-5", className)}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600">
          <span className="font-medium">{p.name}:</span> {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
function ChartSkeleton({ h = 220 }: { h?: number }) {
  return <div className="animate-pulse bg-gray-100 rounded-xl" style={{ height: h }} />;
}

// ─── Main page ────────────────────────────────────────────────
export function AnalyticsPage() {
  const { data: overview, isLoading: ovLoad } = useQuery({ queryKey: ["analytics-overview"], queryFn: fetchOverview, staleTime: 30_000 });
  const { data: events,   isLoading: evLoad  } = useQuery({ queryKey: ["analytics-events"],   queryFn: fetchEvents,   staleTime: 30_000 });
  const { data: wells,    isLoading: wlLoad  } = useQuery({ queryKey: ["analytics-wells"],    queryFn: fetchWells,    staleTime: 30_000 });
  const { data: basins,   isLoading: bsLoad  } = useQuery({ queryKey: ["analytics-basins"],   queryFn: fetchBasins,   staleTime: 30_000 });
  const { data: npt,      isLoading: nptLoad } = useQuery({ queryKey: ["analytics-npt"],      queryFn: fetchNPT,      staleTime: 30_000 });

  return (
    <div className="p-6 max-w-[1600px] space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ChartSpline size={20} className="text-blue-600" />
          Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Operational intelligence metrics across all wells, fields, and basins</p>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────── */}
      {ovLoad ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Wells" value={overview?.total_wells ?? 0}
            sub={`${overview?.active_wells ?? 0} active`} icon={Activity} color="#2563eb" />
          <KpiCard label="Total Events" value={overview?.total_events ?? 0}
            sub={`${overview?.high_severity_pct ?? 0}% high/critical`} icon={AlertTriangle} color="#dc2626" />
          <KpiCard label="Total NPT" value={`${(overview?.total_npt_hours ?? 0).toLocaleString()}h`}
            sub={`${overview?.avg_npt_hours ?? 0}h avg per event`} icon={TrendingDown} color="#d97706" />
          <KpiCard label="Fields / Basins" value={`${overview?.total_fields ?? 0} / ${overview?.total_basins ?? 0}`}
            sub="Operational footprint" icon={Globe} color="#059669" />
        </div>
      )}

      {/* ── Row 1: Event frequency + Severity breakdown ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        <Section title="Drilling Events by Type">
          {evLoad ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={events?.by_type ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                <XAxis dataKey="event_type" tick={{ fontSize: 10, fill: "#6b7280" }}
                  angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Incidents" fill="#2563eb" radius={[3, 3, 0, 0]}>
                  {(events?.by_type ?? []).map((_: unknown, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Severity Distribution">
          {evLoad ? <ChartSkeleton /> : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={events?.by_severity ?? []} dataKey="count" nameKey="severity"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {(events?.by_severity ?? []).map((entry: { severity: string }, i: number) => (
                      <Cell key={i} fill={SEVERITY_COLORS[entry.severity] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Summary */}
              <div className="w-full space-y-1.5 mt-2">
                {(events?.by_severity ?? []).map((s: { severity: string; count: number }) => (
                  <div key={s.severity} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[s.severity] || "#9ca3af" }} />
                      <span className="text-xs text-gray-600">{s.severity}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* ── Row 2: Well status + Basin distribution ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Well Status Distribution">
          {wlLoad ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={wells?.by_status ?? []} layout="vertical" margin={{ top: 0, right: 40, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: "#6b7280" }} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Wells" fill="#2563eb" radius={[0, 3, 3, 0]}>
                  {(wells?.by_status ?? []).map((_: unknown, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Wells by Basin">
          {bsLoad ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={basins ?? []} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis type="category" dataKey="basin" tick={{ fontSize: 10, fill: "#6b7280" }} width={130} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total_wells" name="Total Wells" fill="#7c3aed" radius={[0, 3, 3, 0]} />
                <Bar dataKey="active_wells" name="Active" fill="#059669" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* ── Row 3: NPT by event type ───────────────────────────── */}
      <Section title="Non-Productive Time (NPT) by Event Type & Severity">
        {nptLoad ? <ChartSkeleton h={260} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(() => {
              // Aggregate NPT by event type
              const byType: Record<string, number> = {};
              for (const row of (npt ?? [])) {
                byType[row.event_type] = (byType[row.event_type] || 0) + row.total_npt;
              }
              return Object.entries(byType)
                .map(([name, value]) => ({ name, value: Math.round(value) }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 8);
            })()} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }}
                angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }}
                label={{ value: "NPT (hours)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "#9ca3af" } }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Total NPT (h)" radius={[3, 3, 0, 0]}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Cell key={i} fill={SEVERITY_COLORS["High"]} opacity={1 - i * 0.08} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Row 4: Trajectory + Top NPT table ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        <Section title="Well Trajectory Types">
          {wlLoad ? <ChartSkeleton h={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={(wells?.by_trajectory ?? []).map((t: { trajectory: string; count: number }) => ({
                  name: t.trajectory, value: t.count
                }))} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={40} outerRadius={75} paddingAngle={2}>
                  {(wells?.by_trajectory ?? []).map((_: unknown, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Top NPT Events">
          {evLoad ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["Well", "Event Type", "Severity", "NPT (h)"].map((h) => (
                      <th key={h} className="text-left text-gray-400 uppercase tracking-wide pb-2 pr-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(events?.top_npt_events ?? []).map((e: { well_name: string; event_type: string; severity: string; npt_hours: number }, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2 pr-3 font-medium text-gray-900">{e.well_name}</td>
                      <td className="py-2 pr-3 text-gray-600">{e.event_type}</td>
                      <td className="py-2 pr-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                          style={{ backgroundColor: (SEVERITY_COLORS[e.severity] || "#9ca3af") + "15",
                                   color: SEVERITY_COLORS[e.severity] || "#9ca3af" }}>
                          {e.severity}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-semibold text-red-600">{e.npt_hours.toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* ── Row 5: Basin table ─────────────────────────────────── */}
      <Section title="Basin-Level Operational Summary">
        {bsLoad ? <ChartSkeleton h={140} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Basin", "State", "Total Wells", "Active Wells", "Fields"].map((h) => (
                    <th key={h} className="text-left text-[10px] text-gray-400 uppercase tracking-wide pb-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(basins ?? []).map((b: { basin: string; state: string; total_wells: number; active_wells: number; total_fields: number }, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{b.basin}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{b.state}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-gray-900">{b.total_wells}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-gray-900">{b.active_wells}</span>
                        <div className="flex-1 max-w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(100, (b.active_wells / Math.max(1, b.total_wells)) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-gray-500">{b.total_fields}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Depth stats */}
      {!wlLoad && wells?.depth_stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Shallowest Well", value: `${wells.depth_stats.min}m`, color: "#059669" },
            { label: "Average Well Depth", value: `${wells.depth_stats.avg}m`, color: "#2563eb" },
            { label: "Deepest Well", value: `${wells.depth_stats.max}m`, color: "#dc2626" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold tabular-nums mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
