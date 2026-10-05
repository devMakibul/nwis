/**
 * Well Explorer — search, filter, and browse all wells.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Filter, ChevronRight, Cylinder, TrendingUp, MapPin } from "lucide-react";
import { wellsService, basinsService } from "@/services/wellsService";
import { cn } from "@/utils";

const STATUS_COLORS: Record<string, string> = {
  Drilling: "bg-blue-100 text-blue-700",
  Producing: "bg-green-100 text-green-700",
  Completed: "bg-purple-100 text-purple-700",
  Testing: "bg-amber-100 text-amber-700",
  Suspended: "bg-gray-100 text-gray-600",
  Abandoned: "bg-red-100 text-red-700",
  Planned: "bg-cyan-100 text-cyan-700",
};

const PURPOSE_COLORS: Record<string, string> = {
  Exploratory: "bg-indigo-50 text-indigo-700",
  Appraisal: "bg-sky-50 text-sky-700",
  Development: "bg-emerald-50 text-emerald-700",
  Injection: "bg-orange-50 text-orange-700",
  Observation: "bg-gray-50 text-gray-600",
};

const TRAJECTORY_ICONS: Record<string, string> = {
  Vertical: "↕",
  Directional: "↗",
  Horizontal: "→",
  Multilateral: "⊕",
};

export function WellExplorerPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [basinFilter, setBasinFilter] = useState("");

  const { data: basins } = useQuery({
    queryKey: ["basins"],
    queryFn: basinsService.list,
    staleTime: 300_000,
  });

  const { data: wells, isLoading } = useQuery({
    queryKey: ["wells", search, statusFilter, purposeFilter, basinFilter],
    queryFn: () =>
      wellsService.list({
        search: search || undefined,
        status: statusFilter || undefined,
        purpose: purposeFilter || undefined,
        basin_id: basinFilter ? parseInt(basinFilter) : undefined,
        limit: 500,
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Cylinder size={20} className="text-blue-600" />
          Well Explorer
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {wells?.length ?? "—"} wells across {basins?.length ?? "—"} petroleum basins
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wells, fields, basins..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Basin filter */}
        <select
          value={basinFilter}
          onChange={(e) => setBasinFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-700"
        >
          <option value="">All Basins</option>
          {basins?.map((b: { id: number; name: string }) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-700"
        >
          <option value="">All Status</option>
          {["Drilling", "Producing", "Completed", "Testing", "Suspended", "Abandoned", "Planned"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Purpose filter */}
        <select
          value={purposeFilter}
          onChange={(e) => setPurposeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-700"
        >
          <option value="">All Purposes</option>
          {["Exploratory", "Appraisal", "Development", "Injection", "Observation"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Well list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Well</span>
            <span>Field / Basin</span>
            <span>Status</span>
            <span>Purpose</span>
            <span>Trajectory</span>
            <span>Depth (m)</span>
            <span />
          </div>

          <div className="divide-y divide-gray-100 h-[calc(100vh-260px)] overflow-y-auto">
            {(wells ?? []).map((well: {
              id: number;
              well_name: string;
              well_number?: string;
              field_name?: string;
              basin_name?: string;
              well_status: string;
              well_purpose: string;
              trajectory_type: string;
              current_depth?: number;
              total_depth?: number;
              latitude: number;
              longitude: number;
            }) => (
              <div
                key={well.id}
                onClick={() => navigate(`/wells/${well.id}`)}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer items-center"
              >
                {/* Well name */}
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate">{well.well_name}</p>
                  {well.well_number && (
                    <p className="text-xs text-gray-400 truncate">{well.well_number}</p>
                  )}
                </div>

                {/* Field / Basin */}
                <div>
                  <p className="text-sm text-gray-700 truncate">{well.field_name}</p>
                  <p className="text-xs text-gray-400 truncate">{well.basin_name}</p>
                </div>

                {/* Status */}
                <div>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                    STATUS_COLORS[well.well_status] || "bg-gray-100 text-gray-600"
                  )}>
                    {well.well_status}
                  </span>
                </div>

                {/* Purpose */}
                <div>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                    PURPOSE_COLORS[well.well_purpose] || "bg-gray-100 text-gray-600"
                  )}>
                    {well.well_purpose}
                  </span>
                </div>

                {/* Trajectory */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-500">{TRAJECTORY_ICONS[well.trajectory_type] || "—"}</span>
                  <span className="text-xs text-gray-600">{well.trajectory_type}</span>
                </div>

                {/* Depth */}
                <div>
                  <span className="text-sm tabular-nums text-gray-700">
                    {well.current_depth?.toLocaleString() ?? "—"}
                  </span>
                  {well.total_depth && well.total_depth !== well.current_depth && (
                    <span className="text-xs text-gray-400"> / {well.total_depth.toLocaleString()}</span>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight size={14} className="text-gray-300 justify-self-end" />
              </div>
            ))}

            {(wells ?? []).length === 0 && (
              <div className="p-12 text-center">
                <Drill size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No wells match your filters</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
            Showing {(wells ?? []).length} wells
          </div>
        </div>
      )}
    </div>
  );
}
