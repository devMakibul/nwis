/**
 * Historical Events Page
 * Shows all committed drilling incidents across all wells/fields/basins.
 * Clickable rows show a full event detail popup.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, X, Filter, ChevronRight, Activity,
  Drill, MapPin, Clock, FileText, Wrench, BookOpen, Search, History
} from "lucide-react";
import { documentsService } from "@/services/intelligenceService";
import { cn } from "@/utils";
import { EventDetailModal } from "@/components/shared/EventDetailModal";

// ─── Types ────────────────────────────────────────────────────

interface HistoricalEvent {
  id: number;
  event_type: string;
  severity: string;
  start_depth?: number | null;
  end_depth?: number | null;
  description?: string | null;
  cause?: string | null;
  consequence?: string | null;
  npt_hours?: number | null;
  well_id: number;
  well_name: string;
  field_id: number;
  field_name: string;
  basin_id: number;
  basin_name: string;
  source_document_id?: number | null;
  created_at?: string | null;
  mitigations: { action: string; result?: string | null }[];
  lessons: { lesson: string; action?: string | null }[];
}

// ─── Severity config ──────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  Low:      "bg-blue-100 text-blue-700",
  Moderate: "bg-yellow-100 text-yellow-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  "Lost Circulation":    "bg-purple-50 text-purple-700 border-purple-200",
  "Kick":               "bg-red-50 text-red-700 border-red-200",
  "Stuck Pipe":         "bg-orange-50 text-orange-700 border-orange-200",
  "Torque Spike":       "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Formation Instability": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Blowout":            "bg-red-100 text-red-800 border-red-300",
  "Equipment Failure":  "bg-gray-50 text-gray-700 border-gray-200",
  "Other":              "bg-gray-50 text-gray-600 border-gray-200",
};

// ─── Main Page ────────────────────────────────────────────────



const EVENT_TYPE_OPTIONS = [
  "All Types",
  "Lost Circulation",
  "Kick",
  "Stuck Pipe",
  "Formation Instability",
  "Blowout",
  "Equipment Failure",
  "Torque Spike",
];

export function HistoricalEventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");

  const { data: catalogData } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => documentsService.getBasinsFieldsWells(),
    staleTime: 300_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["historical-events", severityFilter, eventTypeFilter],
    queryFn: () => documentsService.getHistoricalEvents({
      severity: severityFilter || undefined,
      event_type: eventTypeFilter || undefined,
      limit: 1000,
    }),
    staleTime: 30_000,
  });

  const allEvents: HistoricalEvent[] = data?.events ?? [];

  // Client-side search filter
  const filtered = allEvents.filter((ev) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ev.well_name?.toLowerCase().includes(q) ||
      ev.field_name?.toLowerCase().includes(q) ||
      ev.basin_name?.toLowerCase().includes(q) ||
      ev.event_type?.toLowerCase().includes(q) ||
      ev.description?.toLowerCase().includes(q)
    );
  });

  const EVENT_TYPE_OPTIONS = [
    "Lost Circulation", "Kick", "Stuck Pipe", "Torque Spike",
    "Formation Instability", "Blowout", "Casing Wear",
    "Cementing Issue", "Equipment Failure", "Other",
  ];

  // Stats
  const criticalCount = allEvents.filter((e) => e.severity === "Critical").length;
  const highCount = allEvents.filter((e) => e.severity === "High").length;
  const totalNPT = allEvents.reduce((sum, e) => sum + (e.npt_hours ?? 0), 0);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <History size={20} className="text-blue-600" />
          Historical Events
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          All committed drilling incidents, NPT events, and operational hazards from the NWIS knowledge base.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Events", value: allEvents.length, color: "#2563eb" },
          { label: "Critical", value: criticalCount, color: "#dc2626" },
          { label: "High Severity", value: highCount, color: "#d97706" },
          { label: "Total NPT Hours", value: `${totalNPT.toFixed(1)}h`, color: "#7c3aed" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-xl font-semibold text-gray-900 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
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
            placeholder="Search well, field, basin, event..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Severity filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-700"
        >
          <option value="">All Severities</option>
          {["Low", "Moderate", "High", "Critical"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Event Type filter */}
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-700"
        >
          <option value="">All Event Types</option>
          {EVENT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Event list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>Event</span>
          <span>Well</span>
          <span>Field / Basin</span>
          <span>Severity</span>
          <span>Depth (m)</span>
          <span>NPT (h)</span>
          <span />
        </div>

        <div className="divide-y divide-gray-100 h-[calc(100vh-340px)] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <AlertTriangle size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No events found</p>
              <p className="text-xs text-gray-400 mt-1">
                Events appear here after documents are uploaded, reviewed, and committed.
              </p>
            </div>
          ) : (
            filtered.map((ev) => {
              const severityColor = SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS["Low"];
              const eventColor = EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS["Other"];
              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer items-center"
                >
                  {/* Event */}
                  <div className="min-w-0 flex items-center">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium truncate max-w-full", eventColor)}>
                      {ev.event_type}
                    </span>
                  </div>

                  {/* Well */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ev.well_name}</p>
                    {ev.description && (
                      <p className="text-[10px] text-gray-400 truncate">{ev.description}</p>
                    )}
                  </div>

                  {/* Field / Basin */}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{ev.field_name}</p>
                    <p className="text-xs text-gray-400 truncate">{ev.basin_name}</p>
                  </div>

                  {/* Severity */}
                  <div>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", severityColor)}>
                      {ev.severity}
                    </span>
                  </div>

                  {/* Depth */}
                  <div>
                    <span className="text-sm tabular-nums text-gray-700">
                      {ev.start_depth != null ? ev.start_depth.toLocaleString() : "—"}
                    </span>
                  </div>

                  {/* NPT */}
                  <div>
                    <span className="text-sm tabular-nums text-gray-700">
                      {ev.npt_hours != null ? ev.npt_hours.toLocaleString() : "—"}
                    </span>
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={14} className="text-gray-300 justify-self-end" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          Showing {filtered.length} events
        </div>
      </div>

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
