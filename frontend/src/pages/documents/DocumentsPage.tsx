/**
 * DocumentsPage — Full document upload, processing modal, split-screen review, and commit workflow.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Upload, FileText, CheckCircle, Clock, AlertTriangle, Filter,
  Layers, X, Trash2, Plus, ChevronDown, Save, Send, Edit3, Eye,
  AlertCircle, Loader2, RefreshCcw, Wand2
} from "lucide-react";
import { documentsService } from "@/services/intelligenceService";
import { cn } from "@/utils";

// ─── Types ────────────────────────────────────────────────────

interface DocRow {
  id: number;
  file_name: string;
  document_type: string;
  file_size: number;
  page_count?: number;
  processing_status: string;
  upload_date: string;
  well_name?: string;
}

interface ExtractedEvent {
  _entity_id?: number;
  event_type: string;
  severity: string;
  start_depth?: number | null;
  end_depth?: number | null;
  description?: string | null;
  cause?: string | null;
  consequence?: string | null;
  npt_hours?: number | null;
  well_name?: string | null;
  field_name?: string | null;
  basin_name?: string | null;
  formation_name?: string | null;
  mitigation?: string | null;
  lesson_learned?: string | null;
  // resolved IDs after user picks from dropdowns
  well_id?: number | null;
  field_id?: number | null;
  basin_id?: number | null;
}

interface CatalogData {
  basins: { id: number; name: string }[];
  fields: { id: number; name: string; basin_id: number }[];
  wells: { id: number; name: string; field_id: number }[];
}

// ─── Status config ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; bg: string }> = {
  Uploaded:         { color: "text-blue-600",   icon: Clock,         bg: "bg-blue-50" },
  Processing:       { color: "text-amber-600",  icon: Loader2,       bg: "bg-amber-50" },
  Extracting:       { color: "text-purple-600", icon: Layers,        bg: "bg-purple-50" },
  "Extracting Events": { color: "text-indigo-600", icon: Layers, bg: "bg-indigo-50" },
  "Needs Approval": { color: "text-orange-600", icon: AlertCircle,   bg: "bg-orange-50" },
  Completed:        { color: "text-green-600",  icon: CheckCircle,   bg: "bg-green-50" },
  Failed:           { color: "text-red-600",    icon: AlertTriangle, bg: "bg-red-50" },
};

const SEVERITY_OPTIONS = ["Low", "Moderate", "High", "Critical"];
const EVENT_TYPES = [
  "Lost Circulation", "Kick", "Stuck Pipe", "Torque Spike",
  "Formation Instability", "Blowout", "Casing Wear",
  "Cementing Issue", "Equipment Failure", "Other",
];

const PROCESSING_STATUSES = new Set(["Uploaded", "Processing", "Extracting", "Extracting Events"]);

// ─── Processing Modal ─────────────────────────────────────────

function ProcessingModal({
  docId,
  fileName,
  onCancel,
  onReady,
}: {
  docId: number;
  fileName: string;
  onCancel: () => void;
  onReady: () => void;
}) {
  const [status, setStatus] = useState("Uploaded");
  const [cancelled, setCancelled] = useState(false);

  // Poll status
  useEffect(() => {
    if (cancelled) return;
    const interval = setInterval(async () => {
      try {
        const doc = await documentsService.getDetail(docId);
        setStatus(doc.processing_status);
        if (!PROCESSING_STATUSES.has(doc.processing_status)) {
          clearInterval(interval);
          if (doc.processing_status === "Needs Approval" || doc.processing_status === "Completed") {
            onReady();
          }
        }
      } catch {
        clearInterval(interval);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [docId, cancelled, onReady]);

  // Delete doc if user cancels / closes
  const handleCancel = async () => {
    setCancelled(true);
    try { await documentsService.delete(docId); } catch { /* ignore */ }
    onCancel();
  };

  // Warn on tab/page close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const steps = [
    { key: "Uploaded", label: "Uploaded", done: true },
    { key: "Processing", label: "Processing file" },
    { key: "Extracting", label: "Extracting text" },
    { key: "Extracting Events", label: "AI extracting events" },
    { key: "Needs Approval", label: "Ready for review" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="fixed inset-0 bg-gray-950/90 z-50 flex items-center justify-center">
      <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <h2 className="text-white font-semibold text-lg">Processing Document</h2>
          <p className="text-blue-100 text-sm mt-0.5 truncate">{fileName}</p>
        </div>

        <div className="px-6 py-8">
          {/* Steps */}
          <div className="space-y-4 mb-8">
            {steps.map((step, idx) => {
              const isDone = idx < currentIdx || (status === step.key && status === "Needs Approval");
              const isActive = step.key === status && !isDone;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all",
                    isDone ? "bg-green-500 text-white" :
                    isActive ? "bg-blue-600 text-white" :
                    "bg-gray-100 text-gray-400"
                  )}>
                    {isDone ? <CheckCircle size={14} /> : isActive ? <Loader2 size={14} className="animate-spin" /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    isDone ? "text-green-700" : isActive ? "text-blue-700" : "text-gray-400"
                  )}>{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex gap-2">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>Keep this window open.</strong> Closing, refreshing, or navigating away will cancel processing and delete the uploaded document.
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="w-full py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
          >
            Cancel & Delete Document
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Editor Row ─────────────────────────────────────────

function EventRow({
  event,
  catalog,
  onChange,
  onDelete,
}: {
  event: ExtractedEvent;
  catalog: CatalogData;
  onChange: (updated: ExtractedEvent) => void;
  onDelete: () => void;
}) {
  const filteredFields = event.basin_id
    ? catalog.fields.filter((f) => f.basin_id === event.basin_id)
    : catalog.fields;

  const filteredWells = event.field_id
    ? catalog.wells.filter((w) => w.field_id === event.field_id)
    : catalog.wells;

  const set = (key: keyof ExtractedEvent, val: unknown) => onChange({ ...event, [key]: val });

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white relative group">
      {/* Delete */}
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 size={14} />
      </button>

      {/* Row 1: Event type + Severity */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Event Type *</label>
          <select
            value={event.event_type || ""}
            onChange={(e) => set("event_type", e.target.value)}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Select type…</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Severity *</label>
          <select
            value={event.severity || "Low"}
            onChange={(e) => set("severity", e.target.value)}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
          >
            {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: Well */}
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Well (Basin - Field) *</label>
          <select
            value={event.well_id || ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              const well = catalog.wells.find((w) => w.id === id);
              const field = well ? catalog.fields.find((f) => f.id === well.field_id) : null;
              onChange({
                ...event,
                well_id: id,
                field_id: well?.field_id || null,
                basin_id: field?.basin_id || null,
              });
            }}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Select well…</option>
            {catalog.basins.map(b => (
              <optgroup key={b.id} label={b.name}>
                {catalog.fields.filter(f => f.basin_id === b.id).map(f => (
                  catalog.wells.filter(w => w.field_id === f.id).map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({f.name})</option>
                  ))
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Depth */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Start Depth (m) *</label>
          <input
            type="number"
            value={event.start_depth ?? ""}
            onChange={(e) => set("start_depth", e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 2800"
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">End Depth (m)</label>
          <input
            type="number"
            value={event.end_depth ?? ""}
            onChange={(e) => set("end_depth", e.target.value ? Number(e.target.value) : null)}
            placeholder="optional"
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">NPT Hours</label>
          <input
            type="number"
            value={event.npt_hours ?? ""}
            onChange={(e) => set("npt_hours", e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 6.5"
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Row 4: Description + Cause */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Description</label>
          <textarea
            value={event.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Cause</label>
          <textarea
            value={event.cause ?? ""}
            onChange={(e) => set("cause", e.target.value)}
            rows={2}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Row 5: Mitigation + Lesson */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Mitigation</label>
          <textarea
            value={event.mitigation ?? ""}
            onChange={(e) => set("mitigation", e.target.value)}
            rows={2}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Lesson Learned</label>
          <textarea
            value={event.lesson_learned ?? ""}
            onChange={(e) => set("lesson_learned", e.target.value)}
            rows={2}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Review Modal (Split-Screen) ──────────────────────────────

function ReviewModal({
  docId,
  onClose,
}: {
  docId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [activePage, setActivePage] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editedContents, setEditedContents] = useState<Record<number, string>>({});
  const [events, setEvents] = useState<ExtractedEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: doc } = useQuery({
    queryKey: ["doc-detail", docId],
    queryFn: () => documentsService.getDetail(docId),
    staleTime: 30_000,
  });

  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ["doc-pages", docId],
    queryFn: () => documentsService.getPages(docId),
    staleTime: 30_000,
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["doc-events", docId],
    queryFn: () => documentsService.getExtractedEvents(docId),
    staleTime: 0,
  });

  const { data: catalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => documentsService.getBasinsFieldsWells(),
    staleTime: 300_000,
  });

  // Hydrate events from server + try to auto-match entity names to IDs
  useEffect(() => {
    if (!eventsData?.events || !catalog) return;
    const hydrated = eventsData.events.map((ev: ExtractedEvent) => {
      let basin_id = ev.basin_id ?? null;
      let field_id = ev.field_id ?? null;
      let well_id = ev.well_id ?? null;

      if (!well_id && ev.well_name) {
        const found = catalog.wells.find((w: { name: string }) =>
          w.name.toLowerCase().includes(ev.well_name!.toLowerCase().split("-")[0])
        );
        if (found) {
          well_id = found.id;
          const field = catalog.fields.find((f: { id: number }) => f.id === found.field_id);
          field_id = field?.id ?? null;
          basin_id = field?.basin_id ?? null;
        }
      }
      if (!field_id && ev.field_name) {
        const found = catalog.fields.find((f: { name: string }) =>
          f.name.toLowerCase().includes(ev.field_name!.toLowerCase())
        );
        if (found) { field_id = found.id; basin_id = found.basin_id; }
      }
      if (!basin_id && ev.basin_name) {
        const found = catalog.basins.find((b: { name: string }) =>
          b.name.toLowerCase().includes(ev.basin_name!.toLowerCase())
        );
        if (found) basin_id = found.id;
      }
      return { ...ev, basin_id, field_id, well_id };
    });
    setEvents(hydrated);
  }, [eventsData, catalog]);

  const activePageObj = pages?.[activePage];
  const currentContent = editedContents[activePageObj?.id] ?? activePageObj?.markdown_content ?? "";

  const addEvent = () => {
    setEvents((prev) => [...prev, {
      event_type: "", severity: "Low",
      start_depth: null, end_depth: null,
      description: null, cause: null, mitigation: null, lesson_learned: null,
      well_id: null, field_id: null, basin_id: null,
    }]);
  };

  const buildPayload = () => {
    const page_contents: Record<string, string> = {};
    Object.entries(editedContents).forEach(([id, content]) => {
      page_contents[id] = content;
    });
    return { events, page_contents };
  };

  const handleSaveDraft = async () => {
    setSaving(true); setSaveError(null);
    try {
      await documentsService.saveDraft(docId, buildPayload());
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["doc-stats"] });
      onClose();
    } catch (e: unknown) {
      setSaveError("Failed to save draft. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExtractEvents = async () => {
    setIsExtracting(true);
    setSaveError(null);
    try {
      const provider = localStorage.getItem("aiProvider") || "ollama";
      await documentsService.triggerEventExtraction(docId, provider);
      await qc.invalidateQueries({ queryKey: ["doc-events", docId] });
    } catch (e: unknown) {
      setSaveError("Failed to extract events automatically.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCommit = async () => {
    const missing = events.filter((ev) => !ev.event_type || !ev.well_id || ev.start_depth == null);
    if (missing.length > 0) {
      setSaveError(`${missing.length} event(s) are missing required fields: Event Type, Well ID, and Start Depth.`);
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      const res = await documentsService.commit(docId, buildPayload());
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["doc-stats"] });
      qc.invalidateQueries({ queryKey: ["historical-events"] });
      if (res.skipped?.length > 0) {
        setSaveError(`Committed ${res.committed_events} events. Skipped: ${res.skipped.join("; ")}`);
      } else {
        onClose();
      }
    } catch (e: unknown) {
      setSaveError("Commit failed. Please check required fields.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) return;
    try {
      await documentsService.delete(docId);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["doc-stats"] });
      onClose();
    } catch (e: unknown) {
      setSaveError("Failed to delete document.");
    }
  };

  const handleViewOriginal = async () => {
    try {
      const res = await documentsService.downloadFile(docId);
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (e: unknown) {
      setSaveError("Failed to open original document.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/80 z-50 flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-blue-600" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{doc?.file_name}</h2>
            <p className="text-xs text-gray-400">{doc?.document_type} · {pages?.length ?? "?"} pages · {events.length} events extracted</p>
          </div>
          <span className={cn("ml-2 text-xs px-2 py-0.5 rounded-full font-medium",
            doc?.processing_status === "Needs Approval" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
          )}>
            {doc?.processing_status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleViewOriginal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Eye size={14} /> View Original
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Split screen body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Content viewer */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-gray-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
            <div className="flex gap-1 overflow-x-auto">
              {(pages ?? []).map((p: { page_number: number; id: number }, idx: number) => (
                <button
                  key={p.id}
                  onClick={() => setActivePage(idx)}
                  className={cn(
                    "flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                    activePage === idx ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Pg {p.page_number}
                </button>
              ))}
            </div>
            <button
              onClick={() => setEditMode((v) => !v)}
              className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
                editMode ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {editMode ? <Eye size={12} /> : <Edit3 size={12} />}
              {editMode ? "Preview" : "Edit Markdown"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {pagesLoading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
              </div>
            ) : !activePageObj ? (
              <div className="text-center py-16 text-gray-400 text-sm">No content extracted yet.</div>
            ) : editMode ? (
              <textarea
                value={currentContent}
                onChange={(e) => setEditedContents((prev) => ({ ...prev, [activePageObj.id]: e.target.value }))}
                className="w-full h-full min-h-[600px] font-mono text-xs bg-gray-900 text-green-300 p-4 rounded-xl border-0 focus:outline-none resize-none"
                spellCheck={false}
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-3">
                        <table className="min-w-full border border-gray-200 divide-y divide-gray-200" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => <th className="px-3 py-2 bg-gray-100 text-left text-xs font-semibold border-r last:border-r-0" {...props} />,
                    td: ({ node, ...props }) => <td className="px-3 py-2 text-xs border-r last:border-r-0" {...props} />,
                    pre: ({ node, ...props }) => <pre className="overflow-x-auto bg-gray-900 text-gray-100 p-3 rounded-lg text-xs" {...props} />,
                  }}
                >
                  {currentContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Right: Event editor */}
        <div className="w-[480px] flex flex-col bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Extracted Events
              <span className="ml-2 text-xs font-normal text-gray-400">{events.length} found</span>
            </h3>
            <button
              onClick={addEvent}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={13} /> Add Event
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {eventsLoading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-xl" />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 px-4">
                <AlertCircle size={28} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">No events extracted yet</p>
                <p className="text-xs text-gray-500 mb-4">You can extract events using AI from the document content, or add them manually.</p>
                <div className="flex flex-col gap-2 w-full max-w-[200px] mx-auto">
                  <button
                    onClick={handleExtractEvents}
                    disabled={isExtracting}
                    className="flex items-center justify-center gap-1.5 w-full bg-blue-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isExtracting ? (
                      <><RefreshCcw size={14} className="animate-spin" /> Extracting...</>
                    ) : (
                      <><Wand2 size={14} /> Extract via AI</>
                    )}
                  </button>
                  <button
                    onClick={addEvent}
                    className="flex items-center justify-center gap-1.5 w-full bg-white border border-gray-200 text-gray-700 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={14} /> Add Manually
                  </button>
                </div>
              </div>
            ) : (
              events.map((ev, idx) => (
                <EventRow
                  key={idx}
                  event={ev}
                  catalog={catalog ?? { basins: [], fields: [], wells: [] }}
                  onChange={(updated) => setEvents((prev) => prev.map((e, i) => i === idx ? updated : e))}
                  onDelete={() => setEvents((prev) => prev.filter((_, i) => i !== idx))}
                />
              ))
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 flex-shrink-0">
            {saveError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {saveError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                Save as Draft
              </button>
              <button
                onClick={handleCommit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Commit to DB
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Draft = saved for review only · Commit = live in AI + Historical Events
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export function DocumentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedType, setSelectedType] = useState("Daily Drilling Report");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Processing modal state
  const [processingDoc, setProcessingDoc] = useState<{ id: number; name: string } | null>(null);

  // Review modal state
  const [reviewDocId, setReviewDocId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: typesData } = useQuery({
    queryKey: ["doc-types"],
    queryFn: documentsService.getTypes,
    staleTime: 300_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["doc-stats"],
    queryFn: documentsService.stats,
    staleTime: 30_000,
    refetchInterval: 8_000,
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", statusFilter, typeFilter],
    queryFn: () => documentsService.list({ status: statusFilter || undefined, document_type: typeFilter || undefined }),
    staleTime: 8_000,
    refetchInterval: 6_000,
  });

  const docTypes = typesData?.document_types ?? [];

  const doUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const provider = localStorage.getItem("aiProvider") || "ollama";
      const res = await documentsService.upload(file, selectedType, undefined, provider);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["doc-stats"] });
      setProcessingDoc({ id: res.id, name: res.file_name });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: { message?: string } | string } } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: { message?: string } | string } } })?.response?.data?.detail;
      if (status === 409 && typeof detail === "object") {
        setUploadError(`Duplicate: ${(detail as { message?: string }).message}`);
      } else if (typeof detail === "string") {
        setUploadError(detail);
      } else {
        setUploadError("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDocClick = (doc: DocRow) => {
    if (doc.processing_status === "Needs Approval" || doc.processing_status === "Completed") {
      setReviewDocId(doc.id);
    }
    // processing docs: don't open modal
  };

  return (
    <div className="p-6 max-w-[1400px] space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={20} className="text-blue-600" />
          Document Manager
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload drilling reports — extracted content and incidents are reviewed before committing to the knowledge base.
        </p>
      </div>

      {/* Top Section: Upload & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        
        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 h-full">
          {[
            { label: "Total Documents", value: stats?.total ?? 0, color: "#2563eb" },
            { label: "Uploaded", value: stats?.by_status?.Uploaded ?? 0, color: "#3b82f6" },
            { label: "Processing", value: (stats?.by_status?.Processing ?? 0) + (stats?.by_status?.Extracting ?? 0), color: "#7c3aed" },
            { label: "Needs Approval", value: stats?.by_status?.["Needs Approval"] ?? 0, color: "#d97706" },
            { label: "Completed", value: stats?.by_status?.Completed ?? 0, color: "#059669" },
            { label: "Failed", value: stats?.by_status?.Failed ?? 0, color: "#dc2626" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 h-full min-h-[80px]">
              <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-semibold text-gray-900 tabular-nums">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Upload zone */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col h-full">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload size={15} className="text-blue-600" />
            Upload Document
          </h2>

          <label className="block text-xs text-gray-500 mb-1">Document Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 mb-4"
          >
            {(docTypes.length > 0 ? docTypes : [
              "Daily Drilling Report",
              "Drilling Summary Report",
              "Well Completion Report",
              "Geological Report",
              "Formation Report",
              "Reservoir Report",
              "Mud Logging Report",
              "Incident Report",
              "Lessons Learned Report",
              "Cementing Report",
              "Casing Report"
            ]).map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>

          <div
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) doUpload(f); }}
            className={cn(
              "flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[140px]",
              dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ""; }}
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.tiff" />
            {uploading ? (
              <>
                <Loader2 size={28} className="text-blue-600 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-blue-600">Uploading…</p>
              </>
            ) : (
              <>
                <Upload size={28} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Drop file or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX, Images</p>
              </>
            )}
          </div>

          {uploadError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{uploadError}</p>
            </div>
          )}
        </div>
      </div>

        {/* Document list */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
            <Filter size={13} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-gray-700"
            >
              <option value="">All Status</option>
              {Object.keys(STATUS_CONFIG).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-gray-700 max-w-48"
            >
              <option value="">All Types</option>
              {["Daily Drilling Report (DDR)", "Well Completion Report (WCR)", "Other"].map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="ml-auto text-xs text-gray-400">{(documents ?? []).length} documents</span>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (documents ?? []).length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No documents yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload a drilling report to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {(documents ?? []).map((doc: DocRow) => {
                const sc = STATUS_CONFIG[doc.processing_status] || STATUS_CONFIG.Uploaded;
                const Icon = sc.icon;
                const isClickable = doc.processing_status === "Needs Approval" || doc.processing_status === "Completed";
                const sizeKB = Math.round((doc.file_size || 0) / 1024);
                const date = new Date(doc.upload_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

                return (
                  <div
                    key={doc.id}
                    onClick={() => isClickable && handleDocClick(doc)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 transition-colors",
                      isClickable ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", sc.bg)}>
                      <Icon size={15} className={cn(sc.color, PROCESSING_STATUSES.has(doc.processing_status) ? "animate-spin" : "")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {doc.document_type}
                        {doc.well_name ? ` · ${doc.well_name}` : ""}
                        {" · "}{sizeKB}KB{doc.page_count ? ` · ${doc.page_count}p` : ""}
                        {" · "}{date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn("text-xs font-medium", sc.color)}>{doc.processing_status}</span>
                      {isClickable ? (
                        <ChevronDown size={13} className="text-gray-300 -rotate-90" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
                              documentsService.delete(doc.id).then(() => {
                                qc.invalidateQueries({ queryKey: ["documents"] });
                                qc.invalidateQueries({ queryKey: ["doc-stats"] });
                              });
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                          title="Delete Document"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* Processing Modal (full screen) */}
      {processingDoc && (
        <ProcessingModal
          docId={processingDoc.id}
          fileName={processingDoc.name}
          onCancel={() => {
            setProcessingDoc(null);
            qc.invalidateQueries({ queryKey: ["documents"] });
            qc.invalidateQueries({ queryKey: ["doc-stats"] });
          }}
          onReady={() => {
            setProcessingDoc(null);
            qc.invalidateQueries({ queryKey: ["documents"] });
            setReviewDocId(processingDoc.id);
          }}
        />
      )}

      {/* Review Modal (split-screen) */}
      {reviewDocId && (
        <ReviewModal
          docId={reviewDocId}
          onClose={() => {
            setReviewDocId(null);
            qc.invalidateQueries({ queryKey: ["documents"] });
            qc.invalidateQueries({ queryKey: ["doc-stats"] });
          }}
        />
      )}
    </div>
  );
}
