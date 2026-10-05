/**
 * Well Intelligence Detail Page
 * Full well analysis: header, formation column, trajectory, events timeline,
 * offset wells, and lessons learned.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Drill, MapPin, Calendar, Activity,
  AlertTriangle, BookOpen, TrendingUp, ChevronRight,
  Clock, Target, Layers,
} from "lucide-react";
import { wellsService } from "@/services/wellsService";
import { FormationColumn } from "@/components/shared/FormationColumn";
import { TrajectoryPlot } from "@/components/shared/TrajectoryPlot";
import { EventDetailModal } from "@/components/shared/EventDetailModal";
import { cn } from "@/utils";

const STATUS_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  Drilling:  { color: "#2563eb", bg: "bg-blue-50",   text: "text-blue-700" },
  Producing: { color: "#059669", bg: "bg-green-50",  text: "text-green-700" },
  Completed: { color: "#7c3aed", bg: "bg-purple-50", text: "text-purple-700" },
  Testing:   { color: "#d97706", bg: "bg-amber-50",  text: "text-amber-700" },
  Suspended: { color: "#6b7280", bg: "bg-gray-100",  text: "text-gray-600" },
  Abandoned: { color: "#374151", bg: "bg-gray-100",  text: "text-gray-700" },
  Planned:   { color: "#0891b2", bg: "bg-cyan-50",   text: "text-cyan-700" },
};

const SEVERITY_CONFIG: Record<string, { dot: string; badge: string }> = {
  Critical:    { dot: "#dc2626", badge: "bg-red-100 text-red-700" },
  High:        { dot: "#ea580c", badge: "bg-orange-100 text-orange-700" },
  Moderate:    { dot: "#d97706", badge: "bg-amber-100 text-amber-700" },
  Low:         { dot: "#059669", badge: "bg-green-100 text-green-700" },
  Information: { dot: "#0284c7", badge: "bg-blue-100 text-blue-700" },
};

function InfoGrid({ items }: { items: Array<{ label: string; value: string | number | undefined | null }> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">{value ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  iconColor,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl p-5", className)}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon size={15} style={{ color: iconColor }} />
        {title}
      </h3>
      {children}
    </div>
  );
}

export function WellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const wellId = parseInt(id ?? "0");
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const { data: well, isLoading } = useQuery({
    queryKey: ["well-detail", wellId],
    queryFn: () => wellsService.getDetail(wellId),
    enabled: !!wellId,
  });

  const { data: formations } = useQuery({
    queryKey: ["well-formations", wellId],
    queryFn: () => wellsService.getFormations(wellId),
    enabled: !!wellId,
  });

  const { data: events } = useQuery({
    queryKey: ["well-events", wellId],
    queryFn: () => wellsService.getEvents(wellId, { limit: 20 }),
    enabled: !!wellId,
  });

  const { data: trajectory } = useQuery({
    queryKey: ["well-trajectory", wellId],
    queryFn: () => wellsService.getTrajectory(wellId),
    enabled: !!wellId,
  });

  const { data: offsetWells } = useQuery({
    queryKey: ["offset-wells", wellId],
    queryFn: () => wellsService.getOffsetWells(wellId, 50),
    enabled: !!wellId,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-[1400px]">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!well) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Well not found</p>
        <button onClick={() => navigate("/wells")} className="mt-3 text-sm text-blue-600 hover:underline">
          ← Back to Well Explorer
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[well.well_status] || STATUS_CONFIG.Suspended;
  const depthPct = well.current_depth && well.planned_depth
    ? Math.min(100, Math.round((well.current_depth / well.planned_depth) * 100))
    : null;

  const totalNPT = (events ?? []).reduce((acc: number, e: { npt_hours?: number }) => acc + (e.npt_hours || 0), 0);

  return (
    <div className="p-6 max-w-[1400px] space-y-5">
      {/* Back nav */}
      <button
        onClick={() => navigate("/wells")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={14} />
        Well Explorer
      </button>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900">{well.well_name}</h1>
              <span
                className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", statusCfg.bg, statusCfg.text)}
              >
                {well.well_status}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {well.well_purpose}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {well.trajectory_type}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1.5">
              <MapPin size={12} />
              {well.field_name} · {well.basin_name} · {well.latitude?.toFixed(4)}°N, {well.longitude?.toFixed(4)}°E
            </p>
          </div>

          {/* Depth card */}
          <div className="bg-gray-50 rounded-xl p-4 min-w-56">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Depth Progress</p>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-2xl font-semibold text-gray-900 tabular-nums">
                {well.current_depth?.toLocaleString() ?? "—"}
              </span>
              <span className="text-sm text-gray-400 mb-0.5">m</span>
              <span className="text-xs text-gray-400 mb-0.5 ml-1">
                / {well.planned_depth?.toLocaleString()}m planned
              </span>
            </div>
            {depthPct !== null && (
              <>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${depthPct}%`, backgroundColor: statusCfg.color }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{depthPct}% complete</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Reservoir", value: well.reservoir_type || "—", icon: Layers, color: "#7c3aed" },
          { label: "Hydrocarbon", value: well.hydrocarbon_type || "—", icon: Target, color: "#059669" },
          { label: "Total NPT", value: `${totalNPT.toFixed(1)}h`, icon: Clock, color: "#d97706" },
          { label: "Events", value: (events ?? []).length, icon: AlertTriangle, color: "#dc2626" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "18" }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Formation Column */}
        <SectionCard title="Formation Column" icon={Layers} iconColor="#7c3aed">
          <div className="flex gap-4">
            <FormationColumn
              intervals={formations ?? []}
              totalDepth={well.total_depth || well.planned_depth || 3000}
              height={360}
            />
            {/* Quality legend */}
            <div className="flex-shrink-0 pt-4 space-y-2">
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Reservoir Quality</p>
              {[["Excellent", "#059669"], ["Good", "#2563eb"], ["Fair", "#d97706"], ["Poor", "#dc2626"]].map(([q, c]) => (
                <div key={q} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
                  <span className="text-[10px] text-gray-500">{q}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Trajectory Plot */}
        <SectionCard title="Well Trajectory" icon={Activity} iconColor="#2563eb">
          {trajectory && trajectory.length > 0 ? (
            <TrajectoryPlot
              surveys={trajectory}
              trajectoryType={well.trajectory_type}
              width={270}
              height={360}
            />
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-gray-400">No trajectory survey data</p>
            </div>
          )}
          {trajectory && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Max Incl.", value: well.max_inclination != null ? `${well.max_inclination}°` : "—" },
                { label: "Max Azimuth", value: well.max_azimuth != null ? `${well.max_azimuth}°` : "—" },
                { label: "Max DLS", value: well.max_dogleg_severity != null ? `${well.max_dogleg_severity}°/30m` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 uppercase">{label}</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Well Identity */}
        <SectionCard title="Well Identity" icon={Drill} iconColor="#059669">
          <InfoGrid items={[
            { label: "Well Number", value: well.well_number },
            { label: "Field", value: well.field_name },
            { label: "Basin", value: well.basin_name },
            { label: "Latitude", value: well.latitude?.toFixed(5) },
            { label: "Longitude", value: well.longitude?.toFixed(5) },
            { label: "Spud Date", value: well.spud_date },
            { label: "Completion", value: well.completion_date },
            { label: "Total Depth", value: well.total_depth ? `${well.total_depth.toLocaleString()}m` : "—" },
            { label: "Prod. Status", value: well.production_status },
          ]} />
        </SectionCard>
      </div>

      {/* ── Drilling Events ──────────────────────────────── */}
      <SectionCard title={`Drilling Events (${(events ?? []).length})`} icon={AlertTriangle} iconColor="#dc2626">
        {(events ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No drilling events recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 pr-4">Event Type</th>
                  <th className="pb-2 pr-4">Severity</th>
                  <th className="pb-2 pr-4">Depth</th>
                  <th className="pb-2 pr-4">NPT (h)</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(events ?? []).map((ev: {
                  id: number;
                  event_type: string;
                  severity: string;
                  start_depth?: number;
                  npt_hours?: number;
                  description?: string;
                }) => {
                  const sev = SEVERITY_CONFIG[ev.severity] || SEVERITY_CONFIG.Low;
                  return (
                    <tr 
                      key={ev.id} 
                      className="hover:bg-gray-50 cursor-pointer" 
                      onClick={() => setSelectedEvent({ ...ev, well_name: well.well_name, field_name: well.field_name, basin_name: well.basin_name })}
                    >
                      <td className="py-2.5 pr-4 font-medium text-gray-800">{ev.event_type}</td>
                      <td className="py-2.5 pr-4">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", sev.badge)}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums text-gray-600">
                        {ev.start_depth ? `${ev.start_depth}m` : "—"}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums text-gray-600">
                        {ev.npt_hours?.toFixed(1) ?? "—"}
                      </td>
                      <td className="py-2.5 text-xs text-gray-500 max-w-xs truncate">
                        {ev.description || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Offset Wells ─────────────────────────────────── */}
      <SectionCard title={`Offset Wells within 50km (${(offsetWells ?? []).length})`} icon={TrendingUp} iconColor="#0891b2">
        {(offsetWells ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No nearby wells found</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(offsetWells ?? []).slice(0, 9).map((ow: {
              id: number;
              well_name: string;
              field_name?: string;
              distance_km: number;
              well_status: string;
              trajectory_type: string;
              total_depth?: number;
            }) => {
              const st = STATUS_CONFIG[ow.well_status] || STATUS_CONFIG.Suspended;
              return (
                <button
                  key={ow.id}
                  onClick={() => navigate(`/wells/${ow.id}`)}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-left hover:border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{ow.well_name}</p>
                    <ChevronRight size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{ow.field_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full", st.bg, st.text)}>
                      {ow.well_status}
                    </span>
                    <span className="text-xs text-gray-400">{ow.distance_km} km</span>
                    {ow.total_depth && (
                      <span className="text-xs text-gray-400">{ow.total_depth.toLocaleString()}m</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
