import { X, ChevronRight, Activity, Drill, MapPin, Clock, FileText, Wrench, BookOpen } from "lucide-react";
import { documentsService } from "@/services/intelligenceService";
import { cn } from "@/utils";

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

export function EventDetailModal({ event, onClose }: { event: any; onClose: () => void }) {
  const eventColor = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS["Other"];
  const severityColor = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS["Low"];

  const handleViewSource = async () => {
    if (!event.source_document_id) return;
    try {
      const res = await documentsService.downloadFile(event.source_document_id);
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error(e);
      alert("Failed to open source document.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/70 z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", eventColor)}>
                {event.event_type || "Event"}
              </span>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", severityColor)}>
                {event.severity || "Unknown"}
              </span>
              {event.npt_hours != null && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {event.npt_hours}h NPT
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-gray-900 mt-2">
              {event.event_type} {event.well_name ? `— ${event.well_name}` : ""}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 ml-3 flex-shrink-0">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Location info */}
          {(event.basin_name || event.field_name || event.well_name) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Activity, label: "Basin", value: event.basin_name },
                { icon: MapPin, label: "Field", value: event.field_name },
                { icon: Drill, label: "Well", value: event.well_name },
              ].filter(x => x.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className="text-gray-400" />
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Depth */}
          {(event.start_depth != null || event.end_depth != null) && (
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-6">
              <div>
                <p className="text-[10px] text-indigo-400 uppercase tracking-wide">Start Depth</p>
                <p className="text-lg font-bold text-indigo-700">{event.start_depth ?? "—"} m</p>
              </div>
              {event.end_depth != null && (
                <>
                  <ChevronRight size={16} className="text-indigo-300" />
                  <div>
                    <p className="text-[10px] text-indigo-400 uppercase tracking-wide">End Depth</p>
                    <p className="text-lg font-bold text-indigo-700">{event.end_depth} m</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Description */}
          {(event.description || event.evidence) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText size={12} /> Description
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">{event.description || event.evidence}</p>
            </div>
          )}

          {/* Cause & Consequence */}
          {(event.cause || event.consequence) && (
            <div className="grid grid-cols-2 gap-4">
              {event.cause && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Root Cause</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{event.cause}</p>
                </div>
              )}
              {event.consequence && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Consequence</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{event.consequence}</p>
                </div>
              )}
            </div>
          )}

          {/* Mitigations */}
          {(event.mitigations?.length > 0 || event.mitigation) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Wrench size={12} /> Mitigation Actions
              </h4>
              <div className="space-y-2">
                {event.mitigations?.length > 0 ? event.mitigations.map((m: any, i: number) => (
                  <div key={i} className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <p className="text-sm text-green-800">{m.action}</p>
                    {m.result && <p className="text-xs text-green-600 mt-1 italic">Result: {m.result}</p>}
                  </div>
                )) : (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <p className="text-sm text-green-800">{event.mitigation}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lessons Learned */}
          {(event.lessons?.length > 0 || event.lesson) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <BookOpen size={12} /> Lessons Learned
              </h4>
              <div className="space-y-2">
                {event.lessons?.length > 0 ? event.lessons.map((ll: any, i: number) => (
                  <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-sm text-blue-800">{ll.lesson}</p>
                    {ll.action && <p className="text-xs text-blue-600 mt-1 italic">→ {ll.action}</p>}
                  </div>
                )) : (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-sm text-blue-800">{event.lesson}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date and Source */}
          <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5">
              <Clock size={11} />
              {event.created_at ? `Recorded ${new Date(event.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}` : "Date unknown"}
            </div>
            {event.source_document_id && (
              <button
                onClick={handleViewSource}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <FileText size={13} /> View Source Document
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
